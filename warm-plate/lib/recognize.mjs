import { resolveConfig, normalizeRecognition, DEMO_ITEMS } from "./recognition.mjs";
import { recognizeWithClaude } from "./providers/claude.mjs";
import { recognizeWithOpenAICompatible } from "./providers/openaiCompatible.mjs";

export { RecognitionError } from "./recognition.mjs";

const config = resolveConfig();

// What the UI shows about the active provider; never includes the key.
export function providerInfo() {
  return { provider: config.provider, model: config.model ?? null };
}

// Returns { is_food, items, demo } for a base64 image.
export async function recognizeMeal(image) {
  if (config.provider === "demo") {
    return { is_food: true, items: DEMO_ITEMS, demo: true };
  }
  const raw =
    config.provider === "claude"
      ? await recognizeWithClaude(image, config)
      : await recognizeWithOpenAICompatible(image, config);
  return { ...normalizeRecognition(raw), demo: false };
}
