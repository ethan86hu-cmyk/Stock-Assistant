import Anthropic from "@anthropic-ai/sdk";
import { SCHEMA, SYSTEM_PROMPT, USER_PROMPT, RecognitionError } from "../recognition.mjs";

let client;

// Claude with schema-enforced JSON output.
export async function recognizeWithClaude({ mediaType, data }, config) {
  client ??= new Anthropic();

  let response;
  try {
    response = await client.beta.messages.create({
      model: config.model,
      max_tokens: 16000,
      // If a safety classifier declines, retry server-side on the model
      // Anthropic recommends instead of returning a refusal.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: USER_PROMPT },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new RecognitionError("The server's Anthropic API key is invalid.", 500, "invalid_key");
    } else if (error instanceof Anthropic.RateLimitError) {
      throw new RecognitionError("Too many requests right now. Try again in a minute.", 429, "rate_limited");
    } else if (error instanceof Anthropic.BadRequestError) {
      throw new RecognitionError(`The image could not be processed: ${error.message}`, 400, "rejected");
    } else if (error instanceof Anthropic.APIError) {
      throw new RecognitionError(`Recognition service error (${error.status}).`, 502, "service_error");
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new RecognitionError("This photo could not be analyzed.", 422, "refused");
  }
  if (response.stop_reason === "max_tokens") {
    throw new RecognitionError("Recognition was cut off. Try a simpler photo.", 502, "cut_off");
  }

  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text) {
    throw new RecognitionError("Recognition returned no result.", 502, "bad_result");
  }
  return JSON.parse(text);
}
