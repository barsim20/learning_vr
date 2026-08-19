/**
 * VoiceManager.js
 * Plays pre-recorded voice lines from public/voice/.
 * Picks randomly when multiple variants exist for an event.
 * Missing files are silently skipped.
 */

import { VOICE_MAP, getVoiceKey } from '../content/voiceMap.js';

class VoiceManager {
  constructor() {
    this._current = null; // currently playing Audio element
    this._muted = false;
  }

  /**
   * Play a voice event, optionally qualified by category.
   * @param {string} event   e.g. 'order', 'puzzle_fail', 'deliver_success'
   * @param {string} [category]  e.g. 'math', 'food', 'sports'
   * @returns {Promise<void>} resolves when playback ends (or skipped)
   */
  play(event, category = null) {
    if (this._muted) return Promise.resolve();

    const key = getVoiceKey(event, category);
    const variants = VOICE_MAP[key];
    if (!variants || variants.length === 0) return Promise.resolve();

    // Stop any currently playing voice line
    this.stop();

    const path = variants[Math.floor(Math.random() * variants.length)];
    const audio = new Audio(path);
    audio.volume = 0.9;
    this._current = audio;

    return new Promise(resolve => {
      audio.addEventListener('ended', () => { this._current = null; resolve(); }, { once: true });
      audio.addEventListener('error', () => { this._current = null; resolve(); }, { once: true });
      audio.play().catch(() => { this._current = null; resolve(); });
    });
  }

  /** Stop the currently playing voice line immediately. */
  stop() {
    if (this._current) {
      this._current.pause();
      this._current.currentTime = 0;
      this._current = null;
    }
  }

  setMuted(val) {
    this._muted = val;
    if (val) this.stop();
  }
}

export const voiceManager = new VoiceManager();
