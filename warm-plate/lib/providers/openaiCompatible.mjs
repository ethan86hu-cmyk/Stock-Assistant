import {
  SYSTEM_PROMPT,
  JSON_INSTRUCTIONS,
  USER_PROMPT,
  RecognitionError,
  parseJsonReply,
} from "../recognition.mjs";

const TIMEOUT_MS = 90_000;

// Calls any OpenAI-compatible Chat Completions endpoint with an image,
// e.g. DeepSeek (deepseek-v4-flash-vision-exp), Qwen-VL or OpenAI.
export async function recognizeWithOpenAICompatible({ mediaType, data }, config) {
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${JSON_INSTRUCTIONS}` },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${data}` } },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
    max_tokens: 4000,
  };
  if (config.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  let response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new RecognitionError("The recognition service took too long. Try again.", 504);
    }
    throw new RecognitionError(`Could not reach the recognition service (${error.message}).`, 502);
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    console.error(`Recognition API error ${response.status}: ${detail}`);
    throw errorForStatus(response.status, detail);
  }

  const payload = await response.json();
  const choice = payload.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new RecognitionError("Recognition was cut off. Try a simpler photo.", 502);
  }
  const reply = choice?.message?.content;
  if (typeof reply !== "string" || reply.trim() === "") {
    throw new RecognitionError("Recognition returned no result.", 502);
  }
  return parseJsonReply(reply);
}

async function readErrorDetail(response) {
  try {
    const payload = await response.json();
    return payload.error?.message ?? JSON.stringify(payload);
  } catch {
    return response.statusText;
  }
}

function errorForStatus(status, detail) {
  switch (status) {
    case 401:
      return new RecognitionError("The server's API key is invalid.", 500);
    case 402:
      return new RecognitionError("The API account is out of credit.", 500);
    case 429:
      return new RecognitionError("Too many requests right now. Try again in a minute.", 429);
    case 400:
    case 422:
      return new RecognitionError(
        `The recognition service rejected the request: ${detail}. Check that AI_MODEL supports images; if it mentions response_format, set AI_JSON_MODE=0.`,
        502,
      );
    default:
      return new RecognitionError(`Recognition service error (${status}).`, 502);
  }
}
