import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Early-access sign-ups, one JSON object per line. A flat file is enough
// for a validation-stage waitlist; export it with `cat` or `wc -l`.
const defaultFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "waitlist.jsonl");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Waitlist {
  constructor(file = process.env.WAITLIST_FILE || defaultFile) {
    this.file = file;
    this.emails = new Set();
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          this.emails.add(JSON.parse(line).email);
        } catch {
          // Skip a damaged line rather than refusing to start.
        }
      }
    }
  }

  // Returns "added", "exists" or "invalid".
  add(rawEmail, { lang = "en", source = "web" } = {}) {
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) return "invalid";
    if (this.emails.has(email)) return "exists";

    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const entry = {
      email,
      lang: lang === "zh" ? "zh" : "en",
      source: typeof source === "string" ? source.slice(0, 40) : "web",
      at: new Date().toISOString(),
    };
    fs.appendFileSync(this.file, `${JSON.stringify(entry)}\n`);
    this.emails.add(email);
    return "added";
  }

  get size() {
    return this.emails.size;
  }
}
