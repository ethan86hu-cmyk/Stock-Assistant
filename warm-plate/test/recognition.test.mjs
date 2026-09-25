import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  resolveConfig,
  normalizeRecognition,
  parseJsonReply,
  RecognitionError,
} from "../lib/recognition.mjs";
import { recognizeWithOpenAICompatible } from "../lib/providers/openaiCompatible.mjs";

const IMAGE = { mediaType: "image/png", data: "iVBORw0KGgo=" };

test("no keys means demo mode", () => {
  assert.equal(resolveConfig({}, []).provider, "demo");
});

test("--demo wins over a configured key", () => {
  assert.equal(resolveConfig({ DEEPSEEK_API_KEY: "k" }, ["--demo"]).provider, "demo");
});

test("a DeepSeek key selects DeepSeek with its defaults", () => {
  const config = resolveConfig({ DEEPSEEK_API_KEY: "k" }, []);
  assert.equal(config.provider, "deepseek");
  assert.equal(config.baseUrl, "https://api.deepseek.com");
  assert.equal(config.model, "deepseek-v4-flash-vision-exp");
  assert.equal(config.jsonMode, true);
});

test("DeepSeek model, URL and JSON mode can be overridden", () => {
  const config = resolveConfig(
    { DEEPSEEK_API_KEY: "k", AI_MODEL: "m", AI_BASE_URL: "http://x/v1/", AI_JSON_MODE: "0" },
    [],
  );
  assert.equal(config.model, "m");
  assert.equal(config.baseUrl, "http://x/v1");
  assert.equal(config.jsonMode, false);
});

test("openai_compatible requires a base URL and model", () => {
  assert.throws(() => resolveConfig({ AI_PROVIDER: "openai_compatible", AI_API_KEY: "k" }, []));
});

test("an Anthropic key alone selects Claude", () => {
  const config = resolveConfig({ ANTHROPIC_API_KEY: "k" }, []);
  assert.equal(config.provider, "claude");
  assert.equal(config.model, "claude-opus-5");
});

test("an unknown provider is a clear error", () => {
  assert.throws(() => resolveConfig({ AI_PROVIDER: "nope", AI_API_KEY: "k" }, []), /Unknown AI_PROVIDER/);
});

test("normalization replaces unknown values with safe defaults", () => {
  const result = normalizeRecognition({
    is_food: true,
    items: [
      { name_en: "Mystery stew", food_key: "stew", cooking: "smoked", portion: "huge" },
      { name_en: "" },
      "not an item",
    ],
  });
  assert.deepEqual(result.items, [
    {
      name_en: "Mystery stew",
      name_zh: "",
      food_key: "other",
      estimated_nature: "neutral",
      cooking: "none",
      drink_temperature: "not_a_drink",
      portion: "medium",
    },
  ]);
});

test("normalization treats an empty item list as not food", () => {
  assert.equal(normalizeRecognition({ is_food: true, items: [] }).is_food, false);
});

test("JSON replies are parsed even inside a code fence", () => {
  assert.deepEqual(parseJsonReply('```json\n{"is_food": false, "items": []}\n```'), {
    is_food: false,
    items: [],
  });
  assert.throws(() => parseJsonReply("no json here"), RecognitionError);
});

// A stand-in for an OpenAI-compatible server that records what it receives.
async function withMockServer(handler, run) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ url: req.url, headers: req.headers, body: JSON.parse(Buffer.concat(chunks)) });
    handler(req, res);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const baseUrl = `http://localhost:${server.address().port}`;
    await run(baseUrl, requests);
  } finally {
    server.close();
  }
}

const reply = (status, body) => (req, res) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

test("the OpenAI-compatible provider sends the image and parses the reply", async () => {
  const content = JSON.stringify({ is_food: true, items: [{ name_en: "Rice", food_key: "white_rice" }] });
  await withMockServer(
    reply(200, { choices: [{ finish_reason: "stop", message: { content } }] }),
    async (baseUrl, requests) => {
      const result = await recognizeWithOpenAICompatible(IMAGE, {
        baseUrl, model: "vision-model", apiKey: "secret", jsonMode: true,
      });
      assert.equal(result.items[0].food_key, "white_rice");

      const [request] = requests;
      assert.equal(request.url, "/chat/completions");
      assert.equal(request.headers.authorization, "Bearer secret");
      assert.equal(request.body.model, "vision-model");
      assert.deepEqual(request.body.response_format, { type: "json_object" });
      const image = request.body.messages[1].content[0];
      assert.equal(image.image_url.url, "data:image/png;base64,iVBORw0KGgo=");
    },
  );
});

test("JSON mode can be switched off", async () => {
  await withMockServer(
    reply(200, { choices: [{ message: { content: '{"is_food": false, "items": []}' } }] }),
    async (baseUrl, requests) => {
      await recognizeWithOpenAICompatible(IMAGE, { baseUrl, model: "m", apiKey: "k", jsonMode: false });
      assert.equal(requests[0].body.response_format, undefined);
    },
  );
});

test("API errors map to friendly messages", async () => {
  const cases = [
    [401, 500, /API key is invalid/],
    [402, 500, /out of credit/],
    [429, 429, /Too many requests/],
    [400, 502, /supports images/],
    [503, 502, /service error/],
  ];
  for (const [upstream, expected, message] of cases) {
    await withMockServer(reply(upstream, { error: { message: "boom" } }), async (baseUrl) => {
      await assert.rejects(
        recognizeWithOpenAICompatible(IMAGE, { baseUrl, model: "m", apiKey: "k", jsonMode: true }),
        (error) => error instanceof RecognitionError && error.status === expected && message.test(error.message),
      );
    });
  }
});

test("a truncated reply is reported, not parsed", async () => {
  await withMockServer(
    reply(200, { choices: [{ finish_reason: "length", message: { content: '{"is_food": tr' } }] }),
    async (baseUrl) => {
      await assert.rejects(
        recognizeWithOpenAICompatible(IMAGE, { baseUrl, model: "m", apiKey: "k", jsonMode: true }),
        /cut off/,
      );
    },
  );
});
