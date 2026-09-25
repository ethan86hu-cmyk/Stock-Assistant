import { FOOD_KEYS } from "./foods.mjs";

// Shared pieces for every recognition provider: the instructions, the output
// shape, validation of what comes back, and provider selection.

export const COOKING = [
  "raw", "iced", "steamed", "boiled", "braised_stewed",
  "stir_fried", "baked", "grilled_roasted", "deep_fried", "none",
];
export const DRINK_TEMPERATURES = ["iced", "cold", "room", "warm", "hot", "not_a_drink"];
export const PORTIONS = ["small", "medium", "large"];
export const NATURES = ["cold", "cool", "neutral", "warm", "hot"];
const MAX_ITEMS = 8;

export const SCHEMA = {
  type: "object",
  properties: {
    is_food: {
      type: "boolean",
      description: "False if the photo does not show food or drink.",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name_en: { type: "string" },
          name_zh: { type: "string" },
          food_key: { type: "string", enum: [...FOOD_KEYS, "other"] },
          estimated_nature: { type: "string", enum: NATURES },
          cooking: { type: "string", enum: COOKING },
          drink_temperature: { type: "string", enum: DRINK_TEMPERATURES },
          portion: { type: "string", enum: PORTIONS },
        },
        required: [
          "name_en", "name_zh", "food_key", "estimated_nature",
          "cooking", "drink_temperature", "portion",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["is_food", "items"],
  additionalProperties: false,
};

export const SYSTEM_PROMPT = `You identify the foods and drinks in a meal photo for a Chinese food therapy app.

Break composite dishes into their main ingredients (a Caesar salad becomes lettuce, grilled chicken, cheese and bread croutons; sushi becomes rice and raw fish). List at most ${MAX_ITEMS} items, the ones that make up most of the meal; skip garnishes.

For each item:
- food_key: the closest key from the allowed list, or "other" if nothing fits.
- estimated_nature: the item's nature in Chinese food therapy (cold, cool, neutral, warm or hot). It is only used when food_key is "other", but always fill it in.
- cooking: how it looks to be prepared. Use "iced" for iced drinks and frozen desserts, "none" for drinks and things that are not cooked or raw (bread, cheese).
- drink_temperature: for drinks, judge from ice, condensation and steam; "not_a_drink" for food.
- portion: relative to a typical single serving.

If the photo does not show food or drink, set is_food to false and return an empty items list.`;

// Providers without schema-enforced output get the allowed values spelled out.
export const JSON_INSTRUCTIONS = `Reply with a single JSON object and nothing else, in this shape:
{"is_food": true, "items": [{"name_en": "...", "name_zh": "...", "food_key": "...", "estimated_nature": "...", "cooking": "...", "drink_temperature": "...", "portion": "..."}]}

Allowed values:
- food_key: ${[...FOOD_KEYS, "other"].join(", ")}
- estimated_nature: ${NATURES.join(", ")}
- cooking: ${COOKING.join(", ")}
- drink_temperature: ${DRINK_TEMPERATURES.join(", ")}
- portion: ${PORTIONS.join(", ")}`;

export const USER_PROMPT = "What is in this meal?";

export class RecognitionError extends Error {
  // `code` lets the page show the error in the user's language.
  constructor(message, status = 502, code = "service_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const text = (value) => (typeof value === "string" ? value.trim().slice(0, 80) : "");

// Coerces a model's reply into the shape scoring expects. Providers that
// don't enforce the schema can return unknown keys or values; those fall
// back to safe defaults instead of failing the whole request.
export function normalizeRecognition(raw) {
  if (!raw || typeof raw !== "object") {
    throw new RecognitionError("Recognition returned an unreadable result.", 502, "bad_result");
  }
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .filter((item) => item && typeof item === "object" && text(item.name_en))
    .slice(0, MAX_ITEMS)
    .map((item) => ({
      name_en: text(item.name_en),
      name_zh: text(item.name_zh),
      food_key: pick(item.food_key, FOOD_KEYS, "other"),
      estimated_nature: pick(item.estimated_nature, NATURES, "neutral"),
      cooking: pick(item.cooking, COOKING, "none"),
      drink_temperature: pick(item.drink_temperature, DRINK_TEMPERATURES, "not_a_drink"),
      portion: pick(item.portion, PORTIONS, "medium"),
    }));
  return { is_food: raw.is_food !== false && items.length > 0, items };
}

// Parses JSON that may be wrapped in a ```json fence or surrounded by prose.
export function parseJsonReply(reply) {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new RecognitionError("Recognition returned no JSON.", 502, "bad_result");
  }
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    throw new RecognitionError("Recognition returned malformed JSON.", 502, "bad_result");
  }
}

// Sample recognition used in demo mode.
export const DEMO_ITEMS = [
  { name_en: "Iced latte", name_zh: "冰拿铁", food_key: "coffee", estimated_nature: "warm", cooking: "iced", drink_temperature: "iced", portion: "large" },
  { name_en: "Romaine lettuce", name_zh: "生菜", food_key: "lettuce", estimated_nature: "cool", cooking: "raw", drink_temperature: "not_a_drink", portion: "large" },
  { name_en: "Grilled chicken", name_zh: "烤鸡胸", food_key: "chicken", estimated_nature: "warm", cooking: "grilled_roasted", drink_temperature: "not_a_drink", portion: "medium" },
  { name_en: "Parmesan", name_zh: "帕玛森奶酪", food_key: "cheese", estimated_nature: "neutral", cooking: "none", drink_temperature: "not_a_drink", portion: "small" },
  { name_en: "Watermelon", name_zh: "西瓜", food_key: "watermelon", estimated_nature: "cold", cooking: "raw", drink_temperature: "not_a_drink", portion: "medium" },
];

const PRESETS = {
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash-vision-exp",
    keyEnv: "DEEPSEEK_API_KEY",
  },
  openai_compatible: {
    baseUrl: "",
    model: "",
    keyEnv: "AI_API_KEY",
  },
};

// Reads provider settings from the environment (see .env.example).
export function resolveConfig(env = process.env, argv = process.argv) {
  if (env.DEMO === "1" || argv.includes("--demo")) {
    return { provider: "demo" };
  }

  let provider = env.AI_PROVIDER?.trim().toLowerCase();
  if (!provider) {
    if (env.DEEPSEEK_API_KEY) provider = "deepseek";
    else if (env.AI_API_KEY) provider = "openai_compatible";
    else if (env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN) provider = "claude";
    else return { provider: "demo" };
  }

  if (provider === "claude") {
    if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) return { provider: "demo" };
    return { provider: "claude", model: env.AI_MODEL || "claude-opus-5" };
  }

  const preset = PRESETS[provider];
  if (!preset) {
    throw new Error(`Unknown AI_PROVIDER "${provider}". Use deepseek, openai_compatible or claude.`);
  }
  const apiKey = env.AI_API_KEY || env[preset.keyEnv];
  if (!apiKey) return { provider: "demo" };

  const baseUrl = (env.AI_BASE_URL || preset.baseUrl).replace(/\/+$/, "");
  const model = env.AI_MODEL || preset.model;
  if (!baseUrl || !model) {
    throw new Error("openai_compatible needs AI_BASE_URL and AI_MODEL to be set.");
  }
  return {
    provider,
    baseUrl,
    model,
    apiKey,
    // Some OpenAI-compatible servers reject response_format; AI_JSON_MODE=0 turns it off.
    jsonMode: env.AI_JSON_MODE !== "0",
  };
}
