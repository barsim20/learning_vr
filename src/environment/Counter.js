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

      // Fit frontdesk model to realistic counter size (~3.6m width x 1.15m height)
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      box.getSize(size);

      if (size.y > 0 && size.x > 0) {
        const scaleX = 3.6 / size.x;
        const scaleY = 1.15 / size.y;
        const scaleZ = 1.2 / size.z;
        this.model.scale.set(scaleX, scaleY, scaleZ);
      }

      // Re-align so bottom touches ground y=0 and centered at z=-0.5
      const scaledBox = new THREE.Box3().setFromObject(this.model);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);

      this.model.position.y = -scaledBox.min.y;
      this.model.position.x = -center.x;
      this.model.position.z = -0.5;

      this.group.add(this.model);
    }, undefined, (err) => {
      console.error('Failed to load frontdesk GLB model:', err);
    });
  }
}
