const DEFAULT_ENGINES = [
  { id: "google", name: "Google", alias: "@google", url: "https://www.google.com/search?q=%s" },
  { id: "github", name: "GitHub", alias: "@github", url: "https://github.com/search?q=%s&type=repositories" },
  { id: "scholar", name: "Google Scholar", alias: "@paper", url: "https://scholar.google.com/scholar?q=%s" }
];

const editorList = document.getElementById("editorList");
const addEngineBtn = document.getElementById("addEngine");
const saveBtn = document.getElementById("saveBtn");
const status = document.getElementById("status");

let engines = [];
let activeEngineId = null;

function makeId() {
  return `engine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAlias(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/^@+/, "");
  const safe = raw.replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
  return safe ? `@${safe}` : "";
}

function suggestedAlias(name, index) {
  const safe = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  return `@${safe || `search${index + 1}`}`;
}

async function loadState() {
  const data = await chrome.storage.sync.get(["engines", "activeEngineId"]);
  const source = Array.isArray(data.engines) && data.engines.length ? data.engines : DEFAULT_ENGINES;

  engines = source.map((engine, index) => ({
    id: engine.id || makeId(),
    name: engine.name || `Công cụ ${index + 1}`,
    alias: normalizeAlias(engine.alias) || suggestedAlias(engine.name, index),
    url: engine.url || "https://www.google.com/search?q=%s"
  }));

  activeEngineId = data.activeEngineId && engines.some(e => e.id === data.activeEngineId)
    ? data.activeEngineId
    : engines[0].id;
  render();
}

function createField(labelText, value, placeholder, onInput) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = placeholder || "";
  input.addEventListener("input", event => onInput(event.target.value));

  wrapper.append(label, input);
  return wrapper;
}

function render() {
  editorList.innerHTML = "";

  engines.forEach((engine, index) => {
    const card = document.createElement("section");
    card.className = "card" + (engine.id === activeEngineId ? " active" : "");

    const head = document.createElement("div");
    head.className = "card-head";

    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "choose-btn";
    choose.title = "Chọn làm công cụ mặc định";
    choose.innerHTML = `<span class="radio-dot"></span><span>Ô ${index + 1}${engine.id === activeEngineId ? " · đang chọn" : ""}</span>`;
    choose.addEventListener("click", () => {
      activeEngineId = engine.id;
      render();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Xóa";
    deleteBtn.disabled = engines.length === 1;
    deleteBtn.addEventListener("click", () => {
      const wasActive = engine.id === activeEngineId;
      engines.splice(index, 1);
      if (wasActive) activeEngineId = engines[0]?.id || null;
      render();
    });

    head.append(choose, deleteBtn);

    const fields = document.createElement("div");
    fields.className = "fields";

    fields.append(
      createField("Tên", engine.name, "Ví dụ: NoAISearch", value => { engine.name = value; }),
      createField("Lối tắt", engine.alias, "Ví dụ: @noai", value => { engine.alias = value; }),
      createField("URL có %s thay thế truy vấn", engine.url, "https://www.google.com/search?q=%s", value => { engine.url = value; })
    );

    card.append(head, fields);
    editorList.appendChild(card);
  });
}

addEngineBtn.addEventListener("click", () => {
  const index = engines.length;
  const newEngine = {
    id: makeId(),
    name: `Công cụ ${index + 1}`,
    alias: `@search${index + 1}`,
    url: "https://www.google.com/search?q=%s"
  };
  engines.push(newEngine);
  activeEngineId = newEngine.id;
  render();

  requestAnimationFrame(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
});

saveBtn.addEventListener("click", async () => {
  status.className = "";
  status.textContent = "";

  const normalized = engines.map((engine, index) => ({
    id: engine.id,
    name: engine.name.trim(),
    alias: normalizeAlias(engine.alias) || suggestedAlias(engine.name, index),
    url: engine.url.trim()
  }));

  if (normalized.some(e => !e.name)) {
    status.className = "error";
    status.textContent = "Tên công cụ không được để trống.";
    return;
  }

  const invalidUrl = normalized.find(e => !e.url.includes("%s"));
  if (invalidUrl) {
    status.className = "error";
    status.textContent = `URL của “${invalidUrl.name}” phải chứa %s.`;
    return;
  }

  try {
    normalized.forEach(e => new URL(e.url.replace(/%s/g, "test")));
  } catch {
    status.className = "error";
    status.textContent = "Có URL không hợp lệ.";
    return;
  }

  const aliases = normalized.map(e => e.alias.toLowerCase());
  const duplicateAlias = aliases.find((alias, index) => aliases.indexOf(alias) !== index);
  if (duplicateAlias) {
    status.className = "error";
    status.textContent = `Lối tắt ${duplicateAlias} đang bị trùng.`;
    return;
  }

  if (!normalized.some(e => e.id === activeEngineId)) {
    activeEngineId = normalized[0]?.id || null;
  }

  await chrome.storage.sync.set({ engines: normalized, activeEngineId });
  engines = normalized;
  status.className = "success";
  status.textContent = "Đã lưu.";
  render();

  setTimeout(() => { status.textContent = ""; }, 1600);
});

loadState();
