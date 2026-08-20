/**
 * SpeechBubble.js
 * A 3D speech bubble that floats above an object.
 * Built from a canvas-texture sprite + a stem triangle mesh.
 */

import * as THREE from 'three';
import { createTextLabel } from '../utils/TextLabel.js';

const _bubbleCamPos = new THREE.Vector3();

export class SpeechBubble {
  /**
   * @param {THREE.Object3D} parent  object to attach above
   * @param {number} yOffset         height above parent origin
   */
  constructor(parent, yOffset = 0.6) {
    this.parent  = parent;
    this.yOffset = yOffset;
    this._sprite = null;

    this.group = new THREE.Group();
    parent.add(this.group);
    this.group.position.y = yOffset;

    this.hide();
  }

  /** Show with text */
  show(text) {
    // Remove old sprite
    if (this._sprite) {
      this.group.remove(this._sprite);
      this._sprite.material.map.dispose();
      this._sprite.material.dispose();
    }

    this._sprite = createTextLabel(text, {
      fontSize: 22,
      fontColor: '#1a0a00',
      bgColor: '#ffffff',
      maxWidth: 240,
      worldScale: 0.007,
    });
    this._sprite.position.y = 0.1;
    this.group.add(this._sprite);
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  /** Face the camera each frame */
  update(camera) {
    if (!this.group.visible || !camera) return;
    camera.getWorldPosition(_bubbleCamPos);
    this.group.lookAt(_bubbleCamPos);
  }
}
