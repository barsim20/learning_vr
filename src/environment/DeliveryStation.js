/**
 * DeliveryStation.js
 * The drop-off point where players deliver carried knowledge items.
 * Checks that the item matches the active order, updates score.
 */

import * as THREE from 'three';
import { gameState, STATE } from '../core/GameState.js';
import { voiceManager } from '../core/VoiceManager.js';
import { audioManager } from '../core/AudioManager.js';
import { Scoreboard } from '../ui/Scoreboard.js';
import { createTextLabel } from '../utils/TextLabel.js';
import { conceptOverlayManager } from '../ui/ConceptOverlayManager.js';

export class DeliveryStation {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} position
   * @param {InputManager} input
   */
  constructor(scene, position, input) {
    this.scene = scene;
    this.input = input;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    this._build();
    this._scoreboard = new Scoreboard(this.group, new THREE.Vector3(0, 2.55, 0));

    // React to score changes
    gameState.on('score', data => this._scoreboard.update(data));

    // Enable/disable based on game state
    gameState.on('change', ({ to }) => {
      const onDeliverHandler = to === STATE.CARRYING ? () => this._onDeliver() : null;
      this._platform.userData.onSelect = onDeliverHandler;
      if (this._hitBox) this._hitBox.userData.onSelect = onDeliverHandler;
      if (this._label) this._label.userData.onSelect = onDeliverHandler;

      // Visual cue — glow when player is carrying
      this._platform.material.emissiveIntensity = to === STATE.CARRYING ? 0.5 : 0;
    });
  }

  _build() {
    // Platform base (Enlarged for easy targeting)
    this._platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.12, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xffd166,
        emissiveIntensity: 0,
        roughness: 0.4,
      }),
    );
    this._platform.position.y = 1.05;
    this._platform.castShadow = true;
    this.group.add(this._platform);

    // Large double-sided invisible hit box volume centered on platform
    const hitBox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.8, 16),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    hitBox.position.set(0, 0, 0);
    this._platform.add(hitBox);
    this._hitBox = hitBox;

    // Station pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 1.0, 16),
      new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.6 }),
    );
    pedestal.position.y = 0.5;
    this.group.add(pedestal);

    // "DELIVER HERE" label
    const label = createTextLabel('DELIVER HERE', {
      fontSize: 22,
      fontColor: '#1a0a00',
      bgColor: 'rgba(255,209,102,0.9)',
      worldScale: 0.006,
    });
    label.position.set(0, 1.35, 0);
    this.group.add(label);
    this._label = label;

    // Register for input
    const onSelect = () => this._onDeliver();
    const onHover  = (_, isHover) => {
      if (gameState.isIn(STATE.CARRYING)) {
        this._platform.material.emissiveIntensity = isHover ? 1.0 : 0.5;
      }
    };

    this._platform.userData.onSelect = onSelect;
    this._platform.userData.onHover  = onHover;
    hitBox.userData.onSelect         = onSelect;
    hitBox.userData.onHover          = onHover;
    label.userData.onSelect          = onSelect;
    label.userData.onHover           = onHover;

    this.input.register(this._platform);
    this.input.register(hitBox);
    this.input.register(label);
  }

  _onDeliver() {
    if (!gameState.isIn(STATE.CARRYING)) return;
    if (!gameState.carriedItem || !gameState.activeOrder) return;

    gameState.transition(STATE.DELIVERING);

    const isCorrect = gameState.carriedItem.id === gameState.activeOrder.id;

    const conceptKey = isCorrect ? 'deliver_successful_recall' : 'deliver_wrong_forgetting';

    if (isCorrect) {
      gameState.addScore();
      voiceManager.play('deliver_success');
      audioManager.play('chime');
      this._celebrate();
    } else {
      gameState.breakStreak();
      voiceManager.play('deliver_wrong');
      audioManager.play('buzz');
      this._wrongFlash();
    }

    const finalizeDelivery = () => {
      // Clean up the carried item mesh
      if (gameState._carriedItemRef) {
        gameState._carriedItemRef.dispose();
        gameState._carriedItemRef = null;
      }
      gameState.carriedItem   = null;
      gameState.activeOrder   = null;
      gameState.transition(STATE.RESULT);
    };

    if (gameState.shouldTriggerConcept(conceptKey)) {
      conceptOverlayManager.trigger(conceptKey, () => {
        finalizeDelivery();
      });
    } else {
      setTimeout(() => {
        finalizeDelivery();
      }, 1400);
    }
  }

  _celebrate() {
    // Bounce the platform
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 600;
      if (t > 1) { this._platform.position.y = 1.05; return; }
      this._platform.position.y = 1.05 + Math.sin(t * Math.PI) * 0.15;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  _wrongFlash() {
    this._platform.material.color.setHex(0xe63946);
    setTimeout(() => this._platform.material.color.setHex(0xffd166), 500);
  }
}
