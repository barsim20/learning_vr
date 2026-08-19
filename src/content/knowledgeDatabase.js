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

/** All knowledge items with configured retrieval frequency weights */
export const KNOWLEDGE_ITEMS = [
  // Math
  {
    id: 'math_01',
    category: CATEGORIES.MATH,
    label: '2 + 2 = 4',
    orderLine: 'One Math fact, please! What is two plus two?',
    weight: 5.0, // High frequency: frequent retrieval to demonstrate LTP & fluency scaling
  },
  {
    id: 'math_02',
    category: CATEGORIES.MATH,
    label: '5 × 3 = 15',
    orderLine: 'I need a Math answer! Five times three?',
    weight: 2.0, // Standard / randomized frequency
  },
  {
    id: 'math_03',
    category: CATEGORIES.MATH,
    label: '12 ÷ 4 = 3',
    orderLine: 'Quick — twelve divided by four?',
    weight: 0.6, // Low frequency: rare retrieval to demonstrate forgetting curve
  },

  // Food
  {
    id: 'food_01',
    category: CATEGORIES.FOOD,
    label: 'Bananas grow on plants',
    orderLine: 'Got any Food facts? Where do bananas come from?',
    weight: 5.0, // High frequency: frequent retrieval
  },
  {
    id: 'food_02',
    category: CATEGORIES.FOOD,
    label: 'Oranges have Vitamin C',
    orderLine: 'One Food fact please! What vitamin is in oranges?',
    weight: 2.0, // Standard / randomized frequency
  },
  {
    id: 'food_03',
    category: CATEGORIES.FOOD,
    label: 'Honey never spoils',
    orderLine: 'I need a Food answer! Does honey ever go bad?',
    weight: 0.6, // Low frequency: rare retrieval
  },

  // Sports
  {
    id: 'sports_02',
    category: CATEGORIES.SPORTS,
    label: 'Soccer: 11 players',
    orderLine: 'Quick Sports question — how many players on a soccer team?',
    weight: 5.0, // High frequency: frequent retrieval
  },
  {
    id: 'sports_03',
    category: CATEGORIES.SPORTS,
    label: 'Basketball: 4 quarters',
    orderLine: 'One Sports fact! How many quarters in basketball?',
    weight: 2.0, // Standard / randomized frequency
  },
  {
    id: 'sports_01',
    category: CATEGORIES.SPORTS,
    label: 'FC Bayern München won',
    orderLine: 'Sports fact please! Tell me about FC Bayern München!',
    weight: 0.6, // Low frequency: rare retrieval
  },
];

/** Get all items for a given category */
export function getItemsByCategory(category) {
  return KNOWLEDGE_ITEMS.filter(item => item.category === category);
}

/** Get a weighted random item from the pool, avoiding immediate repetition if possible */
export function getRandomItem(excludeId = null) {
  const pool = excludeId ? KNOWLEDGE_ITEMS.filter(i => i.id !== excludeId) : KNOWLEDGE_ITEMS;
  const list = pool.length > 0 ? pool : KNOWLEDGE_ITEMS;
  return sampleWeighted(list);
}

/** Get a weighted random item from a specific category */
export function getRandomItemByCategory(category) {
  const items = getItemsByCategory(category);
  return sampleWeighted(items);
}

/** Helper: sample an item from a list using its `weight` property */
function sampleWeighted(items) {
  if (!items || items.length === 0) return null;
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1.0), 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    const w = item.weight || 1.0;
    if (random < w) {
      return item;
    }
    random -= w;
  }
  return items[items.length - 1];
}
