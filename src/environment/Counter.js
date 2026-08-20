/**
 * Counter.js
 * Front counter — high-performance, stylized fast-food order counter.
 * Instant 90 FPS rendering with zero polygon bottlenecks.
 */

import * as THREE from 'three';

export class Counter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, -0.5);
    scene.add(this.group);

    this._buildCounter();
  }

  _buildCounter() {
    const g = this.group;

    // Materials
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7 }); // warm teak wood
    const topMat  = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.3, metalness: 0.1 }); // polished cream top
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.4 }); // BrainDonald's red
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.6, roughness: 0.3 }); // gold accent
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }); // register body
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x06d6a0, emissive: 0x06d6a0, emissiveIntensity: 0.4 });

    // 1. Main Counter Base (Width: 3.6m, Height: 1.05m, Depth: 0.9m)
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.05, 0.9), baseMat);
    base.position.y = 1.05 / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    // 2. Front Decorative Panels (Red fast-food inset strips)
    for (const xOff of [-1.1, 0, 1.1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.04), trimMat);
      panel.position.set(xOff, 0.55, 0.46);
      g.add(panel);

      const archAccent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.05), goldMat);
      archAccent.position.set(xOff, 0.85, 0.47);
      g.add(archAccent);
    }

    // 3. Countertop (Overhanging polished top slab: 3.8m x 0.08m x 1.1m)
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 1.1), topMat);
    top.position.y = 1.05 + 0.04;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);

    // 4. POS Register Terminals (Order screens on counter)
    for (const xPos of [-0.8, 0.8]) {
      const regGroup = new THREE.Group();
      regGroup.position.set(xPos, 1.09, 0.05);

      // Register stand
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.16, 12), darkMat);
      stand.position.y = 0.08;
      regGroup.add(stand);

      // Register screen housing
      const screenHousing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.04), darkMat);
      screenHousing.position.set(0, 0.22, 0);
      screenHousing.rotation.x = -Math.PI / 8; // angled towards clerk
      regGroup.add(screenHousing);

      // Glowing active POS screen
      const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.20), screenMat);
      screenFace.position.set(0, 0.22, -0.022);
      screenFace.rotation.x = -Math.PI / 8;
      screenFace.rotation.y = Math.PI;
      regGroup.add(screenFace);

      // Card scanner
      const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.12), darkMat);
      scanner.position.set(0.22, 0.03, 0.1);
      regGroup.add(scanner);

      g.add(regGroup);
    }

    // 5. Order Tray in Center
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.36), trimMat);
    tray.position.set(0, 1.1, 0.1);
    g.add(tray);

    const trayMatMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.32), topMat);
    trayMatMesh.rotation.x = -Math.PI / 2;
    trayMatMesh.position.set(0, 1.112, 0.1);
    g.add(trayMatMesh);
  }
}

