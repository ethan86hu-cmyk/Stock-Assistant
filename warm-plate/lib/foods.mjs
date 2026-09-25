// Food natures (性) from Chinese food therapy (食疗).
// nature: -2 cold (寒), -1 cool (凉), 0 neutral (平), 1 warm (温), 2 hot (热).
// These are common textbook classifications; sources disagree on some foods,
// so treat this table as a starting point to review, not a final authority.
// `traditional: false` marks foods with no classical entry, whose nature is
// an estimate by analogy.

export const FOODS = {
  // Grains & staples
  white_rice: { en: "White rice", zh: "大米", nature: 0 },
  brown_rice: { en: "Brown rice", zh: "糙米", nature: 0 },
  glutinous_rice: { en: "Sticky rice", zh: "糯米", nature: 1 },
  wheat_bread: { en: "Bread / wheat flour", zh: "小麦面食", nature: -1 },
  wheat_noodles: { en: "Wheat noodles / pasta", zh: "面条", nature: -1 },
  oats: { en: "Oats", zh: "燕麦", nature: 0 },
  corn: { en: "Corn", zh: "玉米", nature: 0 },
  millet: { en: "Millet", zh: "小米", nature: -1 },
  job_tears: { en: "Job's tears / pearl barley", zh: "薏米", nature: -1 },
  potato: { en: "Potato", zh: "土豆", nature: 0 },
  sweet_potato: { en: "Sweet potato", zh: "红薯", nature: 0 },
  quinoa: { en: "Quinoa", zh: "藜麦", nature: 0, traditional: false },

  // Vegetables
  cucumber: { en: "Cucumber", zh: "黄瓜", nature: -1 },
  tomato: { en: "Tomato", zh: "番茄", nature: -1 },
  lettuce: { en: "Lettuce / salad greens", zh: "生菜", nature: -1 },
  spinach: { en: "Spinach", zh: "菠菜", nature: -1 },
  celery: { en: "Celery", zh: "芹菜", nature: -1 },
  bitter_melon: { en: "Bitter melon", zh: "苦瓜", nature: -2 },
  winter_melon: { en: "Winter melon", zh: "冬瓜", nature: -1 },
  lotus_root: { en: "Lotus root", zh: "莲藕", nature: -1 },
  eggplant: { en: "Eggplant", zh: "茄子", nature: -1 },
  broccoli: { en: "Broccoli", zh: "西兰花", nature: 0 },
  cabbage: { en: "Cabbage", zh: "卷心菜", nature: 0 },
  bok_choy: { en: "Bok choy", zh: "青菜", nature: 0 },
  carrot: { en: "Carrot", zh: "胡萝卜", nature: 0 },
  mushroom: { en: "Mushrooms", zh: "蘑菇", nature: 0 },
  seaweed: { en: "Seaweed / kelp", zh: "海带", nature: -2 },
  bamboo_shoot: { en: "Bamboo shoots", zh: "竹笋", nature: -2 },
  bean_sprouts: { en: "Bean sprouts", zh: "豆芽", nature: -1 },
  pumpkin: { en: "Pumpkin / squash", zh: "南瓜", nature: 1 },
  onion: { en: "Onion", zh: "洋葱", nature: 1 },
  garlic: { en: "Garlic", zh: "大蒜", nature: 2 },
  ginger: { en: "Ginger", zh: "生姜", nature: 1 },
  scallion: { en: "Scallion / green onion", zh: "葱", nature: 1 },
  chili: { en: "Chili pepper", zh: "辣椒", nature: 2 },
  chinese_chives: { en: "Chinese chives", zh: "韭菜", nature: 1 },
  bell_pepper: { en: "Bell pepper", zh: "甜椒", nature: 1 },
  avocado: { en: "Avocado", zh: "牛油果", nature: 0, traditional: false },

  // Fruits
  watermelon: { en: "Watermelon", zh: "西瓜", nature: -2 },
  banana: { en: "Banana", zh: "香蕉", nature: -2 },
  pear: { en: "Pear", zh: "梨", nature: -1 },
  apple: { en: "Apple", zh: "苹果", nature: 0 },
  orange: { en: "Orange", zh: "橙子", nature: -1 },
  grapefruit: { en: "Grapefruit / pomelo", zh: "柚子", nature: -1 },
  kiwi: { en: "Kiwi", zh: "猕猴桃", nature: -2 },
  mango: { en: "Mango", zh: "芒果", nature: -1 },
  pineapple: { en: "Pineapple", zh: "菠萝", nature: 0 },
  grapes: { en: "Grapes", zh: "葡萄", nature: 0 },
  strawberry: { en: "Strawberries", zh: "草莓", nature: -1 },
  berries: { en: "Blueberries / mixed berries", zh: "蓝莓", nature: 0, traditional: false },
  cherry: { en: "Cherries", zh: "樱桃", nature: 1 },
  lychee: { en: "Lychee", zh: "荔枝", nature: 2 },
  longan: { en: "Longan", zh: "龙眼", nature: 1 },
  peach: { en: "Peach", zh: "桃子", nature: 1 },
  durian: { en: "Durian", zh: "榴莲", nature: 2 },
  persimmon: { en: "Persimmon", zh: "柿子", nature: -2 },
  jujube: { en: "Red dates (jujube)", zh: "红枣", nature: 1 },
  goji: { en: "Goji berries", zh: "枸杞", nature: 0 },
  lemon: { en: "Lemon", zh: "柠檬", nature: -1 },
  coconut: { en: "Coconut", zh: "椰子", nature: 0 },

  // Protein
  chicken: { en: "Chicken", zh: "鸡肉", nature: 1 },
  beef: { en: "Beef", zh: "牛肉", nature: 1 },
  lamb: { en: "Lamb / mutton", zh: "羊肉", nature: 2 },
  pork: { en: "Pork", zh: "猪肉", nature: 0 },
  duck: { en: "Duck", zh: "鸭肉", nature: -1 },
  white_fish: { en: "White fish", zh: "鱼肉", nature: 0 },
  salmon: { en: "Salmon", zh: "三文鱼", nature: 1 },
  shrimp: { en: "Shrimp / prawns", zh: "虾", nature: 1 },
  crab: { en: "Crab", zh: "螃蟹", nature: -2 },
  clams: { en: "Clams / mussels / oysters", zh: "贝类", nature: -1 },
  egg: { en: "Eggs", zh: "鸡蛋", nature: 0 },
  tofu: { en: "Tofu", zh: "豆腐", nature: -1 },
  mung_beans: { en: "Mung beans", zh: "绿豆", nature: -2 },
  black_beans: { en: "Black beans", zh: "黑豆", nature: 0 },
  red_beans: { en: "Red beans (adzuki)", zh: "红豆", nature: 0 },

  // Dairy
  milk: { en: "Milk", zh: "牛奶", nature: 0 },
  yogurt: { en: "Yogurt", zh: "酸奶", nature: -1 },
  cheese: { en: "Cheese", zh: "奶酪", nature: 0, traditional: false },
  soy_milk: { en: "Soy milk", zh: "豆浆", nature: 0 },

  // Drinks
  water: { en: "Water", zh: "水", nature: 0 },
  green_tea: { en: "Green tea / matcha", zh: "绿茶", nature: -1 },
  black_tea: { en: "Black tea", zh: "红茶", nature: 1 },
  coffee: { en: "Coffee", zh: "咖啡", nature: 1, traditional: false },
  beer: { en: "Beer", zh: "啤酒", nature: -1 },
  wine: { en: "Wine / spirits", zh: "酒", nature: 1 },
  soda: { en: "Soda / soft drink", zh: "汽水", nature: -1, traditional: false },
  fruit_juice: { en: "Fruit juice", zh: "果汁", nature: -1, traditional: false },
  ginger_tea: { en: "Ginger tea", zh: "姜茶", nature: 1 },

  // Seasonings & extras
  black_pepper: { en: "Black pepper", zh: "胡椒", nature: 2 },
  cinnamon: { en: "Cinnamon", zh: "肉桂", nature: 2 },
  vinegar: { en: "Vinegar", zh: "醋", nature: 1 },
  white_sugar: { en: "White sugar", zh: "白糖", nature: 0 },
  brown_sugar: { en: "Brown sugar", zh: "红糖", nature: 1 },
  honey: { en: "Honey", zh: "蜂蜜", nature: 0 },
  soy_sauce: { en: "Soy sauce", zh: "酱油", nature: -1 },

  // Snacks & sweets
  ice_cream: { en: "Ice cream", zh: "冰淇淋", nature: -2 },
  chocolate: { en: "Chocolate", zh: "巧克力", nature: 1, traditional: false },
  walnut: { en: "Walnuts", zh: "核桃", nature: 1 },
  peanuts: { en: "Peanuts", zh: "花生", nature: 0 },
  sesame: { en: "Sesame", zh: "芝麻", nature: 0 },
  chestnut: { en: "Chestnuts", zh: "栗子", nature: 1 },
};

export const FOOD_KEYS = Object.keys(FOODS);

export const NATURE_LABELS = {
  "-2": { en: "Cold", zh: "寒" },
  "-1": { en: "Cool", zh: "凉" },
  "0": { en: "Neutral", zh: "平" },
  "1": { en: "Warm", zh: "温" },
  "2": { en: "Hot", zh: "热" },
};

// Names the model uses for foods outside the table.
export const ESTIMATED_NATURE = { cold: -2, cool: -1, neutral: 0, warm: 1, hot: 2 };
