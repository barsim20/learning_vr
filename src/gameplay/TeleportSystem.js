/**
 * TeleportSystem.js
 * Controllerless Teleportation Nodes.
 * Places glowing floor discs at key locations so players can move around
 * hands-free using Gaze Dwell or Hand Pinch.
 */

import * as THREE from 'three';
import { createTextLabel } from '../utils/TextLabel.js';
import { audioManager } from '../core/AudioManager.js';

import { conceptOverlayManager } from '../ui/ConceptOverlayManager.js';

const TELEPORT_NODES = [
  { id: 'counter',  label: '📍 COUNTER',   target: new THREE.Vector3(0, 1.6, -2.0),    vrRigPos: new THREE.Vector3(0, 0, -2.0),    floorPos: new THREE.Vector3(0, 0.02, -2.0),    color: 0xe63946, lookTarget: new THREE.Vector3(0, 1.4, 0.5) },
  { id: 'math',     label: '🟡 MATH AISLE', target: new THREE.Vector3(-5, 1.6, -5.5),  vrRigPos: new THREE.Vector3(-5, 0, -5.5),  floorPos: new THREE.Vector3(-5, 0.02, -5.5),  color: 0xffd166, lookTarget: new THREE.Vector3(-5, 1.6, -7.0) },
  { id: 'food',     label: '🟢 FOOD AISLE', target: new THREE.Vector3(0, 1.6, -5.5),   vrRigPos: new THREE.Vector3(0, 0, -5.5),   floorPos: new THREE.Vector3(0, 0.02, -5.5),   color: 0x06d6a0, lookTarget: new THREE.Vector3(0, 1.6, -7.0) },
  { id: 'sports',   label: '🔵 SPORTS AISLE',target: new THREE.Vector3(5, 1.6, -5.5),  vrRigPos: new THREE.Vector3(5, 0, -5.5),  floorPos: new THREE.Vector3(5, 0.02, -5.5),   color: 0x118ab2, lookTarget: new THREE.Vector3(5, 1.6, -7.0) },
  { id: 'deliver',  label: '📬 DELIVERY',   target: new THREE.Vector3(2.2, 1.6, -1.5), vrRigPos: new THREE.Vector3(2.2, 0, -1.5), floorPos: new THREE.Vector3(2.2, 0.02, -1.5), color: 0xffd166, lookTarget: new THREE.Vector3(2.2, 1.2, -0.5) },
];

export class TeleportSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {InputManager} input
   * @param {VRSession} vrSession
   * @param {THREE.Group} [cameraRig]
   */
  constructor(scene, camera, input, vrSession, cameraRig = null) {
    this.scene     = scene;
    this.camera    = camera;
    this.input     = input;
    this.vrSession = vrSession;
    this.cameraRig = cameraRig;

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

      // Floor Solid Disc (Enlarged and filled for easy raycast & pinch targeting)
      const discMat = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });

      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.75, 32),
        discMat,
      );
      disc.rotation.x = -Math.PI / 2;
      nodeGroup.add(disc);

      // Center glowing pulse dot
      const centerDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.3, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
      );
      centerDot.rotation.x = -Math.PI / 2;
      centerDot.position.y = 0.005;
      nodeGroup.add(centerDot);

      // Generous invisible raycastable hit volume cylinder (1.6m diameter, 0.8m height)
      const hitCylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.8, 16),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hitCylinder.position.y = 0.4;
      nodeGroup.add(hitCylinder);

      // Floating label above node
      const label = createTextLabel(data.label, {
        fontSize: 18,
        fontColor: '#ffffff',
        bgColor: 'rgba(20,10,0,0.85)',
        worldScale: 0.006,
      });
      label.position.set(0, 0.6, 0);
      nodeGroup.add(label);

      // Interaction registration
      const onHover = (_, isHover) => {
        discMat.emissiveIntensity = isHover ? 1.0 : 0.5;
        centerDot.scale.setScalar(isHover ? 1.3 : 1.0);
      };
      const onSelect = () => {
        this.teleportToNode(data);
        if (['math', 'food', 'sports'].includes(data.id)) {
          conceptOverlayManager.trigger('storage_search', nodeGroup, new THREE.Vector3(0, 1.2, 0));
        }
      };

      disc.userData.onHover         = onHover;
      disc.userData.onSelect        = onSelect;
      centerDot.userData.onHover    = onHover;
      centerDot.userData.onSelect   = onSelect;
      hitCylinder.userData.onHover  = onHover;
      hitCylinder.userData.onSelect = onSelect;

      this.input.register(disc);
      this.input.register(centerDot);
      this.input.register(hitCylinder);
      this.group.add(nodeGroup);
      this._nodes.push({ disc, discMat, centerDot, data });
    }
  }

  /** Teleport player smoothly to target node position */
  teleportToNode(data) {
    if (this._isTeleporting) return;
    this._isTeleporting = true;

    audioManager.play('teleport');

    const duration = 350; // 350ms smooth transition
    const start = performance.now();

    const isVR = this.vrSession && this.vrSession.presenting;

    if (isVR && this.cameraRig) {
      // In WebXR: smoothly lerp cameraRig position (keep rotation strictly at (0,0,0) for natural 1:1 physical tracking)
      const startRigPos = this.cameraRig.position.clone();
      const targetRigPos = data.vrRigPos;

      const tickVR = () => {
        const t = Math.min((performance.now() - start) / duration, 1);
        const easeT = t * (2 - t); // ease-out quad

        this.cameraRig.position.lerpVectors(startRigPos, targetRigPos, easeT);

        if (t < 1) {
          requestAnimationFrame(tickVR);
        } else {
          this._isTeleporting = false;
        }
      };
      requestAnimationFrame(tickVR);
    } else {
      // On Desktop: lerp camera position and update OrbitControls target
      const startPos = this.camera.position.clone();
      const targetPos = data.target;

      const tickDesktop = () => {
        const t = Math.min((performance.now() - start) / duration, 1);
        const easeT = t * (2 - t); // ease-out quad

        this.camera.position.lerpVectors(startPos, targetPos, easeT);

        if (this.vrSession && this.vrSession._orbitControls) {
          const lookTarget = data.lookTarget || new THREE.Vector3(targetPos.x, targetPos.y - 0.2, targetPos.z - 2.0);
          this.vrSession._orbitControls.target.copy(lookTarget);
          this.vrSession._orbitControls.update();
        }

        if (t < 1) {
          requestAnimationFrame(tickDesktop);
        } else {
          this._isTeleporting = false;
        }
      };
      requestAnimationFrame(tickDesktop);
    }
  }

  /** Direct teleport to a vector target (backward compatibility) */
  teleportTo(targetPos) {
    const node = TELEPORT_NODES.find(n => n.target.distanceTo(targetPos) < 1.0) || {
      target: targetPos,
      vrRigPos: new THREE.Vector3(targetPos.x, 0, targetPos.z),
      lookTarget: new THREE.Vector3(targetPos.x, 1.4, targetPos.z - 2.0),
    };
    this.teleportToNode(node);
  }

  update(dt) {
    // Gentle pulse animation on teleport nodes
    const time = performance.now() * 0.003;
    for (const { centerDot } of this._nodes) {
      centerDot.material.opacity = 0.5 + Math.sin(time) * 0.25;
    }
  }
}
