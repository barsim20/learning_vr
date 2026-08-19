/**
 * GameState.js
 * Central state machine for the BrainDonald's retrieval loop.
 *
 * States:
 *   IDLE         → waiting to start / between orders
 *   ORDER        → customer NPC visible, order displayed
 *   NAVIGATING   → player heading to storage (informational only)
 *   PUZZLE       → player is solving the puzzle on a bin
 *   CARRYING     → player picked up item, heading to delivery station
 *   DELIVERING   → player at delivery station, checking match
 *   RESULT       → brief success/fail feedback before next order
 */

export const STATE = {
  IDLE:        'IDLE',
  ORDER:       'ORDER',
  NAVIGATING:  'NAVIGATING',
  PUZZLE:      'PUZZLE',
  CARRYING:    'CARRYING',
  DELIVERING:  'DELIVERING',
  RESULT:      'RESULT',
};

class GameState {
  constructor() {
    this.current    = STATE.IDLE;
    this.score      = 0;
    this.streak     = 0;

    /** The knowledge item the customer ordered */
    this.activeOrder   = null;   // KnowledgeItem data object

    /** The item the player is currently carrying */
    this.carriedItem   = null;   // KnowledgeItem data object

    /** The bin the player is currently interacting with */
    this.activeBin     = null;   // StorageBin instance

    /** Track concept explanations shown to player */
    this.seenConcepts  = {};     // key -> boolean

    this._listeners = {};
  }

  /** Check if a concept overlay should automatically trigger (first time only) */
  shouldTriggerConcept(key) {
    return !this.seenConcepts[key];
  }

  /** Record that a concept explanation overlay has been shown */
  recordConceptShown(key) {
    this.seenConcepts[key] = true;
    this._emit('conceptShown', { key });
  }

  /** Transition to a new state and fire listeners. */
  transition(newState) {
    const prev = this.current;
    this.current = newState;
    this._emit('change', { from: prev, to: newState });
    this._emit(newState, { from: prev });
  }

  /** Register a callback for a state or 'change' */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }

  _emit(event, data = {}) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  /** Award a point and update streak */
  addScore() {
    this.score++;
    this.streak++;
    this._emit('score', { score: this.score, streak: this.streak });
  }

  /** Reset streak on a wrong delivery */
  breakStreak() {
    this.streak = 0;
    this._emit('score', { score: this.score, streak: this.streak });
  }

  isIn(state) { return this.current === state; }
}

export const gameState = new GameState();
