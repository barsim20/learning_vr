/**
 * AudioManager.js
 * Manages short SFX playback via Web Audio API.
 */

export class AudioManager {
  constructor() {
    this._ctx = null;
    this._buffers = {};
    this._muted = false;
  }

  /** Must be called once after a user gesture (browser autoplay policy). */
  resume() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
  }

  /** Pre-load a sound file. key = identifier, url = path under /public */
  async load(key, url) {
    this.resume();
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      this._buffers[key] = await this._ctx.decodeAudioData(buf);
    } catch {
      // file missing — silently ignore
    }
  }

  /** Pre-load a set of { key: url } pairs */
  async loadAll(map) {
    await Promise.all(Object.entries(map).map(([k, v]) => this.load(k, v)));
  }

  /** Play a loaded sound by key. Returns immediately (fire-and-forget). */
  play(key, { volume = 1, rate = 1 } = {}) {
    if (this._muted || !this._buffers[key] || !this._ctx) return;
    const src = this._ctx.createBufferSource();
    src.buffer = this._buffers[key];
    src.playbackRate.value = rate;
    const gain = this._ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this._ctx.destination);
    src.start();
  }

  setMuted(val) { this._muted = val; }
}

/** Singleton */
export const audioManager = new AudioManager();

/** Default SFX paths to preload */
export const SFX_MAP = {
  ding:           '/sounds/ding.mp3',
  buzz:           '/sounds/buzz.mp3',
  chime:          '/sounds/chime.mp3',
  sequenceBeep:   '/sounds/sequence-beep.mp3',
};
