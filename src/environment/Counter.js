/**
 * Counter.js
 * Front counter — the order-taking area where the customer NPC stands.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Counter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._loadModel();
  }

  _loadModel() {
    const loader = new GLTFLoader();
    loader.load('/3d_assets/frontdesk.glb', (gltf) => {
      this.model = gltf.scene;

      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Position frontdesk at counter area (0, 0, -0.5)
      this.model.position.set(0, 0, -0.5);

      this.group.add(this.model);
    }, undefined, (err) => {
      console.error('Failed to load frontdesk GLB model:', err);
    });
  }
}
