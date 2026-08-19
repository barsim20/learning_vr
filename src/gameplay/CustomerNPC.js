/**
 * CustomerNPC.js
 * A simple, friendly, kid-appropriate customer character.
 * Shows a speech bubble with the order, plays a voice line.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SpeechBubble } from '../ui/SpeechBubble.js';
import { voiceManager } from '../core/VoiceManager.js';

import { conceptOverlayManager } from '../ui/ConceptOverlayManager.js';

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
    this.group.rotation.y = Math.PI; // Face towards Store Manager behind counter
    scene.add(this.group);

    this._loadCharacter();
    this._bubble = new SpeechBubble(this.group, 2.1);
    this.hide();
  }

  _loadCharacter() {
    const loader = new GLTFLoader();
    loader.load('/3d_assets/customer.glb', (gltf) => {
      this.model = gltf.scene;

      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Auto-scale character to realistic VR human height (~1.95m)
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      box.getSize(size);

      if (size.y > 0) {
        const targetHeight = 1.95;
        const scaleFactor = targetHeight / size.y;
        this.model.scale.setScalar(scaleFactor);

        // Adjust position so feet touch the ground (y=0)
        const scaledBox = new THREE.Box3().setFromObject(this.model);
        this.model.position.y = -scaledBox.min.y;
      }

      this.group.add(this.model);
    }, undefined, (err) => {
      console.error('Failed to load customer GLB model:', err);
    });
  }

  /** Show the NPC with an order */
  show(orderText, category) {
    this.group.visible = true;
    this._bubble.show(`"${orderText}"`);
    voiceManager.play('order', category);
    conceptOverlayManager.trigger('customer_order', this.group, new THREE.Vector3(-0.85, 2.25, 0));
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
