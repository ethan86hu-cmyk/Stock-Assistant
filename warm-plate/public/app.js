const $ = (id) => document.getElementById(id);
const MAX_IMAGE_SIDE = 1280;
const STORAGE_KEYS = { constitution: "warm-plate:constitution", lang: "warm-plate:lang" };

const STRINGS = {
  en: {
    title: "Warm Plate",
    tagline: "Snap your meal. See if it's warming or cooling, the way a Chinese grandma would.",
    demo: "Demo mode: no API key is configured, so every photo returns the same sample result. Add a key to .env (see .env.example) to analyze real photos.",
    bodyQuestion: "How does your body usually feel?",
    upload: "Take or choose a photo of your meal",
    looking: "Looking at your plate…",
    scaleCold: "Cold",
    scaleNeutral: "Neutral",
    scaleHot: "Hot",
    legendMeal: "This meal",
    legendIdeal: "Your ideal today",
    plateHeading: "What's on your plate",
    disclaimer: "Warm Plate shares traditional Chinese food-therapy ideas for everyday eating. It is not medical advice and does not diagnose or treat any condition.",
    plateNature: (label) => `This meal is ${label.toLowerCase()}`,
    served: (temp) => `served ${temp}`,
    naturally: (label) => `naturally ${label.toLowerCase()}`,
    estimated: "estimated",
    notImage: "That file doesn't look like an image.",
    unreachable: "Could not reach the server.",
    photoAlt: "Your meal",
    cooking: {
      raw: "raw", iced: "iced", steamed: "steamed", boiled: "boiled", braised_stewed: "braised or stewed",
      stir_fried: "stir-fried", baked: "baked", grilled_roasted: "grilled or roasted", deep_fried: "deep-fried",
    },
    temperature: { iced: "iced", cold: "cold", room: "at room temperature", warm: "warm", hot: "hot" },
    errors: {},
  },
  zh: {
    title: "Warm Plate",
    tagline: "拍一张饭菜照片，像中国奶奶一样看看这顿饭是偏寒还是偏热。",
    demo: "演示模式：还没有配置 API 密钥，任何照片都会返回同一份示例结果。在 .env 里填上密钥（参考 .env.example）即可识别真实照片。",
    bodyQuestion: "你平时的身体感觉更接近哪种？",
    upload: "拍照或选择一张饭菜照片",
    looking: "正在看你的饭菜…",
    scaleCold: "寒",
    scaleNeutral: "平",
    scaleHot: "热",
    legendMeal: "这顿饭",
    legendIdeal: "你今天的理想值",
    plateHeading: "盘子里有什么",
    disclaimer: "暖盘分享的是日常饮食中的传统中医食疗观念，不是医疗建议，不能用于诊断或治疗任何疾病。",
    plateNature: (label, zh) => `这顿饭整体偏${zh === "平" ? "平和" : zh}`,
    served: (temp) => temp,
    naturally: (label, zh) => `本性${zh}`,
    estimated: "估计值",
    notImage: "这个文件看起来不是图片。",
    unreachable: "连不上服务器。",
    photoAlt: "你的饭菜",
    cooking: {
      raw: "生食", iced: "冰镇", steamed: "蒸", boiled: "水煮", braised_stewed: "炖煮",
      stir_fried: "炒", baked: "烤箱烤", grilled_roasted: "烧烤", deep_fried: "油炸",
    },
    temperature: { iced: "冰饮", cold: "冷饮", room: "常温", warm: "温热", hot: "热饮" },
    errors: {
      no_food: "这张照片里没找到食物，换一张清楚点的饭菜照片试试。",
      too_large: "图片太大了，请控制在 8 MB 以内。",
      bad_image: "请上传 JPEG、PNG、WebP 或 GIF 格式的图片。",
      bad_request: "请求格式有误，请刷新页面重试。",
      timeout: "识别服务响应太慢，请再试一次。",
      unreachable: "连不上识别服务，请检查网络或接口地址。",
      cut_off: "识别结果被截断了，换一张简单点的照片试试。",
      bad_result: "识别服务返回的结果无法读取，请再试一次。",
      invalid_key: "服务器的 API 密钥无效，请检查 .env 配置。",
      no_credit: "API 账户余额不足，请先充值。",
      rate_limited: "请求太频繁了，请过一分钟再试。",
      rejected: "识别服务拒绝了这个请求，请确认 AI_MODEL 支持图片输入（详细原因见服务器终端）。",
      refused: "这张照片无法分析。",
      service_error: "识别服务出错了，请稍后再试。",
      server_error: "出了点问题，请再试一次。",
    },
  },
};

let config;
let lang = initialLanguage();
let constitution = readStored(STORAGE_KEYS.constitution) || "balanced";
let lastItems = null; // the last recognized foods, so re-scoring doesn't re-run the model
const t = () => STRINGS[lang];

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the choice just won't persist.
  }
}

