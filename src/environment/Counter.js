/**
 * Counter.js
 * Front counter — the order-taking area where the customer NPC stands.
 */

import * as THREE from 'three';

export class Counter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._build();
  }

  _build() {
    const g = this.group;

    const counterMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.6 }); // BrainDonald's red
    const topMat     = new THREE.MeshStandardMaterial({ color: 0xfff1dc, roughness: 0.4 }); // cream top

    // Main counter body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.1, 0.6),
      counterMat,
    );
    body.position.set(0, 0.55, -0.5);
    body.castShadow = true;
    g.add(body);

    // Counter top surface
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(5.1, 0.08, 0.7),
      topMat,
    );
    top.position.set(0, 1.1, -0.5);
    g.add(top);

    // Divider stripe — "ORDERS" side vs "TAKE AWAY" side
    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.5, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xffd166 }), // gold stripe
    );
    divider.position.set(0.8, 0.8, -0.5);
    g.add(divider);
  }
}
