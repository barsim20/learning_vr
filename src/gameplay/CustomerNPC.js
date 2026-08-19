/**
 * CustomerNPC.js
 * A simple, friendly, kid-appropriate customer character.
 * Shows a speech bubble with the order, plays a voice line.
 */

import * as THREE from 'three';
import { SpeechBubble } from '../ui/SpeechBubble.js';
import { voiceManager } from '../core/VoiceManager.js';

export class CustomerNPC {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} position  world position (feet level)
   */
  constructor(scene, position) {
    this.scene  = scene;
    this._bobTime = 0;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    this._buildCharacter();
    this._bubble = new SpeechBubble(this.group, 1.0);
    this.hide();
  }

  _buildCharacter() {
    // Body (rounded box via cylinder)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9b5de5, roughness: 0.7 }); // purple

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.55, 16),
      bodyMat,
    );
    body.position.y = 0.55;
    this.group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe5b4, roughness: 0.6 }), // skin-tone
    );
    head.position.y = 1.1;
    this.group.add(head);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00 });
    for (const xOff of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat);
      eye.position.set(xOff, 1.14, 0.2);
      this.group.add(eye);
    }

    // Arms (small cylinders)
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8),
        bodyMat,
      );
      arm.rotation.z = side * Math.PI / 3;
      arm.position.set(side * 0.28, 0.7, 0);
      this.group.add(arm);
    }

    this._bodyGroup = this.group;
  }

  /** Show the NPC with an order */
  show(orderText, category) {
    this.group.visible = true;
    this._bubble.show(`"${orderText}"`);
    voiceManager.play('order', category);
  }

  hide() {
    this.group.visible = false;
    this._bubble.hide();
  }

  /** Gentle idle bob — call every frame */
  update(camera, dt) {
    if (!this.group.visible) return;
    this._bobTime += dt;
    this.group.position.y = Math.sin(this._bobTime * 1.2) * 0.02;
    this._bubble.update(camera);
  }
}