function initialLanguage() {
  const saved = readStored(STORAGE_KEYS.lang);
  if (saved === "en" || saved === "zh") return saved;
  return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

async function loadConfig() {
  config = await fetch("/api/config").then((r) => r.json());
  $("demo-banner").hidden = !config.demo;
  $("term-card").hidden = false;

  const group = $("constitutions");
  for (const key of Object.keys(config.constitutions)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("role", "radio");
    chip.dataset.key = key;
    chip.append(document.createElement("strong"), document.createElement("small"));
    chip.addEventListener("click", () => selectConstitution(key));
    group.append(chip);
  }
  if (!(constitution in config.constitutions)) constitution = "balanced";
  applyLanguage();
}

// Fills every piece of static text for the current language.
function applyLanguage() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t()[el.dataset.i18n];
  }
  for (const button of document.querySelectorAll(".lang-toggle button")) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  }
  $("preview").alt = t().photoAlt;

  if (config) {
    const term = config.solar_term;
    $("term-zh").textContent = term.zh;
    $("term-en").textContent = lang === "zh" ? "" : term.en;
    $("term-tip").textContent = lang === "zh" ? term.tip_zh : term.tip;
    for (const chip of $("constitutions").children) {
      const profile = config.constitutions[chip.dataset.key];
      chip.querySelector("strong").textContent = profile.label[lang];
      chip.querySelector("small").textContent = profile.hint[lang];
      chip.setAttribute("aria-checked", String(chip.dataset.key === constitution));
    }
  }
}

function selectLanguage(next) {
  if (next === lang) return;
  lang = next;
  store(STORAGE_KEYS.lang, lang);
  applyLanguage();
  rescore();
}

function selectConstitution(key) {
  constitution = key;
  store(STORAGE_KEYS.constitution, key);
  applyLanguage();
  rescore();
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
      reject(new Error(t().notImage));
    };
    img.src = url;
  });
}

function setStatus(text, isError = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", isError);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(t().errors[data.code] ?? data.error ?? t().errors.server_error);
  }
  return data;
}

async function analyze(file) {
  $("result").hidden = true;
  lastItems = null;
  setStatus(t().looking);
  try {
    const image = await resizeImage(file);
    $("preview").src = image;
    $("preview").hidden = false;
    const data = await postJson("/api/analyze", { image, constitution, lang });
    lastItems = data.recognized;
    render(data);
    setStatus("");
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message, true);
  }
}

// Re-scores the last photo for a new language or body type, without the model.
async function rescore() {
  if (!lastItems) return;
  try {
    render(await postJson("/api/score", { items: lastItems, constitution, lang }));
  } catch (error) {
    setStatus(error.message, true);
  }
}

// Maps a warmth value in [-2, 2] to a gauge position in percent.
const toPercent = (value) => ((Math.max(-2, Math.min(2, value)) + 2) / 4) * 100;

const NATURE_COLORS = { Cold: "#3b7bbf", Cool: "#6a9fcf", Neutral: "#a8977c", Warm: "#d97a4a", Hot: "#c8412b" };

function render(data) {
  const strings = t();
  $("score").textContent = data.score > 0 ? `+${data.score}` : String(data.score);
  $("score").style.color = NATURE_COLORS[data.plate_nature.en];
  $("plate-nature").textContent =
    lang === "zh"
      ? strings.plateNature(data.plate_nature.en, data.plate_nature.zh)
      : `${strings.plateNature(data.plate_nature.en)} (${data.plate_nature.zh})`;
  $("headline").textContent = data.advice.headline;
  $("plate-marker").style.left = `${toPercent(data.score / 50)}%`;
  $("target-marker").style.left = `${toPercent(data.target)}%`;
  $("target-reason").textContent = data.target_reason;

  $("grandma").textContent = `“${data.advice.grandma}”`;
  $("suggestions").replaceChildren(
    ...data.advice.suggestions.map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      return li;
    }),
  );

  $("items").replaceChildren(...data.items.map(renderItem));
  $("result").hidden = false;
}

function renderItem(item) {
  const strings = t();
  const li = document.createElement("li");
  const info = document.createElement("div");
  const name = document.createElement("div");
  if (lang === "zh") {
    name.textContent = item.name_zh ? `${item.name_zh} · ${item.name}` : item.name;
  } else {
    name.textContent = item.name_zh ? `${item.name} · ${item.name_zh}` : item.name;
  }

  const details = [];
  if (item.drink_temperature !== "not_a_drink") {
    details.push(strings.served(strings.temperature[item.drink_temperature]));
  } else if (item.cooking !== "none") {
    details.push(strings.cooking[item.cooking]);
  }
  if (item.base_nature && item.base_nature.en !== item.effective_label.en) {
    details.push(strings.naturally(item.base_nature.en, item.base_nature.zh));
  }
  if (item.source !== "table") details.push(strings.estimated);
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = details.join(" · ");
  info.append(name, meta);

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = lang === "zh" ? item.effective_label.zh : `${item.effective_label.en} ${item.effective_label.zh}`;
  badge.style.background = NATURE_COLORS[item.effective_label.en];

  li.append(info, badge);
  return li;
}

for (const button of document.querySelectorAll(".lang-toggle button")) {
  button.addEventListener("click", () => selectLanguage(button.dataset.lang));
}

$("photo").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) analyze(file);
  event.target.value = "";
});

applyLanguage();
loadConfig().catch(() => setStatus(t().unreachable, true));
