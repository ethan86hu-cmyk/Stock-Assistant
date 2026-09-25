import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreItem, scorePlate } from "../lib/scoring.mjs";
import { solarTermFor } from "../lib/solarTerms.mjs";

const item = (overrides) => ({
  name_en: "Food",
  name_zh: "",
  food_key: "other",
  estimated_nature: "neutral",
  cooking: "none",
  drink_temperature: "not_a_drink",
  portion: "medium",
  ...overrides,
});

// A day in spring with no seasonal bias, so targets equal the constitution's.
const EQUINOX = new Date(2026, 2, 21);

test("known foods use the table, not the model's estimate", () => {
  const scored = scoreItem(item({ food_key: "watermelon", estimated_nature: "hot" }));
  assert.equal(scored.effective, -2);
  assert.equal(scored.source, "table");
});

test("unknown foods fall back to the model's estimate", () => {
  const scored = scoreItem(item({ food_key: "other", estimated_nature: "warm" }));
  assert.equal(scored.effective, 1);
  assert.equal(scored.source, "estimated");
});

test("an iced drink turns a warm ingredient cold", () => {
  const scored = scoreItem(item({ food_key: "coffee", cooking: "iced", drink_temperature: "iced" }));
  assert.equal(scored.effective, -1.5);
  assert.equal(scored.effective_label.en, "Cold");
});

test("deep frying warms a neutral food", () => {
  const scored = scoreItem(item({ food_key: "potato", cooking: "deep_fried" }));
  assert.equal(scored.effective, 1);
});

test("effective nature is clamped to the scale", () => {
  const scored = scoreItem(item({ food_key: "lamb", cooking: "deep_fried" }));
  assert.equal(scored.effective, 2);
});

test("a cold salad lunch is too cold for someone who runs cold", () => {
  const result = scorePlate(
    [
      item({ name_en: "Lettuce", food_key: "lettuce", cooking: "raw", portion: "large" }),
      item({ name_en: "Iced latte", food_key: "coffee", cooking: "iced", drink_temperature: "iced" }),
    ],
    { constitution: "runs_cold", date: EQUINOX },
  );
  assert.equal(result.verdict, "too_cold");
  assert.ok(result.score < 0);
  assert.equal(result.advice.suggestions.length, 3);
  assert.match(result.advice.grandma, /lettuce/);
});

test("a spicy fried meal is too warm for someone who runs hot", () => {
  const result = scorePlate(
    [
      item({ name_en: "Fried chicken", food_key: "chicken", cooking: "deep_fried", portion: "large" }),
      item({ name_en: "Chili", food_key: "chili", cooking: "stir_fried", portion: "small" }),
    ],
    { constitution: "runs_hot", date: EQUINOX },
  );
  assert.equal(result.verdict, "too_warm");
  assert.equal(result.score, 100);
});

test("a steamed fish and rice meal is balanced", () => {
  const result = scorePlate(
    [
      item({ food_key: "white_fish", cooking: "steamed" }),
      item({ food_key: "white_rice", cooking: "steamed" }),
      item({ food_key: "bok_choy", cooking: "stir_fried", portion: "small" }),
    ],
    { constitution: "balanced", date: EQUINOX },
  );
  assert.equal(result.verdict, "balanced");
  assert.equal(result.advice.suggestions.length, 0);
});

test("a warm meal for someone who runs cold reads as warm and right, not hot", () => {
  // Average warmth 1.0 against a target of 0.5 (runs cold + autumn equinox).
  const result = scorePlate(
    [
      item({ name_en: "Beef stew", food_key: "beef", cooking: "boiled" }),
      item({ name_en: "Rice", food_key: "white_rice", cooking: "steamed" }),
      item({ name_en: "Ginger chicken", food_key: "chicken", cooking: "stir_fried" }),
      item({ name_en: "Black tea", food_key: "black_tea", drink_temperature: "hot" }),
    ],
    { constitution: "runs_cold", date: new Date(2026, 8, 25) },
  );
  assert.equal(result.score, 50);
  assert.equal(result.plate_nature.en, "Warm");
  assert.equal(result.verdict, "balanced");
  assert.equal(result.advice.headline, "Warming, and right for you today");
  assert.match(result.target_reason, /slightly warming, because you run cold and the weather is cooling/);
});

test("a plate is only called hot when its average is strongly warm", () => {
  const hot = scorePlate(
    [item({ food_key: "lamb", cooking: "grilled_roasted" }), item({ food_key: "chili", cooking: "stir_fried" })],
    { date: EQUINOX },
  );
  assert.equal(hot.plate_nature.en, "Hot");
  assert.equal(hot.advice.headline, "Too warming for you today");
});

test("the target explanation is plain when nothing shifts it", () => {
  const result = scorePlate([item({ food_key: "white_rice" })], { date: EQUINOX });
  assert.equal(result.target_reason, "Your ideal today is neutral.");
});

test("larger portions weigh more in the plate score", () => {
  const bigWatermelon = scorePlate(
    [item({ food_key: "watermelon", portion: "large" }), item({ food_key: "lamb", portion: "small" })],
    { date: EQUINOX },
  );
  assert.ok(bigWatermelon.score < 0);
});

test("unknown constitutions fall back to balanced", () => {
  const result = scorePlate([item({ food_key: "white_rice" })], { constitution: "nope", date: EQUINOX });
  assert.equal(result.constitution.key, "balanced");
  assert.equal(result.target, 0);
});

test("winter raises the target warmth", () => {
  const winter = scorePlate([item({ food_key: "white_rice" })], { date: new Date(2026, 0, 25) });
  const summer = scorePlate([item({ food_key: "white_rice" })], { date: new Date(2026, 6, 25) });
  assert.ok(winter.target > summer.target);
});

test("solar terms resolve on and between boundary dates", () => {
  assert.equal(solarTermFor(new Date(2026, 8, 23)).zh, "秋分");
  assert.equal(solarTermFor(new Date(2026, 8, 22)).zh, "白露");
  assert.equal(solarTermFor(new Date(2026, 0, 3)).zh, "冬至");
  assert.equal(solarTermFor(new Date(2026, 11, 31)).zh, "冬至");
  assert.equal(solarTermFor(new Date(2026, 1, 4)).zh, "立春");
});
