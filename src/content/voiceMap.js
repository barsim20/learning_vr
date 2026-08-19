/**
 * voiceMap.js
 * Maps game events to arrays of voice file paths under /voice/.
 * VoiceManager picks randomly when multiple variants exist.
 *
 * USAGE: Drop your recorded .mp3 files into public/voice/<folder>/
 * following the naming convention below, then they'll be auto-picked.
 *
 * If a file doesn't exist yet the VoiceManager will silently skip it —
 * so you can add files incrementally without breaking the build.
 */

export const VOICE_MAP = {
  // --- Narrator ---
  welcome: [
    '/voice/narrator/welcome_01.mp3',
    '/voice/narrator/welcome_02.mp3',
  ],
  hint_storage: [
    '/voice/narrator/hint_storage_01.mp3',
  ],
  hint_deliver: [
    '/voice/narrator/hint_deliver_01.mp3',
  ],

  // --- Customer orders (per category) ---
  order_math: [
    '/voice/orders/order_math_01.mp3',
    '/voice/orders/order_math_02.mp3',
  ],
  order_food: [
    '/voice/orders/order_food_01.mp3',
    '/voice/orders/order_food_02.mp3',
  ],
  order_sports: [
    '/voice/orders/order_sports_01.mp3',
    '/voice/orders/order_sports_02.mp3',
  ],

  // --- Puzzle ---
  puzzle_start: [
    '/voice/puzzle/puzzle_start_01.mp3',
  ],
  puzzle_fail: [
    '/voice/puzzle/puzzle_fail_01.mp3',
    '/voice/puzzle/puzzle_fail_02.mp3',
  ],
  puzzle_success: [
    '/voice/puzzle/puzzle_success_01.mp3',
    '/voice/puzzle/puzzle_success_02.mp3',
  ],

  // --- Delivery ---
  deliver_success: [
    '/voice/delivery/deliver_success_01.mp3',
    '/voice/delivery/deliver_success_02.mp3',
  ],
  deliver_wrong: [
    '/voice/delivery/deliver_wrong_01.mp3',
  ],
  deliver_streak: [
    '/voice/delivery/deliver_streak_01.mp3',
  ],
};

/**
 * Build a lookup key from a base event + optional category suffix.
 * e.g. getVoiceKey('order', 'math') => 'order_math'
 */
export function getVoiceKey(event, category = null) {
  return category ? `${event}_${category}` : event;
}
