/**
 * Restaurant.js
 * Builds the BrainDonald's restaurant environment.
 * Warm fast-food palette: cream walls, terracotta floor, golden accents.
 * All geometry is primitives — swap to glb later via mesh factories.
 */

import * as THREE from 'three';

const PALETTE = {
  floor:      0xc1956a, // terracotta
  wall:       0xfff1dc, // warm cream
  ceiling:    0xffe8c0, // light golden
  trim:       0xe63946, // BrainDonald's red
  light:      0xffe49a, // warm bulb
};

export class Restaurant {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._build();
    this._addLights();
    this._addSignage();
  }

  _build() {
    const g = this.group;

    // ── Floor ────────────────────────────────────────────────────────────
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);

    // ── Ceiling ───────────────────────────────────────────────────────────
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: PALETTE.ceiling, roughness: 1 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    g.add(ceiling);

    // ── Walls (back, left, right) ─────────────────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.8 });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 4), wallMat);
    backWall.position.set(0, 2, -10);
    g.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 4), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-10, 2, 0);
    g.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 4), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(10, 2, 0);
    g.add(rightWall);

    // ── Red trim strip along walls ────────────────────────────────────────
    const trimMat = new THREE.MeshStandardMaterial({ color: PALETTE.trim });
    const trimGeo = new THREE.BoxGeometry(20, 0.15, 0.05);

    const trimPositions = [
      { pos: [0, 1.0, -9.97], rot: 0 },
      { pos: [-9.97, 1.0, 0],  rot: Math.PI / 2 },
      { pos: [9.97, 1.0, 0],   rot: -Math.PI / 2 },
    ];
    for (const { pos, rot } of trimPositions) {
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(...pos);
      trim.rotation.y = rot;
      g.add(trim);
    }
  }

  _addLights() {
    const g = this.group;

    // Ambient — warm fill
    const ambient = new THREE.AmbientLight(0xfff4e0, 0.6);
    g.add(ambient);

    // Main overhead directional
    const sun = new THREE.DirectionalLight(0xffe49a, 1.2);
    sun.position.set(0, 4, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    g.add(sun);

    // Warm point lights above each aisle
    const pointPositions = [
      [-4.5, 3.5, -7],
      [0,    3.5, -7],
      [4.5,  3.5, -7],
      [0,    3.5, -1],  // above counter area
    ];
    for (const pos of pointPositions) {
      const pt = new THREE.PointLight(PALETTE.light, 1.5, 8);
      pt.position.set(...pos);
      g.add(pt);

      // Bulb visible mesh
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshStandardMaterial({ color: PALETTE.light, emissive: PALETTE.light, emissiveIntensity: 2 }),
      );
      bulb.position.set(...pos);
      g.add(bulb);
    }
  }

  _addSignage() {
    // "BrainDonald's" sign on back wall — simple red box with implied text
    const signBacking = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.8, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xe63946 }),
    );
    signBacking.position.set(0, 3.4, -9.9);
    this.group.add(signBacking);

    // Golden arch accent (two cylinders forming an arch silhouette)
    const archMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.4 });
    for (let side = -1; side <= 1; side += 2) {
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), archMat);
      arch.position.set(side * 0.5, 3.4, -9.85);
      this.group.add(arch);
    }
  }
}
