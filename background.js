const DEFAULT_ENGINES = [
  {
    id: "google",
    name: "Google",
    alias: "@google",
    url: "https://www.google.com/search?q=%s"
  },
  {
    id: "github",
    name: "GitHub",
    alias: "@github",
    url: "https://github.com/search?q=%s&type=repositories"
  },
  {
    id: "scholar",
    name: "Google Scholar",
    alias: "@paper",
    url: "https://scholar.google.com/scholar?q=%s"
  }
];

const ROUTER_RULE_ID = 1;
const ROUTER_REGEX = "^https://multi-search\\.invalid/search\\?q=([^&#]*)";

function normalizeAlias(value, fallback = "@search") {
  const raw = String(value || "").trim().toLowerCase();
  const withoutAt = raw.replace(/^@+/, "").replace(/\s+/g, "-");
  const safe = withoutAt.replace(/[^a-z0-9_-]/g, "");
  return `@${safe || fallback.replace(/^@/, "")}`;
}

function migrateEngines(engines) {
  const used = new Set();
  return engines.map((engine, index) => {
    let alias = normalizeAlias(
      engine.alias ||
      (engine.id === "google" ? "@google" : engine.id === "github" ? "@github" : engine.id === "scholar" ? "@paper" : `@search${index + 1}`)
    );

    const base = alias;
    let suffix = 2;
    while (used.has(alias)) {
      alias = `${base}${suffix++}`;
    }
    used.add(alias);

    return {
      id: engine.id || `engine_${Date.now()}_${index}`,
      name: engine.name || `Công cụ ${index + 1}`,
      alias,
      url: engine.url || "https://www.google.com/search?q=%s"
    };
  });
}

async function ensureDefaults() {
  const data = await chrome.storage.sync.get(["engines", "activeEngineId"]);

  if (!Array.isArray(data.engines) || data.engines.length === 0) {
    await chrome.storage.sync.set({
      engines: DEFAULT_ENGINES,
      activeEngineId: DEFAULT_ENGINES[0].id
    });
    return { engines: DEFAULT_ENGINES, activeEngineId: DEFAULT_ENGINES[0].id };
  }

  const migrated = migrateEngines(data.engines);
  const changed = JSON.stringify(migrated) !== JSON.stringify(data.engines);
  const activeExists = migrated.some(e => e.id === data.activeEngineId);
  const activeEngineId = activeExists ? data.activeEngineId : migrated[0].id;

  if (changed || !activeExists) {
    await chrome.storage.sync.set({ engines: migrated, activeEngineId });
  }

  return { engines: migrated, activeEngineId };
}

function escapeRegexSubstitutionLiteral(text) {
  // In DNR regexSubstitution, backslash followed by a digit is a capture reference.
  // Valid http(s) URLs should not normally contain raw backslashes, but escaping them
  // avoids accidentally creating another capture token.
  return String(text).replace(/\\/g, "\\\\");
}

function buildRedirectSubstitution(urlTemplate) {
  const safeTemplate = escapeRegexSubstitutionLiteral(urlTemplate);
  return safeTemplate.replace(/%s/g, "\\1");
}

async function applyActiveSearchRule() {
  const { engines, activeEngineId } = await ensureDefaults();
  const active = engines.find(e => e.id === activeEngineId) || engines[0];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ROUTER_RULE_ID]
  });

  if (!active || !active.url || !active.url.includes("%s")) return;

  let parsed;
  try {
    parsed = new URL(active.url.replace(/%s/g, "test"));
  } catch {
    return;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: ROUTER_RULE_ID,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            regexSubstitution: buildRedirectSubstitution(active.url)
          }
        },
        condition: {
          regexFilter: ROUTER_REGEX,
          resourceTypes: ["main_frame"]
        }
      }
    ]
  });
}

function resolveSearch(text, engines, activeEngineId) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const [first, ...rest] = trimmed.split(/\s+/);
  const aliasEngine = engines.find(e => e.alias?.toLowerCase() === first.toLowerCase());

  if (aliasEngine && rest.length) {
    return { engine: aliasEngine, query: rest.join(" ") };
  }

  const active = engines.find(e => e.id === activeEngineId) || engines[0];
  return { engine: active, query: trimmed };
}

chrome.runtime.onInstalled.addListener(() => {
  applyActiveSearchRule().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  applyActiveSearchRule().catch(console.error);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && (changes.engines || changes.activeEngineId)) {
    applyActiveSearchRule().catch(console.error);
  }
});

// Extra mode: type "ms" + Space in the address bar, then optionally @alias.
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const { engines, activeEngineId } = await ensureDefaults();
  const active = engines.find(e => e.id === activeEngineId) || engines[0];

  chrome.omnibox.setDefaultSuggestion({
    description: `Tìm bằng ${active?.name || "Multi Search"}. Có thể gõ @alias trước truy vấn.`
  });

  const clean = text.trim();
  if (!clean) return suggest([]);

  const suggestions = engines.slice(0, 5).map(engine => ({
    content: `${engine.alias} ${clean}`,
    description: `${engine.alias} — ${engine.name}: ${clean}`
  }));
  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const { engines, activeEngineId } = await ensureDefaults();
  const resolved = resolveSearch(text, engines, activeEngineId);

  if (!resolved?.engine?.url?.includes("%s") || !resolved.query) return;

  const targetUrl = resolved.engine.url.replace(/%s/g, encodeURIComponent(resolved.query));
  chrome.tabs.update({ url: targetUrl });
});

applyActiveSearchRule().catch(console.error);
