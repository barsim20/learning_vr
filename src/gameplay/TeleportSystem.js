/**
 * TeleportSystem.js
 * Controllerless Teleportation Nodes.
 * Places glowing floor discs at key locations so players can move around
 * hands-free using Gaze Dwell or Hand Pinch.
 */

import * as THREE from 'three';
import { createTextLabel } from '../utils/TextLabel.js';
import { audioManager } from '../core/AudioManager.js';

const TELEPORT_NODES = [
  { id: 'counter',  label: '📍 COUNTER',   target: new THREE.Vector3(0, 1.6, -1.8),   floorPos: new THREE.Vector3(0, 0.02, -1.8),   color: 0xe63946 },
  { id: 'math',     label: '🟡 MATH AISLE', target: new THREE.Vector3(-5, 1.6, -5.5),  floorPos: new THREE.Vector3(-5, 0.02, -5.5),  color: 0xffd166 },
  { id: 'food',     label: '🟢 FOOD AISLE', target: new THREE.Vector3(0, 1.6, -5.5),   floorPos: new THREE.Vector3(0, 0.02, -5.5),   color: 0x06d6a0 },
  { id: 'sports',   label: '🔵 SPORTS AISLE',target: new THREE.Vector3(5, 1.6, -5.5),  floorPos: new THREE.Vector3(5, 0.02, -5.5),   color: 0x118ab2 },
  { id: 'deliver',  label: '📬 DELIVERY',   target: new THREE.Vector3(2.2, 1.6, -1.5), floorPos: new THREE.Vector3(2.2, 0.02, -1.5), color: 0xffd166 },
];

export class TeleportSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {InputManager} input
   * @param {VRSession} vrSession
   */
  constructor(scene, camera, input, vrSession) {
    this.scene     = scene;
    this.camera    = camera;
    this.input     = input;
    this.vrSession = vrSession;

    this.group = new THREE.Group();
    scene.add(this.group);

    this._nodes = [];
    this._isTeleporting = false;

    this._buildNodes();
  }

  _buildNodes() {
    for (const data of TELEPORT_NODES) {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(data.floorPos);

      // Floor Ring Disc
      const discMat = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });

      const disc = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.45, 32),
        discMat,
      );
      disc.rotation.x = -Math.PI / 2;
      nodeGroup.add(disc);

      // Center glowing pulse dot
      const centerDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 16),
        new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.6 }),
      );
      centerDot.rotation.x = -Math.PI / 2;
      centerDot.position.y = 0.005;
      nodeGroup.add(centerDot);

      // Floating label above node
      const label = createTextLabel(data.label, {
        fontSize: 16,
        fontColor: '#ffffff',
        bgColor: 'rgba(20,10,0,0.85)',
        worldScale: 0.005,
      });
      label.position.set(0, 0.4, 0);
      nodeGroup.add(label);

      // Interaction registration
      disc.userData.onHover = (_, isHover) => {
        discMat.emissiveIntensity = isHover ? 1.0 : 0.4;
        centerDot.scale.setScalar(isHover ? 1.3 : 1.0);
      };

      disc.userData.onSelect = () => {
        this.teleportTo(data.target);
      };

      this.input.register(disc);
      this.group.add(nodeGroup);
      this._nodes.push({ disc, discMat, centerDot, data });
    }
  }

  /** Teleport player camera smoothly to target position */
  teleportTo(targetPos) {
    if (this._isTeleporting) return;
    this._isTeleporting = true;

    audioManager.play('sequenceBeep');

    const startPos = this.camera.position.clone();
    const duration = 400; // 400ms smooth transition
    const start = performance.now();

    const tick = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      const easeT = t * (2 - t); // ease-out quad

      this.camera.position.lerpVectors(startPos, targetPos, easeT);

      // Update OrbitControls target on desktop
      if (this.vrSession && this.vrSession._orbitControls) {
        const lookTarget = new THREE.Vector3(targetPos.x, targetPos.y - 0.2, targetPos.z - 2.0);
        this.vrSession._orbitControls.target.copy(lookTarget);
        this.vrSession._orbitControls.update();
      }

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        this._isTeleporting = false;
      }
    };
    requestAnimationFrame(tick);
  }

  update(dt) {
    // Gentle pulse animation on teleport nodes
    const time = performance.now() * 0.003;
    for (const { centerDot } of this._nodes) {
      centerDot.material.opacity = 0.5 + Math.sin(time) * 0.25;
    }
  }
}
