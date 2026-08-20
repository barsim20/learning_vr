/**
 * MemoryPuzzle.js
 * A 3×3 grid light-sequence puzzle attached to a storage bin door.
 *
 * Difficulty (squares that light up) scales DOWN with retrievalCount.
 * Sequence resets when the forgetting timer expires.
 *
 * Callbacks:
 *   onSuccess()  — called when player replicates the sequence correctly
 *   onFail()     — called when player taps a wrong square
 */

import * as THREE from 'three';
import { audioManager } from '../core/AudioManager.js';
import { voiceManager } from '../core/VoiceManager.js';
import { conceptOverlayManager } from '../ui/ConceptOverlayManager.js';

const SEQUENCE_LENGTH_BY_COUNT = [5, 4, 3, 2, 1]; // indexed by retrievalCount (clamped to array length)
const SHOW_INTERVAL_MS   = 600;  // ms between each square lighting up during show phase
const LIT_DURATION_MS    = 400;  // ms a square stays lit
const FORGET_TIMEOUT_MS  = 60_000; // 60s — reset difficulty after this long

const COLOR_DEFAULT  = 0x333333;
const COLOR_LIT      = 0xffd166; // golden
const COLOR_SUCCESS  = 0x06d6a0; // green
const COLOR_FAIL     = 0xe63946; // red
const COLOR_HOVER    = 0x888888;

export class MemoryPuzzle {
  /**
   * @param {THREE.Object3D} parent   object to attach the grid to
   * @param {InputManager}   input
   * @param {{ onSuccess: Function, onFail: Function }} callbacks
   */
  constructor(parent, input, callbacks = {}) {
    this.parent   = parent;
    this.input    = input;
    this.onSuccess = callbacks.onSuccess || (() => {});
    this.onFail    = callbacks.onFail    || (() => {});

    this.retrievalCount   = 0;
    this._forgetTimer     = null;
    this._sequence        = [];   // array of cell indices (0-8)
    this._playerInput     = [];   // player's taps so far
    this._phase           = 'idle'; // 'idle' | 'showing' | 'input'
    this._cells           = [];   // THREE.Mesh[9]
    this._hitBoxes        = [];

    this.group = new THREE.Group();
    parent.add(this.group);

    this._buildGrid();
    this.hide();
  }

  // ── Grid construction ──────────────────────────────────────────────────

  _buildGrid() {
    const size   = 0.20;
    const gap    = 0.04;
    const step   = size + gap;

    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);

