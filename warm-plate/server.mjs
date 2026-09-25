import "./lib/env.mjs";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recognizeMeal, providerInfo, RecognitionError } from "./lib/recognize.mjs";
import { normalizeRecognition } from "./lib/recognition.mjs";
import { scorePlate, CONSTITUTIONS } from "./lib/scoring.mjs";
import { solarTermFor } from "./lib/solarTerms.mjs";
import { Waitlist } from "./lib/waitlist.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "public");
const PORT = Number(process.env.PORT) || 3000;
// Set HOST=127.0.0.1 on a server so only the local reverse proxy can reach the app.
const HOST = process.env.HOST || "0.0.0.0";
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const waitlist = new Waitlist();

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new RecognitionError("Image is too large. Keep it under 8 MB.", 413, "too_large");
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RecognitionError("Request body is not valid JSON.", 400, "bad_request");
  }
}

// Accepts a data URL like "data:image/jpeg;base64,...".
function parseImage(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? "");
  if (!match || !IMAGE_TYPES.has(match[1])) {
    throw new RecognitionError("Send a JPEG, PNG, WebP or GIF image.", 400, "bad_image");
  }
  return { mediaType: match[1], data: match[2] };
}

async function handleAnalyze(req, res) {
  const body = await readJsonBody(req);
  const image = parseImage(body.image);
  const recognition = await recognizeMeal(image);
  if (!recognition.is_food || recognition.items.length === 0) {
    sendJson(res, 422, { error: "No food found in this photo. Try a clearer shot of your plate.", code: "no_food" });
    return;
  }
  const result = scorePlate(recognition.items, { constitution: body.constitution, lang: body.lang });
  // The recognized foods go back to the page so it can re-score them for a
  // different language or body type without calling the model again.
  sendJson(res, 200, { ...result, recognized: recognition.items, demo: recognition.demo });
}

async function handleScore(req, res) {
  const body = await readJsonBody(req);
  const { items } = normalizeRecognition({ items: body.items });
  if (items.length === 0) {
    throw new RecognitionError("No foods to score.", 400, "bad_request");
  }
  sendJson(res, 200, scorePlate(items, { constitution: body.constitution, lang: body.lang }));
}

async function handleWaitlist(req, res) {
  const body = await readJsonBody(req);
  const outcome = waitlist.add(body.email, { lang: body.lang, source: body.source });
  if (outcome === "invalid") {
    throw new RecognitionError("Enter a valid email address.", 400, "bad_email");
  }
  sendJson(res, 200, { ok: true, already: outcome === "exists" });
}

async function serveStatic(req, res) {
  const urlPath = new URL(req.url, "http://localhost").pathname;
  const relative = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const filePath = path.join(publicDir, relative);
  if (!filePath.startsWith(publicDir + path.sep)) {
    res.writeHead(404).end();
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": STATIC_TYPES[path.extname(filePath)] ?? "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/analyze") {
      await handleAnalyze(req, res);
    } else if (req.method === "POST" && req.url === "/api/score") {
      await handleScore(req, res);
    } else if (req.method === "POST" && req.url === "/api/waitlist") {
      await handleWaitlist(req, res);
    } else if (req.method === "GET" && req.url === "/api/config") {
      const term = solarTermFor();
      const info = providerInfo();
      sendJson(res, 200, {
        demo: info.provider === "demo",
        model: info.model,
        constitutions: CONSTITUTIONS,
        solar_term: { zh: term.zh, en: term.en, tip: term.tip, tip_zh: term.tip_zh },
      });
    } else if (req.method === "GET") {
      await serveStatic(req, res);
    } else {
      res.writeHead(405).end();
    }
  } catch (error) {
    if (error instanceof RecognitionError) {
      sendJson(res, error.status, { error: error.message, code: error.code });
    } else {
      console.error(error);
      sendJson(res, 500, { error: "Something went wrong. Please try again.", code: "server_error" });
    }
  }
});

server.listen(PORT, HOST, () => {
  const info = providerInfo();
  const mode =
    info.provider === "demo"
      ? "demo mode (sample results, no API calls)"
      : `live mode (${info.provider}, ${info.model})`;
  console.log(`Warm Plate running at http://localhost:${PORT} in ${mode}`);
});
