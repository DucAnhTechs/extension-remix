const engineList = document.getElementById("engineList");
const searchForm = document.getElementById("searchForm");
const queryInput = document.getElementById("query");
const openOptions = document.getElementById("openOptions");
const activeHint = document.getElementById("activeHint");

let engines = [];
let activeEngineId = null;

function resolveSearch(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const [first, ...rest] = trimmed.split(/\s+/);
  const byAlias = engines.find(e => e.alias?.toLowerCase() === first.toLowerCase());

  if (byAlias && rest.length) {
    return { engine: byAlias, query: rest.join(" ") };
  }

  const active = engines.find(e => e.id === activeEngineId) || engines[0];
  return { engine: active, query: trimmed };
}

async function loadState() {
  const data = await chrome.storage.sync.get(["engines", "activeEngineId"]);
  engines = Array.isArray(data.engines) ? data.engines : [];
  activeEngineId = data.activeEngineId || engines[0]?.id || null;
  renderEngines();
}

function renderEngines() {
  engineList.innerHTML = "";

  for (const engine of engines) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "engine-card" + (engine.id === activeEngineId ? " active" : "");

    const dot = document.createElement("span");
    dot.className = "select-dot";

    const body = document.createElement("span");
    body.className = "engine-body";

    const top = document.createElement("span");
    top.className = "engine-top";

    const name = document.createElement("span");
    name.className = "engine-name";
    name.textContent = engine.name;

    const alias = document.createElement("span");
    alias.className = "engine-alias";
    alias.textContent = engine.alias || "";

    const url = document.createElement("span");
    url.className = "engine-url";
    url.textContent = engine.url;

    top.append(name, alias);
    body.append(top, url);
    button.append(dot, body);

    button.addEventListener("click", async () => {
      activeEngineId = engine.id;
      await chrome.storage.sync.set({ activeEngineId });
      renderEngines();
      queryInput.focus();
    });

    engineList.appendChild(button);
  }

  const active = engines.find(e => e.id === activeEngineId) || engines[0];
  activeHint.textContent = active
    ? `Đang chọn: ${active.name} (${active.alias || "không có alias"})`
    : "Chưa có công cụ tìm kiếm.";
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const resolved = resolveSearch(queryInput.value);
  if (!resolved?.engine || !resolved.query) return;

  if (!resolved.engine.url.includes("%s")) {
    alert("URL của công cụ này chưa có %s.");
    return;
  }

  const targetUrl = resolved.engine.url.replace(/%s/g, encodeURIComponent(resolved.query));
  await chrome.tabs.create({ url: targetUrl });
  window.close();
});

openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && (changes.engines || changes.activeEngineId)) {
    loadState();
  }
});

loadState();
