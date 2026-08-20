/**
 * KnowledgeItem.js
 * A pickable knowledge item — data + 3D mesh.
 * Glows and floats slightly when carried by the player.
 */

import * as THREE from 'three';
import { createTextLabel } from '../utils/TextLabel.js';
import { CATEGORY_COLORS } from '../content/knowledgeDatabase.js';
import { gameState } from '../core/GameState.js';
import { audioManager } from '../core/AudioManager.js';

const _itemCamPos = new THREE.Vector3();
const _itemCamQuat = new THREE.Quaternion();
const _itemOffset = new THREE.Vector3();

export class KnowledgeItem {
  /**
   * @param {object} data          — from knowledgeDatabase.js
   * @param {THREE.Scene} scene
   * @param {InputManager} input
   * @param {Function} onPickup    — called when player picks it up
   */
  constructor(data, scene, input, onPickup) {
    this.data      = data;
    this.scene     = scene;
    this.input     = input;
    this.onPickup  = onPickup;
    this.carried   = false;

    this._bobTime  = 0;
    this._baseY    = 0;

    this._build();
  }

  _build() {
    const color = CATEGORY_COLORS[this.data.category] || 0xffffff;

    // Main box
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.1,
      }),
    );

    // Label sprite above the box
    this._label = createTextLabel(this.data.label, {
      fontSize: 18,
      fontColor: '#ffffff',
      bgColor: 'rgba(0,0,0,0.7)',
      maxWidth: 200,
      worldScale: 0.005,
    });
    this._label.position.y = 0.22;
    this.mesh.add(this._label);

    // Invisible generous padding hitbox around the item for easy pickup
    this.hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    this.mesh.add(this.hitBox);

    // Interaction
    const onSelect = () => this._pickup();
    const onHover  = (_, isHover) => {
      this.mesh.material.emissiveIntensity = isHover ? 0.8 : 0.3;
    };

    this.mesh.userData.onSelect   = onSelect;
    this.mesh.userData.onHover    = onHover;
    this.hitBox.userData.onSelect = onSelect;
    this.hitBox.userData.onHover  = onHover;

    this.scene.add(this.mesh);
    this.input.register(this.mesh);
    this.input.register(this.hitBox);
  }

  /** Place item at a world position */
  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
    this._baseY = y;
  }

  _pickup() {
    if (this.carried) return;
    this.carried = true;
    audioManager.play('pickup');
    this.input.unregister(this.mesh);
    this.input.unregister(this.hitBox);
    this.mesh.material.emissiveIntensity = 1.2;
    gameState._carriedItemRef = this; // so main.js can drive updateCarried
    if (this.onPickup) this.onPickup(this);
  }

  /**
   * When carried, follow the camera/hand with a slight bob.
   * @param {THREE.Camera} camera
   * @param {number} dt  delta time in seconds
   */
  updateCarried(camera, dt) {
    if (!this.carried || !camera) return;
    this._bobTime += dt * 2.5;

    // Offset in front of the camera using true world camera pose
    camera.getWorldPosition(_itemCamPos);
    camera.getWorldQuaternion(_itemCamQuat);
    _itemOffset.set(0.3, -0.3, -0.6).applyQuaternion(_itemCamQuat);

    this.mesh.position.copy(_itemCamPos).add(_itemOffset);
    this.mesh.position.y += Math.sin(this._bobTime) * 0.015;
    this.mesh.rotation.y += dt * 0.8; // slow spin
  }

  /** Gently bob when sitting on a shelf */
  updateIdle(dt) {
    if (this.carried) return;
    this._bobTime += dt;
    this.mesh.position.y = this._baseY + Math.sin(this._bobTime) * 0.008;
  }

  dispose() {
    this.input.unregister(this.mesh);
    this.input.unregister(this.hitBox);
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
