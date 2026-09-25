import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Loads warm-plate/.env if present. Import this before anything that reads
// process.env; variables already set in the shell take precedence.
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
