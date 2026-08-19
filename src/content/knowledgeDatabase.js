/**
 * knowledgeDatabase.js
 * All knowledge items organized by category.
 * Each item has: id, category, label (fact shown on bin), question, binIndex
 */

export const CATEGORIES = {
  MATH: 'math',
  FOOD: 'food',
  SPORTS: 'sports',
};

export const CATEGORY_COLORS = {
  [CATEGORIES.MATH]:   0xffd166, // yellow
  [CATEGORIES.FOOD]:   0x06d6a0, // green
  [CATEGORIES.SPORTS]: 0x118ab2, // blue
};

export const CATEGORY_LABELS = {
  [CATEGORIES.MATH]:   'Math',
  [CATEGORIES.FOOD]:   'Food',
  [CATEGORIES.SPORTS]: 'Sports',
};

/** All knowledge items */
export const KNOWLEDGE_ITEMS = [
  // Math
  {
    id: 'math_01',
    category: CATEGORIES.MATH,
    label: '2 + 2 = 4',
    orderLine: 'One Math fact, please! What is two plus two?',
  },
  {
    id: 'math_02',
    category: CATEGORIES.MATH,
    label: '5 × 3 = 15',
    orderLine: 'I need a Math answer! Five times three?',
  },
  {
    id: 'math_03',
    category: CATEGORIES.MATH,
    label: '12 ÷ 4 = 3',
    orderLine: 'Quick — twelve divided by four?',
  },

  // Food
  {
    id: 'food_01',
    category: CATEGORIES.FOOD,
    label: 'Bananas grow on plants',
    orderLine: 'Got any Food facts? Where do bananas come from?',
  },
  {
    id: 'food_02',
    category: CATEGORIES.FOOD,
    label: 'Oranges have Vitamin C',
    orderLine: 'One Food fact please! What vitamin is in oranges?',
  },
  {
    id: 'food_03',
    category: CATEGORIES.FOOD,
    label: 'Honey never spoils',
    orderLine: 'I need a Food answer! Does honey ever go bad?',
  },

  // Sports
  {
    id: 'sports_01',
    category: CATEGORIES.SPORTS,
    label: 'FC Bayern München won',
    orderLine: 'Sports fact please! Tell me about FC Bayern München!',
  },
  {
    id: 'sports_02',
    category: CATEGORIES.SPORTS,
    label: 'Soccer: 11 players',
    orderLine: 'Quick Sports question — how many players on a soccer team?',
  },
  {
    id: 'sports_03',
    category: CATEGORIES.SPORTS,
    label: 'Basketball: 4 quarters',
    orderLine: 'One Sports fact! How many quarters in basketball?',
  },
];

/** Get all items for a given category */
export function getItemsByCategory(category) {
  return KNOWLEDGE_ITEMS.filter(item => item.category === category);
}

/** Get a random item from the full pool */
export function getRandomItem() {
  return KNOWLEDGE_ITEMS[Math.floor(Math.random() * KNOWLEDGE_ITEMS.length)];
}

/** Get a random item from a specific category */
export function getRandomItemByCategory(category) {
  const items = getItemsByCategory(category);
  return items[Math.floor(Math.random() * items.length)];
}
