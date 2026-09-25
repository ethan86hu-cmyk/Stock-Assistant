// The 24 solar terms (二十四节气), with the usual Gregorian start date.
// Real dates drift by about a day from year to year; that is close enough
// for seasonal food tips. Northern Hemisphere only for now.
//
// seasonBias nudges the target warmth of a meal: positive in the cold half of
// the year (eat warmer), negative in the hottest weeks (eat cooler).

export const SOLAR_TERMS = [
  { month: 1, day: 5, zh: "小寒", en: "Minor Cold", seasonBias: 0.4, tip: "Deep winter. Slow-cooked soups, lamb, ginger and red dates keep you warm from the inside.", tip_zh: "深冬时节。多喝慢炖的汤，羊肉、生姜、红枣都能从里暖到外。" },
  { month: 1, day: 20, zh: "大寒", en: "Major Cold", seasonBias: 0.4, tip: "The coldest weeks. Skip iced drinks entirely and keep your feet warm.", tip_zh: "一年最冷的时候。冰饮彻底别碰，脚要保暖。" },
  { month: 2, day: 4, zh: "立春", en: "Start of Spring", seasonBias: 0.2, tip: "Spring begins. Add fresh sprouts and scallions, but the weather is still cold, so keep meals cooked.", tip_zh: "春天开始了。可以加些豆芽、葱这类生发的菜，但天还冷，饭菜尽量吃熟的。" },
  { month: 2, day: 19, zh: "雨水", en: "Rain Water", seasonBias: 0.2, tip: "Damp weather arrives. Easy on raw and greasy food; congee and millet are kind to the stomach.", tip_zh: "湿气来了。少吃生冷油腻，喝点粥、吃点小米，对胃好。" },
  { month: 3, day: 5, zh: "惊蛰", en: "Awakening of Insects", seasonBias: 0.1, tip: "Spring stirs. Pears and lightly cooked greens suit the season.", tip_zh: "万物复苏。梨和清炒的青菜很应季。" },
  { month: 3, day: 20, zh: "春分", en: "Spring Equinox", seasonBias: 0, tip: "Day and night in balance. Aim for a balanced plate: mix cooling and warming foods.", tip_zh: "昼夜平分。饭菜讲究平衡，寒凉和温热的搭配着吃。" },
  { month: 4, day: 4, zh: "清明", en: "Clear and Bright", seasonBias: 0, tip: "Fresh spring greens are at their best. Keep portions of cold food modest.", tip_zh: "春天的青菜正当季，生冷的东西适量就好。" },
  { month: 4, day: 20, zh: "谷雨", en: "Grain Rain", seasonBias: 0, tip: "Humid spring. Job's tears and red beans help with that heavy, damp feeling.", tip_zh: "春末潮湿。薏米、红豆能帮你去去身上的湿重感。" },
  { month: 5, day: 5, zh: "立夏", en: "Start of Summer", seasonBias: -0.1, tip: "Summer begins. Lighter meals, but avoid jumping straight to iced drinks.", tip_zh: "夏天开始了。饮食清淡些，但别一下子就喝冰的。" },
  { month: 5, day: 21, zh: "小满", en: "Grain Buds", seasonBias: -0.1, tip: "Heat and humidity rise. Winter melon and cucumber are good friends now.", tip_zh: "又热又潮。冬瓜、黄瓜是这时候的好帮手。" },
  { month: 6, day: 5, zh: "芒种", en: "Grain in Ear", seasonBias: -0.2, tip: "Busy, sticky days. Mung bean soup is a classic summer cooler.", tip_zh: "忙碌闷热的日子。绿豆汤是经典的消暑饮品。" },
  { month: 6, day: 21, zh: "夏至", en: "Summer Solstice", seasonBias: -0.3, tip: "The longest day. Cooling foods are welcome, but room-temperature drinks beat iced ones.", tip_zh: "一年白天最长的一天。可以吃些凉性食物，但常温饮料比冰饮好。" },
  { month: 7, day: 7, zh: "小暑", en: "Minor Heat", seasonBias: -0.3, tip: "Hot weather. Watermelon and bitter melon cool you down; a little ginger protects the stomach.", tip_zh: "天热了。西瓜、苦瓜能降暑，配一点生姜护胃。" },
  { month: 7, day: 22, zh: "大暑", en: "Major Heat", seasonBias: -0.4, tip: "Peak heat. Eat light, stay hydrated, and don't overdo fried or spicy food.", tip_zh: "一年最热的时候。吃得清淡，多补水，少吃油炸和辛辣。" },
  { month: 8, day: 7, zh: "立秋", en: "Start of Autumn", seasonBias: -0.1, tip: "Autumn begins, though the heat lingers. Start easing off raw and cold foods.", tip_zh: "秋天开始了，但暑热还没退。慢慢少吃生冷。" },
  { month: 8, day: 23, zh: "处暑", en: "End of Heat", seasonBias: 0, tip: "The heat fades and the air gets dry. Pears and honey are traditional autumn picks.", tip_zh: "暑气渐消，空气变干。梨和蜂蜜是传统的秋季选择。" },
  { month: 9, day: 7, zh: "白露", en: "White Dew", seasonBias: 0.1, tip: "Mornings turn cool. Cover up, and swap the iced coffee for a warm one.", tip_zh: "早晚转凉。注意添衣，冰咖啡换成热的。" },
  { month: 9, day: 23, zh: "秋分", en: "Autumn Equinox", seasonBias: 0.1, tip: "Balance again, with dry air. Pear, lotus root and sesame keep things moist.", tip_zh: "昼夜再次平分，空气干燥。梨、莲藕、芝麻能润燥。" },
  { month: 10, day: 8, zh: "寒露", en: "Cold Dew", seasonBias: 0.2, tip: "Cold dew on the grass. Warm soups and cooked meals from here on.", tip_zh: "露水带了寒意。从现在起多喝热汤，饭菜吃熟的。" },
  { month: 10, day: 23, zh: "霜降", en: "Frost's Descent", seasonBias: 0.3, tip: "First frost. Chestnuts, sweet potatoes and stews are in season.", tip_zh: "开始下霜。栗子、红薯、炖菜正当季。" },
  { month: 11, day: 7, zh: "立冬", en: "Start of Winter", seasonBias: 0.3, tip: "Winter begins. Time for nourishing, slow-cooked food.", tip_zh: "冬天开始了。是时候吃些滋补、慢炖的饭菜。" },
  { month: 11, day: 22, zh: "小雪", en: "Minor Snow", seasonBias: 0.4, tip: "Cold settles in. Black tea, ginger and cinnamon warm you up.", tip_zh: "寒意渐深。红茶、生姜、肉桂能帮你暖身。" },
  { month: 12, day: 7, zh: "大雪", en: "Major Snow", seasonBias: 0.4, tip: "Deep cold. Lamb or beef stew with root vegetables is the classic choice.", tip_zh: "天寒地冻。羊肉或牛肉炖根茎类蔬菜，是经典的选择。" },
  { month: 12, day: 21, zh: "冬至", en: "Winter Solstice", seasonBias: 0.4, tip: "The longest night. Families eat dumplings or tangyuan and keep warm.", tip_zh: "一年夜最长的一天。家家吃饺子或汤圆，注意保暖。" },
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
