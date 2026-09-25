const $ = (id) => document.getElementById(id);
const MAX_IMAGE_SIDE = 1280;
const STORAGE_KEY = "warm-plate:constitution";

let constitution = readStoredConstitution();

function readStoredConstitution() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "balanced";
  } catch {
    return "balanced";
  }
}

function storeConstitution(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private mode); the choice just won't persist.
  }
}

async function loadConfig() {
  const config = await fetch("/api/config").then((r) => r.json());
  $("demo-banner").hidden = !config.demo;

  $("term-zh").textContent = config.solar_term.zh;
  $("term-en").textContent = config.solar_term.en;
  $("term-tip").textContent = config.solar_term.tip;
  $("term-card").hidden = false;

  const group = $("constitutions");
  for (const [key, profile] of Object.entries(config.constitutions)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("role", "radio");
    chip.dataset.key = key;
    chip.innerHTML = `<strong></strong><small></small>`;
    chip.querySelector("strong").textContent = profile.label;
    chip.querySelector("small").textContent = profile.hint;
    chip.addEventListener("click", () => selectConstitution(key));
    group.append(chip);
  }
  selectConstitution(constitution in config.constitutions ? constitution : "balanced");
}

function selectConstitution(key) {
  constitution = key;
  storeConstitution(key);
  for (const chip of $("constitutions").children) {
    chip.setAttribute("aria-checked", String(chip.dataset.key === key));
  }
}

// Downscale on the device so uploads stay small and fast.
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file doesn't look like an image."));
    };
    img.src = url;
  });
}

function setStatus(text, isError = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", isError);
}

async function analyze(file) {
  $("result").hidden = true;
  setStatus("Looking at your plate…");
  try {
    const image = await resizeImage(file);
    $("preview").src = image;
    $("preview").hidden = false;

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, constitution }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    render(data);
    setStatus("");
  } catch (error) {
    setStatus(error.message, true);
  }
}

// Maps a warmth value in [-2, 2] to a gauge position in percent.
const toPercent = (value) => ((Math.max(-2, Math.min(2, value)) + 2) / 4) * 100;

const NATURE_COLORS = { Cold: "#3b7bbf", Cool: "#6a9fcf", Neutral: "#a8977c", Warm: "#d97a4a", Hot: "#c8412b" };

function render(data) {
  $("score").textContent = data.score > 0 ? `+${data.score}` : String(data.score);
  $("score").style.color = NATURE_COLORS[data.plate_nature.en];
  $("plate-nature").textContent = `This meal is ${data.plate_nature.en.toLowerCase()} (${data.plate_nature.zh})`;
  $("headline").textContent = data.advice.headline;
  $("plate-marker").style.left = `${toPercent(data.score / 50)}%`;
  $("target-marker").style.left = `${toPercent(data.target)}%`;

  $("grandma").textContent = `“${data.advice.grandma}”`;
  const suggestions = $("suggestions");
  suggestions.replaceChildren(
    ...data.advice.suggestions.map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      return li;
    }),
  );

  $("items").replaceChildren(...data.items.map(renderItem));
  $("result").hidden = false;
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderItem(item) {
  const li = document.createElement("li");
  const info = document.createElement("div");
  const name = document.createElement("div");
  name.textContent = item.name_zh ? `${item.name} · ${item.name_zh}` : item.name;
  const meta = document.createElement("div");
  meta.className = "meta";
  const details = [];
  if (item.drink_temperature !== "not_a_drink") details.push(`served ${item.drink_temperature}`);
  else if (item.cooking !== "none") details.push(item.cooking.replaceAll("_", " "));
  if (item.base_nature && item.base_nature.en !== item.effective_label.en) {
    details.push(`naturally ${item.base_nature.en.toLowerCase()}`);
  }
  if (item.source !== "table") details.push("estimated");
  meta.textContent = details.join(" · ");
  info.append(name, meta);

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = `${item.effective_label.en} ${item.effective_label.zh}`;
  badge.style.background = NATURE_COLORS[item.effective_label.en];

  li.append(info, badge);
  return li;
}

$("photo").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) analyze(file);
  event.target.value = "";
});

loadConfig().catch(() => setStatus("Could not reach the server.", true));
