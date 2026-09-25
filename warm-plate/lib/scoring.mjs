import { FOODS, NATURE_LABELS, ESTIMATED_NATURE } from "./foods.mjs";
import { solarTermFor } from "./solarTerms.mjs";

// How cooking shifts a food's nature. Frying and roasting add heat,
// raw and iced foods feel colder to the stomach.
const COOKING_SHIFT = {
  raw: -0.5,
  iced: -1,
  steamed: 0,
  boiled: 0,
  braised_stewed: 0.3,
  stir_fried: 0.5,
  baked: 0.5,
  grilled_roasted: 1,
  deep_fried: 1,
  none: 0,
};

// Serving temperature matters most for drinks.
const TEMPERATURE_SHIFT = {
  iced: -1.5,
  cold: -1,
  room: 0,
  warm: 0.3,
  hot: 0.5,
  not_a_drink: 0,
};

const PORTION_WEIGHT = { small: 0.5, medium: 1, large: 1.5 };

export const CONSTITUTIONS = {
  runs_cold: {
    label: "I run cold",
    hint: "Cold hands and feet, prefer warm drinks, tire easily",
    target: 0.4,
  },
  balanced: {
    label: "Balanced",
    hint: "Rarely too hot or too cold",
    target: 0,
  },
  runs_hot: {
    label: "I run warm",
    hint: "Feel hot easily, prefer cold drinks, get thirsty or flushed",
    target: -0.3,
  },
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round1 = (x) => Math.round(x * 10) / 10;

function natureBand(value) {
  if (value <= -1) return "-2";
  if (value <= -0.35) return "-1";
  if (value < 0.35) return "0";
  if (value < 1) return "1";
  return "2";
}

// A whole plate averages several foods, so it rarely reaches the extremes;
// it needs a stronger average than a single food to be called hot or cold.
function plateBand(value) {
  if (value <= -1.25) return "-2";
  if (value <= -0.35) return "-1";
  if (value < 0.35) return "0";
  if (value < 1.25) return "1";
  return "2";
}

// Explains in plain words why today's ideal sits where it does.
function describeTarget(target, constitution, term) {
  const level = target > 0.2 ? "slightly warming" : target < -0.2 ? "slightly cooling" : "neutral";
  const reasons = [];
  if (constitution === "runs_cold") reasons.push("you run cold");
  if (constitution === "runs_hot") reasons.push("you run warm");
  if (term.seasonBias > 0) reasons.push(`the weather is cooling (${term.en})`);
  if (term.seasonBias < 0) reasons.push(`it's the hot season (${term.en})`);
  const because = reasons.length ? `, because ${reasons.join(" and ")}` : "";
  return `Your ideal today is ${level}${because}.`;
}

// Resolves one recognized item to its nature and effective warmth.
export function scoreItem(item) {
  const known = FOODS[item.food_key];
  const base = known ? known.nature : ESTIMATED_NATURE[item.estimated_nature] ?? 0;
  const shift =
    (COOKING_SHIFT[item.cooking] ?? 0) + (TEMPERATURE_SHIFT[item.drink_temperature] ?? 0);
  const effective = clamp(base + shift, -2, 2);
  return {
    name: item.name_en,
    // Prefer the model's specific name ("冰拿铁") over the table's generic one ("咖啡").
    name_zh: item.name_zh || known?.zh || "",
    base_nature: NATURE_LABELS[String(base)],
    effective: round1(effective),
    effective_label: NATURE_LABELS[natureBand(effective)],
    cooking: item.cooking,
    drink_temperature: item.drink_temperature,
    portion: item.portion,
    // "table" = from our reviewed food table; "estimated" = the model's guess.
    source: known ? (known.traditional === false ? "estimated_modern" : "table") : "estimated",
    weight: PORTION_WEIGHT[item.portion] ?? 1,
  };
}

const WARMING_SUGGESTIONS = [
  "Swap the iced drink for warm water or a cup of black tea.",
  "Add a few slices of fresh ginger or some scallions.",
  "Start the meal with a warm soup instead of a cold salad.",
  "Cook the greens briefly instead of eating them raw.",
];

const COOLING_SUGGESTIONS = [
  "Add a side of cucumber, lettuce or lightly cooked greens.",
  "Balance the fried or spicy dishes with something steamed.",
  "Finish with a pear or a cup of green tea.",
  "Go easy on chili, garlic and roasted meats this time.",
];

// Scores a whole plate against the eater's constitution and the season.
export function scorePlate(items, { constitution = "balanced", date = new Date() } = {}) {
  const scored = items.map(scoreItem);
  const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0) || 1;
  const average = scored.reduce((sum, s) => sum + s.effective * s.weight, 0) / totalWeight;

  const term = solarTermFor(date);
  const profile = CONSTITUTIONS[constitution] ?? CONSTITUTIONS.balanced;
  const target = profile.target + term.seasonBias;
  const gap = average - target;

  const byWarmth = [...scored].sort((a, b) => a.effective - b.effective);
  const coolest = byWarmth.filter((s) => s.effective < 0).slice(0, 2);
  const warmest = byWarmth.filter((s) => s.effective > 0).reverse().slice(0, 2);

  let verdict;
  let advice;
  if (gap < -0.5) {
    verdict = "too_cold";
    advice = {
      headline: "Too cooling for you today",
      grandma: `Aiya, ${listNames(coolest)}? Your stomach needs some warmth!`,
      suggestions: WARMING_SUGGESTIONS.slice(0, 3),
    };
  } else if (gap > 0.5) {
    verdict = "too_warm";
    advice = {
      headline: "Too warming for you today",
      grandma: `${capitalize(listNames(warmest))} all at once? Careful, you'll get too much heat (上火).`,
      suggestions: COOLING_SUGGESTIONS.slice(0, 3),
    };
  } else {
    verdict = "balanced";
    // "Balanced" means right for this eater today, not necessarily neutral:
    // a warming meal can be exactly what someone who runs cold needs.
    const leaning = Number(plateBand(average));
    advice = {
      headline:
        leaning > 0
          ? "Warming, and right for you today"
          : leaning < 0
            ? "Cooling, and right for you today"
            : "Nicely balanced",
      grandma: "Good, good. This is how you should eat. Now finish it while it's warm.",
      suggestions: [],
    };
  }

  return {
    score: Math.round(clamp(average, -2, 2) * 50), // -100 (cold) .. +100 (hot)
    plate_nature: NATURE_LABELS[plateBand(average)],
    target: round1(target),
    target_reason: describeTarget(target, constitution in CONSTITUTIONS ? constitution : "balanced", term),
    verdict,
    advice,
    items: scored.map(({ weight, ...rest }) => rest),
    solar_term: { zh: term.zh, en: term.en, tip: term.tip },
    constitution: { key: constitution in CONSTITUTIONS ? constitution : "balanced", label: profile.label },
  };
}

function listNames(items) {
  const names = items.map((s) => s.name.toLowerCase());
  if (names.length === 0) return "all this";
  return names.join(" and ");
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
