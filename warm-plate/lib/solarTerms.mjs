// The 24 solar terms (二十四节气), with the usual Gregorian start date.
// Real dates drift by about a day from year to year; that is close enough
// for seasonal food tips. Northern Hemisphere only for now.
//
// seasonBias nudges the target warmth of a meal: positive in the cold half of
// the year (eat warmer), negative in the hottest weeks (eat cooler).

export const SOLAR_TERMS = [
  { month: 1, day: 5, zh: "小寒", en: "Minor Cold", seasonBias: 0.4, tip: "Deep winter. Slow-cooked soups, lamb, ginger and red dates keep you warm from the inside." },
  { month: 1, day: 20, zh: "大寒", en: "Major Cold", seasonBias: 0.4, tip: "The coldest weeks. Skip iced drinks entirely and keep your feet warm." },
  { month: 2, day: 4, zh: "立春", en: "Start of Spring", seasonBias: 0.2, tip: "Spring begins. Add fresh sprouts and scallions, but the weather is still cold, so keep meals cooked." },
  { month: 2, day: 19, zh: "雨水", en: "Rain Water", seasonBias: 0.2, tip: "Damp weather arrives. Easy on raw and greasy food; congee and millet are kind to the stomach." },
  { month: 3, day: 5, zh: "惊蛰", en: "Awakening of Insects", seasonBias: 0.1, tip: "Spring stirs. Pears and lightly cooked greens suit the season." },
  { month: 3, day: 20, zh: "春分", en: "Spring Equinox", seasonBias: 0, tip: "Day and night in balance. Aim for a balanced plate: mix cooling and warming foods." },
  { month: 4, day: 4, zh: "清明", en: "Clear and Bright", seasonBias: 0, tip: "Fresh spring greens are at their best. Keep portions of cold food modest." },
  { month: 4, day: 20, zh: "谷雨", en: "Grain Rain", seasonBias: 0, tip: "Humid spring. Job's tears and red beans help with that heavy, damp feeling." },
  { month: 5, day: 5, zh: "立夏", en: "Start of Summer", seasonBias: -0.1, tip: "Summer begins. Lighter meals, but avoid jumping straight to iced drinks." },
  { month: 5, day: 21, zh: "小满", en: "Grain Buds", seasonBias: -0.1, tip: "Heat and humidity rise. Winter melon and cucumber are good friends now." },
  { month: 6, day: 5, zh: "芒种", en: "Grain in Ear", seasonBias: -0.2, tip: "Busy, sticky days. Mung bean soup is a classic summer cooler." },
  { month: 6, day: 21, zh: "夏至", en: "Summer Solstice", seasonBias: -0.3, tip: "The longest day. Cooling foods are welcome, but room-temperature drinks beat iced ones." },
  { month: 7, day: 7, zh: "小暑", en: "Minor Heat", seasonBias: -0.3, tip: "Hot weather. Watermelon and bitter melon cool you down; a little ginger protects the stomach." },
  { month: 7, day: 22, zh: "大暑", en: "Major Heat", seasonBias: -0.4, tip: "Peak heat. Eat light, stay hydrated, and don't overdo fried or spicy food." },
  { month: 8, day: 7, zh: "立秋", en: "Start of Autumn", seasonBias: -0.1, tip: "Autumn begins, though the heat lingers. Start easing off raw and cold foods." },
  { month: 8, day: 23, zh: "处暑", en: "End of Heat", seasonBias: 0, tip: "The heat fades and the air gets dry. Pears and honey are traditional autumn picks." },
  { month: 9, day: 7, zh: "白露", en: "White Dew", seasonBias: 0.1, tip: "Mornings turn cool. Cover up, and swap the iced coffee for a warm one." },
  { month: 9, day: 23, zh: "秋分", en: "Autumn Equinox", seasonBias: 0.1, tip: "Balance again, with dry air. Pear, lotus root and sesame keep things moist." },
  { month: 10, day: 8, zh: "寒露", en: "Cold Dew", seasonBias: 0.2, tip: "Cold dew on the grass. Warm soups and cooked meals from here on." },
  { month: 10, day: 23, zh: "霜降", en: "Frost's Descent", seasonBias: 0.3, tip: "First frost. Chestnuts, sweet potatoes and stews are in season." },
  { month: 11, day: 7, zh: "立冬", en: "Start of Winter", seasonBias: 0.3, tip: "Winter begins. Time for nourishing, slow-cooked food." },
  { month: 11, day: 22, zh: "小雪", en: "Minor Snow", seasonBias: 0.4, tip: "Cold settles in. Black tea, ginger and cinnamon warm you up." },
  { month: 12, day: 7, zh: "大雪", en: "Major Snow", seasonBias: 0.4, tip: "Deep cold. Lamb or beef stew with root vegetables is the classic choice." },
  { month: 12, day: 21, zh: "冬至", en: "Winter Solstice", seasonBias: 0.4, tip: "The longest night. Families eat dumplings or tangyuan and keep warm." },
];

// Returns the solar term in effect on the given date (local calendar date).
export function solarTermFor(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  // Walk backwards to the most recent term start on or before the date;
  // before Jan 5 we are still in the previous year's Winter Solstice.
  for (let i = SOLAR_TERMS.length - 1; i >= 0; i--) {
    const term = SOLAR_TERMS[i];
    if (month > term.month || (month === term.month && day >= term.day)) {
      return term;
    }
  }
  return SOLAR_TERMS[SOLAR_TERMS.length - 1];
}
