import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Waitlist } from "../lib/waitlist.mjs";

const tempFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "waitlist-")), "nested", "list.jsonl");

test("adds, normalizes and de-duplicates emails", () => {
  const list = new Waitlist(tempFile());
  assert.equal(list.add(" Ana@Example.com ", { lang: "zh", source: "tiktok1" }), "added");
  assert.equal(list.add("ana@example.com"), "exists");
  assert.equal(list.size, 1);
  const [line] = fs.readFileSync(list.file, "utf8").trim().split("\n");
  const entry = JSON.parse(line);
  assert.equal(entry.email, "ana@example.com");
  assert.equal(entry.lang, "zh");
  assert.equal(entry.source, "tiktok1");
});

test("rejects invalid emails without writing", () => {
  const list = new Waitlist(tempFile());
  for (const bad of ["", "no-at-sign", "a@b", `${"x".repeat(250)}@example.com`, 42]) {
    assert.equal(list.add(bad), "invalid");
  }
  assert.equal(fs.existsSync(list.file), false);
});

test("reloads existing sign-ups and skips damaged lines", () => {
  const file = tempFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{"email":"a@example.com"}\nnot json\n');
  const list = new Waitlist(file);
  assert.equal(list.size, 1);
  assert.equal(list.add("a@example.com"), "exists");
});

test("unexpected language and source values are sanitized", () => {
  const list = new Waitlist(tempFile());
  list.add("b@example.com", { lang: "fr", source: { evil: true } });
  const entry = JSON.parse(fs.readFileSync(list.file, "utf8"));
  assert.equal(entry.lang, "en");
  assert.equal(entry.source, "web");
});
