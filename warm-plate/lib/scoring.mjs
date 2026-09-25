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
    label: { en: "I run cold", zh: "我怕冷" },
    hint: {
      en: "Cold hands and feet, prefer warm drinks, tire easily",
      zh: "手脚容易凉，爱喝热的，容易累",
    },
    target: 0.4,
  },
  balanced: {
    label: { en: "Balanced", zh: "不冷不热" },
    hint: { en: "Rarely too hot or too cold", zh: "很少觉得太冷或太热" },
    target: 0,
  },
  runs_hot: {
    label: { en: "I run warm", zh: "我怕热" },
    hint: {
      en: "Feel hot easily, prefer cold drinks, get thirsty or flushed",
      zh: "容易燥热，爱喝冷饮，常口干或脸红",
    },
    target: -0.3,
  },
};

export const LANGUAGES = ["en", "zh"];
const pickLang = (lang) => (LANGUAGES.includes(lang) ? lang : "en");

// Everything scorePlate writes for people to read, per language.
const TEXT = {
  en: {
    level: { warm: "slightly warming", cool: "slightly cooling", neutral: "neutral" },
    runsCold: "you run cold",
    runsHot: "you run warm",
    weatherCooling: (term) => `the weather is cooling (${term.en})`,
    weatherHot: (term) => `it's the hot season (${term.en})`,
    target: (level, reasons, mixed) =>
      `Your ideal today is ${level}${reasons.length ? `, because ${reasons.join(mixed ? ", but " : " and ")}` : ""}.`,
    headline: {
      too_cold: "Too cooling for you today",
      too_warm: "Too warming for you today",
      warm_ok: "Warming, and right for you today",
      cool_ok: "Cooling, and right for you today",
      neutral_ok: "Nicely balanced",
    },
    grandmaCold: (names) => `Aiya, ${names}? Your stomach needs some warmth!`,
    grandmaWarm: (names) => `${capitalize(names)} all at once? Careful, you'll get too much heat (上火).`,
    grandmaOk: "Good, good. This is how you should eat. Now finish it while it's warm.",
    names: (items) => items.map((s) => s.name.toLowerCase()).join(" and ") || "all this",
    warmingTips: [
      "Swap the iced drink for warm water or a cup of black tea.",
      "Add a few slices of fresh ginger or some scallions.",
      "Start the meal with a warm soup instead of a cold salad.",
    ],
    coolingTips: [
      "Add a side of cucumber, lettuce or lightly cooked greens.",
      "Balance the fried or spicy dishes with something steamed.",
      "Finish with a pear or a cup of green tea.",
    ],
  },
  zh: {
    level: { warm: "稍微偏温", cool: "稍微偏凉", neutral: "平和" },
    runsCold: "你怕冷",
    runsHot: "你怕热",
    weatherCooling: (term) => `天气在转凉（${term.zh}）`,
    weatherHot: (term) => `正值暑热（${term.zh}）`,
    target: (level, reasons, mixed) =>
      `你今天适合吃得${level}${reasons.length ? `，因为${reasons.join(mixed ? "，但" : "，而且")}` : ""}。`,
    headline: {
      too_cold: "今天吃这些，对你来说太寒了",
      too_warm: "今天吃这些，对你来说太热了",
      warm_ok: "偏温，正适合你今天吃",
      cool_ok: "偏凉，正适合你今天吃",
      neutral_ok: "寒热平衡，很好",
    },
    grandmaCold: (names) => `哎呀，又吃${names}？胃要暖着才舒服！`,
    grandmaWarm: (names) => `${names}一起吃？小心上火啊。`,
    grandmaOk: "好，好，就该这么吃。趁热吃完。",
    names: (items) => items.map((s) => s.name_zh || s.name).join("、") || "这些",
    warmingTips: [
      "冰饮换成温水或一杯红茶。",
      "加几片生姜，或者撒点葱花。",
      "先喝碗热汤，别一上来就吃凉沙拉。",
    ],
    coolingTips: [
      "配一份黄瓜、生菜或者清炒青菜。",
      "油炸、辛辣的菜，搭配一道清蒸的来平衡。",
      "饭后吃个梨，或者喝杯绿茶。",
    ],
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

// Explains in plain words why today's ideal sits where it does. Reasons that
// pull in opposite directions are joined with "but".
function describeTarget(target, constitution, term, t) {
  const level = t.level[target > 0.2 ? "warm" : target < -0.2 ? "cool" : "neutral"];
  // Body type first, then the season; each carries the direction it pulls.
  const reasons = [];
  if (constitution === "runs_cold") reasons.push({ text: t.runsCold, pull: 1 });
  if (constitution === "runs_hot") reasons.push({ text: t.runsHot, pull: -1 });
  if (term.seasonBias > 0) reasons.push({ text: t.weatherCooling(term), pull: 1 });
  if (term.seasonBias < 0) reasons.push({ text: t.weatherHot(term), pull: -1 });
  const mixed = new Set(reasons.map((r) => r.pull)).size > 1;
  return t.target(level, reasons.map((r) => r.text), mixed);
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

// Scores a whole plate against the eater's constitution and the season.
export function scorePlate(items, { constitution = "balanced", date = new Date(), lang = "en" } = {}) {
  const t = TEXT[pickLang(lang)];
  const scored = items.map(scoreItem);
  const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0) || 1;
  const average = scored.reduce((sum, s) => sum + s.effective * s.weight, 0) / totalWeight;

  const term = solarTermFor(date);
  const constitutionKey = constitution in CONSTITUTIONS ? constitution : "balanced";
  const profile = CONSTITUTIONS[constitutionKey];
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
      headline: t.headline.too_cold,
      grandma: t.grandmaCold(t.names(coolest)),
      suggestions: t.warmingTips,
    };
  } else if (gap > 0.5) {
    verdict = "too_warm";
    advice = {
      headline: t.headline.too_warm,
      grandma: t.grandmaWarm(t.names(warmest)),
      suggestions: t.coolingTips,
    };
  } else {
    verdict = "balanced";
    // "Balanced" means right for this eater today, not necessarily neutral:
    // a warming meal can be exactly what someone who runs cold needs.
    const leaning = Number(plateBand(average));
    advice = {
      headline: t.headline[leaning > 0 ? "warm_ok" : leaning < 0 ? "cool_ok" : "neutral_ok"],
      grandma: t.grandmaOk,
      suggestions: [],
    };
  }

  return {
    score: Math.round(clamp(average, -2, 2) * 50), // -100 (cold) .. +100 (hot)
    plate_nature: NATURE_LABELS[plateBand(average)],
    target: round1(target),
    target_reason: describeTarget(target, constitutionKey, term, t),
    verdict,
    advice,
    items: scored.map(({ weight, ...rest }) => rest),
    constitution: constitutionKey,
  };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
