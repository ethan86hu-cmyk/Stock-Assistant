import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recognizeMeal, isDemoMode, RecognitionError } from "./lib/recognize.mjs";
import { scorePlate, CONSTITUTIONS } from "./lib/scoring.mjs";
import { solarTermFor } from "./lib/solarTerms.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "public");
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
      throw new RecognitionError("Image is too large. Keep it under 8 MB.", 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RecognitionError("Request body is not valid JSON.", 400);
  }
}

// Accepts a data URL like "data:image/jpeg;base64,...".
function parseImage(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? "");
  if (!match || !IMAGE_TYPES.has(match[1])) {
    throw new RecognitionError("Send a JPEG, PNG, WebP or GIF image.", 400);
  }
  return { mediaType: match[1], data: match[2] };
}

async function handleAnalyze(req, res) {
  const body = await readJsonBody(req);
  const image = parseImage(body.image);
  const recognition = await recognizeMeal(image);
  if (!recognition.is_food || recognition.items.length === 0) {
    sendJson(res, 422, { error: "No food found in this photo. Try a clearer shot of your plate." });
    return;
  }
  const result = scorePlate(recognition.items, { constitution: body.constitution });
  sendJson(res, 200, { ...result, demo: recognition.demo });
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
    } else if (req.method === "GET" && req.url === "/api/config") {
      const term = solarTermFor();
      sendJson(res, 200, {
        demo: isDemoMode(),
        constitutions: CONSTITUTIONS,
        solar_term: { zh: term.zh, en: term.en, tip: term.tip },
      });
    } else if (req.method === "GET") {
      await serveStatic(req, res);
    } else {
      res.writeHead(405).end();
    }
  } catch (error) {
    if (error instanceof RecognitionError) {
      sendJson(res, error.status, { error: error.message });
    } else {
      console.error(error);
      sendJson(res, 500, { error: "Something went wrong. Please try again." });
    }
  }
});

server.listen(PORT, () => {
  const mode = isDemoMode() ? "demo mode (sample results, no API calls)" : "live mode";
  console.log(`Warm Plate running at http://localhost:${PORT} in ${mode}`);
});
