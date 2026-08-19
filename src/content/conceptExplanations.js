/**
 * conceptExplanations.js
 * Neuropsychology memory concept data map for BrainDonald's learning overlays.
 *
 * Keys correspond to game interaction events:
 * - customer_order
 * - storage_search
 * - bin_working_memory
 * - puzzle_effortful_retrieval
 * - puzzle_ltp
 * - puzzle_forgetting
 * - puzzle_spacing
 * - deliver_successful_recall
 * - deliver_wrong_forgetting
 */

export const CONCEPT_EXPLANATIONS = {
  customer_order: {
    key: 'customer_order',
    concept: 'Retrieval Cue',
    scenario: "This is your customer stating their order!",
    explanation: "That's a retrieval cue — a hint that tells your brain what to go find.",
    icon: '💡',
  },
  storage_search: {
    key: 'storage_search',
    concept: 'Directed Attention & Memory Search',
    scenario: "Great job finding the right storage aisle!",
    explanation: "You're searching your memory — like walking through a library in your head.",
    icon: '🔍',
  },
  bin_working_memory: {
    key: 'bin_working_memory',
    concept: 'Working Memory',
    scenario: "You're opening the storage bin for the order!",
    explanation: "Your brain is holding this idea active for a few seconds, like a sticky note.",
    icon: '📝',
  },
  puzzle_effortful_retrieval: {
    key: 'puzzle_effortful_retrieval',
    concept: 'Effortful Retrieval',
    scenario: "You just solved the puzzle lock on the bin!",
    explanation: "That felt a little hard on purpose — struggling to remember makes the memory stronger.",
    icon: '💪',
  },
  puzzle_ltp: {
    key: 'puzzle_ltp',
    concept: 'Testing Effect & LTP',
    scenario: "You unlocked this bin even faster this time!",
    explanation: "Every time you find it again, the path in your brain gets faster and stronger.",
    icon: '⚡',
  },
  puzzle_forgetting: {
    key: 'puzzle_forgetting',
    concept: 'Forgetting Curve',
    scenario: "This bin reset after being left untouched!",
    explanation: "Skip it too long and it fades — brains forget things they don't use.",
    icon: '📉',
  },
  puzzle_spacing: {
    key: 'puzzle_spacing',
    concept: 'Spacing Effect',
    scenario: "You unlocked this bin right before it reset!",
    explanation: "Catching it right before you forget makes it stick even better next time.",
    icon: '🌊',
  },
  deliver_successful_recall: {
    key: 'deliver_successful_recall',
    concept: 'Successful Recall',
    scenario: "Awesome job delivering the correct order!",
    explanation: "You just completed the loop: cue → search → remember → use it.",
    icon: '✅',
  },
  deliver_wrong_forgetting: {
    key: 'deliver_wrong_forgetting',
    concept: 'Complete Forgetting',
    scenario: "Oops, that was the wrong order!",
    explanation: "Nobody asked for this one in a long time, so it's gone now — that's real forgetting.",
    icon: '🗑️',
  },
};