      const cell = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, 0.04),
        new THREE.MeshStandardMaterial({ color: COLOR_DEFAULT, roughness: 0.5, emissive: 0x000000, emissiveIntensity: 0 }),
      );
      cell.position.set(
        (col - 1) * step,
        (1 - row) * step,
        0,
      );
      cell.userData.cellIndex = i;

      // Hover / select handlers wired through InputManager
      const onHover = (_, isHover) => {
        if (this._phase !== 'input') return;
        cell.material.color.setHex(isHover ? COLOR_HOVER : COLOR_DEFAULT);
      };
      const onSelect = () => {
        if (this._phase !== 'input') return;
        this._handlePlayerTap(i, cell);
      };

      cell.userData.onHover = onHover;
      cell.userData.onSelect = onSelect;

      // Centered invisible hitbox volume covering the cell and inter-tile margin
      const cellHitBox = new THREE.Mesh(
        new THREE.BoxGeometry(step, step, 0.08),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      cellHitBox.position.set(0, 0, 0);
      cellHitBox.userData.cellIndex = i;
      cellHitBox.userData.onHover = onHover;
      cellHitBox.userData.onSelect = onSelect;

      cell.add(cellHitBox);

      this.input.register(cell);
      this.input.register(cellHitBox);
      this._cells.push(cell);
      this._hitBoxes.push(cellHitBox);
      this.group.add(cell);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  show() {
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
    this._phase = 'idle';
  }

  /** Start a new round. Generates sequence based on current retrievalCount. */
  start() {
    this.show();
    this._resetCellColors();
    this._generateSequence();
    this._phase = 'showing';
    this._showSequence().then(() => {
      if (this._phase === 'showing') {
        this._phase = 'input';
        this._playerInput = [];
      }
    });
    voiceManager.play('puzzle_start');
  }

  // ── Sequence generation ────────────────────────────────────────────────

  _generateSequence() {
    const len = SEQUENCE_LENGTH_BY_COUNT[
      Math.min(this.retrievalCount, SEQUENCE_LENGTH_BY_COUNT.length - 1)
    ];
    const indices = Array.from({ length: 9 }, (_, i) => i);
    // shuffle and take `len`
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this._sequence = indices.slice(0, len);
  }

  // ── Show phase ─────────────────────────────────────────────────────────

  async _showSequence() {
    for (const idx of this._sequence) {
      await this._lightCell(idx);
      await this._delay(SHOW_INTERVAL_MS - LIT_DURATION_MS);
    }
  }

  _lightCell(idx) {
    return new Promise(resolve => {
      const cell = this._cells[idx];
      cell.material.color.setHex(COLOR_LIT);
      cell.material.emissive.setHex(COLOR_LIT);
      cell.material.emissiveIntensity = 1;
      audioManager.play('sequenceBeep', { cellIndex: idx });

      setTimeout(() => {
        cell.material.color.setHex(COLOR_DEFAULT);
        cell.material.emissive.setHex(0x000000);
        cell.material.emissiveIntensity = 0;
        resolve();
      }, LIT_DURATION_MS);
    });
  }

  // ── Input phase ────────────────────────────────────────────────────────

  _handlePlayerTap(idx, cell) {
    const expected = this._sequence[this._playerInput.length];

    if (idx === expected) {
      // Correct tap: play satisfying responsive marimba/vibraphone tap tone
      cell.material.color.setHex(COLOR_SUCCESS);
      cell.material.emissive.setHex(COLOR_SUCCESS);
      cell.material.emissiveIntensity = 0.5;
      audioManager.play('puzzleTap', { cellIndex: idx });
      this._playerInput.push(idx);

      setTimeout(() => {
        cell.material.color.setHex(COLOR_DEFAULT);
        cell.material.emissive.setHex(0x000000);
        cell.material.emissiveIntensity = 0;
      }, 300);

      if (this._playerInput.length === this._sequence.length) {
        this._onComplete(true);
      }
    } else {
      // Wrong tap
      this._flashAll(COLOR_FAIL);
      audioManager.play('buzz');
      voiceManager.play('puzzle_fail');
      this._phase = 'idle';
      setTimeout(() => this.onFail(), 800);
    }
  }

  _onComplete(success) {
    this._phase = 'idle';
    this._flashAll(COLOR_SUCCESS);
    audioManager.play('chime');
    voiceManager.play('puzzle_success');

    // Trigger concept overlay based on retrieval milestone
    const now = performance.now();
    const timeSinceLast = this._lastRetrievalTime ? (now - this._lastRetrievalTime) : 0;
    this._lastRetrievalTime = now;

    if (timeSinceLast > 45000 && timeSinceLast < FORGET_TIMEOUT_MS) {
      conceptOverlayManager.trigger('puzzle_spacing', this.group, new THREE.Vector3(0, 0.5, 0));
    } else if (this.retrievalCount === 0) {
      conceptOverlayManager.trigger('puzzle_effortful_retrieval', this.group, new THREE.Vector3(0, 0.5, 0));
    } else {
      conceptOverlayManager.trigger('puzzle_ltp', this.group, new THREE.Vector3(0, 0.5, 0));
    }

    // Update retrieval tracking
    this.retrievalCount++;
    this._resetForgetTimer();

    setTimeout(() => {
      this.hide();
      this.onSuccess();
    }, 700);
  }

  // ── Forgetting timer ────────────────────────────────────────────────────

  _resetForgetTimer() {
    clearTimeout(this._forgetTimer);
    this._forgetTimer = setTimeout(() => {
      if (this.retrievalCount > 0) {
        conceptOverlayManager.trigger('puzzle_forgetting', this.group, new THREE.Vector3(0, 0.5, 0));
      }
      this.retrievalCount = 0; // forgotten — reset difficulty
    }, FORGET_TIMEOUT_MS);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  _resetCellColors() {
    this._cells.forEach(c => {
      c.material.color.setHex(COLOR_DEFAULT);
      c.material.emissive.setHex(0x000000);
      c.material.emissiveIntensity = 0;
    });
  }

  _flashAll(color) {
    this._cells.forEach(c => {
      c.material.color.setHex(color);
      c.material.emissive.setHex(color);
      c.material.emissiveIntensity = 0.5;
    });
    setTimeout(() => this._resetCellColors(), 600);
  }

  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  dispose() {
    clearTimeout(this._forgetTimer);
    this._cells.forEach(c => this.input.unregister(c));
    this._hitBoxes.forEach(hb => this.input.unregister(hb));
  }
}
