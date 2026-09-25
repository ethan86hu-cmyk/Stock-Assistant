import Anthropic from "@anthropic-ai/sdk";
import { FOOD_KEYS } from "./foods.mjs";

const MODEL = "claude-opus-5";

// Claude only identifies what is on the plate. Warming/cooling natures come
// from our own food table (lib/foods.mjs), so the scoring stays consistent
// and can be reviewed by hand.
const SCHEMA = {
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
          estimated_nature: {
            type: "string",
            enum: ["cold", "cool", "neutral", "warm", "hot"],
          },
          cooking: {
            type: "string",
            enum: [
              "raw", "iced", "steamed", "boiled", "braised_stewed",
              "stir_fried", "baked", "grilled_roasted", "deep_fried", "none",
            ],
          },
          drink_temperature: {
            type: "string",
            enum: ["iced", "cold", "room", "warm", "hot", "not_a_drink"],
          },
          portion: { type: "string", enum: ["small", "medium", "large"] },
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

const SYSTEM = `You identify the foods and drinks in a meal photo for a Chinese food therapy app.

Break composite dishes into their main ingredients (a Caesar salad becomes lettuce, grilled chicken, cheese and bread croutons; sushi becomes rice and raw fish). List at most 8 items, the ones that make up most of the meal; skip garnishes.

For each item:
- food_key: the closest key from the allowed list, or "other" if nothing fits.
- estimated_nature: the item's nature in Chinese food therapy (cold, cool, neutral, warm or hot). It is only used when food_key is "other", but always fill it in.
- cooking: how it looks to be prepared. Use "iced" for iced drinks and frozen desserts, "none" for drinks and things that are not cooked or raw (bread, cheese).
- drink_temperature: for drinks, judge from ice, condensation and steam; "not_a_drink" for food.
- portion: relative to a typical single serving.

If the photo does not show food or drink, set is_food to false and return an empty items list.`;

// Sample recognition used when no API credentials are configured.
const DEMO_ITEMS = [
  { name_en: "Iced latte", name_zh: "冰拿铁", food_key: "coffee", estimated_nature: "warm", cooking: "iced", drink_temperature: "iced", portion: "large" },
  { name_en: "Romaine lettuce", name_zh: "生菜", food_key: "lettuce", estimated_nature: "cool", cooking: "raw", drink_temperature: "not_a_drink", portion: "large" },
  { name_en: "Grilled chicken", name_zh: "烤鸡胸", food_key: "chicken", estimated_nature: "warm", cooking: "grilled_roasted", drink_temperature: "not_a_drink", portion: "medium" },
  { name_en: "Parmesan", name_zh: "帕玛森奶酪", food_key: "cheese", estimated_nature: "neutral", cooking: "none", drink_temperature: "not_a_drink", portion: "small" },
  { name_en: "Watermelon", name_zh: "西瓜", food_key: "watermelon", estimated_nature: "cold", cooking: "raw", drink_temperature: "not_a_drink", portion: "medium" },
];

export function isDemoMode() {
  if (process.env.DEMO === "1") return true;
  return !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN;
}

export class RecognitionError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

let client;

// Returns { is_food, items, demo } for a base64 image.
export async function recognizeMeal({ mediaType, data }) {
  if (isDemoMode()) {
    return { is_food: true, items: DEMO_ITEMS, demo: true };
  }
  client ??= new Anthropic();

  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, retry server-side on the model
      // Anthropic recommends instead of returning a refusal.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: "What is in this meal?" },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new RecognitionError("The server's Anthropic API key is invalid.", 500);
    } else if (error instanceof Anthropic.RateLimitError) {
      throw new RecognitionError("Too many requests right now. Try again in a minute.", 429);
    } else if (error instanceof Anthropic.BadRequestError) {
      throw new RecognitionError(`The image could not be processed: ${error.message}`, 400);
    } else if (error instanceof Anthropic.APIError) {
      throw new RecognitionError(`Recognition service error (${error.status}).`, 502);
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new RecognitionError("This photo could not be analyzed.", 422);
  }
  if (response.stop_reason === "max_tokens") {
    throw new RecognitionError("Recognition was cut off. Try a simpler photo.", 502);
  }

  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text) {
    throw new RecognitionError("Recognition returned no result.", 502);
  }
  const parsed = JSON.parse(text);
  return { is_food: parsed.is_food, items: parsed.items, demo: false };
}
