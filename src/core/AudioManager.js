/**
 * AudioManager.js
 * Synthesizes dynamic, rich procedural sound effects via the Web Audio API
 * with zero external asset dependencies for 100% reliable instant playback in WebXR.
 */

/** Musical Pentatonic frequencies for the 9 puzzle cells (C4, D4, E4, G4, A4, C5, D5, E5, G5) */
const PENTATONIC_SCALE = [
  261.63, // 0: C4
  293.66, // 1: D4
  329.63, // 2: E4
  392.00, // 3: G4
  440.00, // 4: A4
  523.25, // 5: C5
  587.33, // 6: D5
  659.25, // 7: E5
  783.99, // 8: G5
];

export class AudioManager {
  constructor() {
    this._ctx = null;
    this._buffers = {};
    this._muted = false;
    this._lastHoverTime = 0;
  }

  /** Must be called after a user gesture to resume the AudioContext */
  resume() {
    if (!this._ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this._ctx = new AudioContextClass();
      }
    }
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }

  /** Pre-load a sound file if available (optional) */
  async load(key, url) {
    this.resume();
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      this._buffers[key] = await this._ctx.decodeAudioData(buf);
    } catch {
      // Ignored: fallback to procedural synthesizer
    }
  }

  /** Pre-load a set of { key: url } pairs */
  async loadAll(map) {
    await Promise.all(Object.entries(map).map(([k, v]) => this.load(k, v)));
  }

  /** Play a sound effect by key. Falls back to procedural audio synthesis. */
  play(key, options = {}) {
    if (this._muted) return;
    this.resume();
    if (!this._ctx) return;

    // If preloaded audio buffer exists, play it
    if (this._buffers[key]) {
      const src = this._ctx.createBufferSource();
      src.buffer = this._buffers[key];
      src.playbackRate.value = options.rate || 1;
      const gain = this._ctx.createGain();
      gain.gain.value = options.volume !== undefined ? options.volume : 1;
      src.connect(gain).connect(this._ctx.destination);
      src.start();
      return;
    }

    // Procedural sound synthesis
    const now = this._ctx.currentTime;
    const vol = options.volume !== undefined ? options.volume : 1;

    switch (key) {
      case 'sequenceBeep':
        this._synthSequenceBeep(now, options, vol);
        break;
      case 'puzzleTap':
        this._synthPuzzleTap(now, options, vol);
        break;
      case 'click':
      case 'uiClick':
        this._synthClick(now, vol);
        break;
      case 'hover':
        this._synthHover(now, vol);
        break;
      case 'ding':
        this._synthDing(now, vol);
        break;
      case 'chime':
      case 'success':
        this._synthChime(now, vol);
        break;
      case 'buzz':
      case 'fail':
        this._synthBuzz(now, vol);
        break;
      case 'pickup':
        this._synthPickup(now, vol);
        break;
      case 'doorOpen':
        this._synthDoorOpen(now, vol);
        break;
      case 'teleport':
        this._synthTeleport(now, vol);
        break;
      case 'conceptOpen':
        this._synthConceptOpen(now, vol);
        break;
      default:
        this._synthClick(now, vol);
        break;
    }
  }

  // ── Procedural Sound Synthesizers ─────────────────────────────────────────

  /** Sequence display light-up: Warm, resonant, harmonic musical chime */
  _synthSequenceBeep(t, { cellIndex = 0 }, vol) {
    const ctx = this._ctx;
    const freq = PENTATONIC_SCALE[cellIndex % PENTATONIC_SCALE.length] || 440;

    // Primary bell tone (sine)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    // Harmonic overtone (triangle)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t);

    // Warm envelope
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.35 * vol, t + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.12 * vol, t + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc1.connect(gain1).connect(ctx.destination);
    osc2.connect(gain2).connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.4);
    osc2.stop(t + 0.3);
  }

  /** Player puzzle tap: Crisp, punchy, tactile marimba/vibraphone replay chime */
  _synthPuzzleTap(t, { cellIndex = 0 }, vol) {
    const ctx = this._ctx;
    const freq = PENTATONIC_SCALE[cellIndex % PENTATONIC_SCALE.length] || 523.25;

    // Fast transient click (FM pop)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(freq * 3, t);
    clickOsc.frequency.exponentialRampToValueAtTime(freq, t + 0.02);
    clickGain.gain.setValueAtTime(0.4 * vol, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    // Resonant fundamental tone
    const mainOsc = ctx.createOscillator();
    const mainGain = ctx.createGain();
    mainOsc.type = 'sine';
    mainOsc.frequency.setValueAtTime(freq, t);
    mainGain.gain.setValueAtTime(0, t);
    mainGain.gain.linearRampToValueAtTime(0.45 * vol, t + 0.005);
    mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    // Sparkle harmonic overtone
    const harmOsc = ctx.createOscillator();
    const harmGain = ctx.createGain();
    harmOsc.type = 'sine';
    harmOsc.frequency.setValueAtTime(freq * 2.76, t);
    harmGain.gain.setValueAtTime(0.18 * vol, t);
    harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    clickOsc.connect(clickGain).connect(ctx.destination);
    mainOsc.connect(mainGain).connect(ctx.destination);
    harmOsc.connect(harmGain).connect(ctx.destination);

    clickOsc.start(t);
    mainOsc.start(t);
    harmOsc.start(t);
    clickOsc.stop(t + 0.04);
    mainOsc.stop(t + 0.3);
    harmOsc.stop(t + 0.15);
  }

  /** Tactile UI click */
  _synthClick(t, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.035);

    gain.gain.setValueAtTime(0.3 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /** Subtle UI hover tick */
  _synthHover(t, vol) {
    const nowMs = performance.now();
    if (nowMs - this._lastHoverTime < 60) return; // rate-limit rapid hovers
    this._lastHoverTime = nowMs;

    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t);

    gain.gain.setValueAtTime(0.06 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  }

  /** Bright ding confirmation */
  _synthDing(t, vol) {
    const ctx = this._ctx;
    const freqs = [1046.5, 1567.98]; // C6 + G6
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.25 * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    }
  }

  /** Celebratory 4-note ascending major arpeggio fanfare */
  _synthChime(t, vol) {
    const ctx = this._ctx;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const noteTime = t + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.28 * vol, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain).connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.5);
    });
  }

  /** Soft low buzzer / error sound */
  _synthBuzz(t, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    gain.gain.setValueAtTime(0.25 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /** Item pickup pop / rise */
  _synthPickup(t, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);

    gain.gain.setValueAtTime(0.35 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Bin door opening whoosh / unlock */
  _synthDoorOpen(t, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(580, t + 0.22);

    gain.gain.setValueAtTime(0.25 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /** Teleport spatial warp sound */
  _synthTeleport(t, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.28);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3 * vol, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  /** Concept Overlay chord */
  _synthConceptOpen(t, vol) {
    const ctx = this._ctx;
    const freqs = [349.23, 440.0, 523.25]; // F4, A4, C5 major chord
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18 * vol, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    }
  }

  setMuted(val) { this._muted = val; }
}

/** Singleton */
export const audioManager = new AudioManager();

/** Default SFX paths to preload */
export const SFX_MAP = {
  ding:         '/sounds/ding.mp3',
  buzz:         '/sounds/buzz.mp3',
  chime:        '/sounds/chime.mp3',
  sequenceBeep: '/sounds/sequence-beep.mp3',
};
