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

export const TELEPORT_NODES = [
  { id: 'counter',  label: '📍 COUNTER',     target: new THREE.Vector3(0, 1.6, -2.0),    vrRigPos: new THREE.Vector3(0, 0, -2.0),    floorPos: new THREE.Vector3(0, 0.02, -2.0),    color: 0xe63946, lookTarget: new THREE.Vector3(0, 1.4, 0.5) },
  { id: 'math',     label: '🟡 MATH AISLE',   target: new THREE.Vector3(-5, 1.6, -5.5),  vrRigPos: new THREE.Vector3(-5, 0, -5.5),  floorPos: new THREE.Vector3(-5, 0.02, -5.5),  color: 0xffd166, lookTarget: new THREE.Vector3(-5, 1.6, -7.0) },
  { id: 'food',     label: '🟢 FOOD AISLE',   target: new THREE.Vector3(0, 1.6, -5.5),   vrRigPos: new THREE.Vector3(0, 0, -5.5),   floorPos: new THREE.Vector3(0, 0.02, -5.5),   color: 0x06d6a0, lookTarget: new THREE.Vector3(0, 1.6, -7.0) },
  { id: 'sports',   label: '🔵 SPORTS AISLE', target: new THREE.Vector3(5, 1.6, -5.5),  vrRigPos: new THREE.Vector3(5, 0, -5.5),  floorPos: new THREE.Vector3(5, 0.02, -5.5),   color: 0x118ab2, lookTarget: new THREE.Vector3(5, 1.6, -7.0) },
  { id: 'deliver',  label: '📬 DELIVERY',     target: new THREE.Vector3(2.2, 1.6, -1.5), vrRigPos: new THREE.Vector3(2.2, 0, -1.5), floorPos: new THREE.Vector3(2.2, 0.02, -1.5), color: 0xffd166, lookTarget: new THREE.Vector3(2.2, 1.2, -0.5) },
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
    this._teleportState = null;
    this._currentRigPos = new THREE.Vector3(0, 0, -2.0);

    this._buildNodes();
  }

  _buildNodes() {
    for (const data of TELEPORT_NODES) {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(data.floorPos);

      // 1. Floor Solid Disc (flat on floor)
      const discMat = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });

      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 32),
        discMat,
      );
      disc.rotation.x = -Math.PI / 2;
      nodeGroup.add(disc);

      // 2. Outer luminous ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 0.95, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.003;
      nodeGroup.add(ring);

      // 3. Center glowing pulse dot
      const centerDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.32, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
      );
      centerDot.rotation.x = -Math.PI / 2;
      centerDot.position.y = 0.006;
      nodeGroup.add(centerDot);

      // 4. Low floor-level hit cylinder (height 0.12m, centered at y=0.06m)
      // Strictly at floor height so it NEVER blocks shelves or bins behind it
      const hitCylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 0.12, 16),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      hitCylinder.position.y = 0.06;
      nodeGroup.add(hitCylinder);

      // 5. Floating label above node
      const label = createTextLabel(data.label, {
        fontSize: 18,
        fontColor: '#ffffff',
        bgColor: 'rgba(20,10,0,0.85)',
        worldScale: 0.0055,
      });
      label.position.set(0, 0.5, 0);
      nodeGroup.add(label);

      // Check if player is already standing at this node
      const isPlayerHere = () => {
        const checkPos = (this.cameraRig && (this.vrSession?.presenting || this.rendererIsXR()))
          ? this.cameraRig.position
          : this.camera.position;
        const dx = checkPos.x - data.floorPos.x;
        const dz = checkPos.z - data.floorPos.z;
        return Math.hypot(dx, dz) < 1.1;
      };

      // Interaction handlers
      const onHover = (_, isHover) => {
        if (isPlayerHere()) return;
        discMat.emissiveIntensity = isHover ? 1.2 : 0.5;
        centerDot.scale.setScalar(isHover ? 1.3 : 1.0);
        ring.scale.setScalar(isHover ? 1.08 : 1.0);
      };

      const onSelect = () => {
        if (isPlayerHere() || this._isTeleporting) return;
        this.teleportToNode(data);
      };

      disc.userData.onHover         = onHover;
      disc.userData.onSelect        = onSelect;
      centerDot.userData.onHover    = onHover;
      centerDot.userData.onSelect   = onSelect;
      hitCylinder.userData.onHover  = onHover;
      hitCylinder.userData.onSelect = onSelect;
      label.userData.onHover        = onHover;
      label.userData.onSelect       = onSelect;

      this.input.register(disc);
      this.input.register(centerDot);
      this.input.register(hitCylinder);
      this.input.register(label);

      this.group.add(nodeGroup);
      this._nodes.push({ disc, discMat, centerDot, ring, hitCylinder, label, nodeGroup, data });
    }
  }

  rendererIsXR() {
    return this.input?.renderer?.xr?.isPresenting || false;
  }

  /** Teleport player smoothly to target node position */
  teleportToNode(data) {
    if (this._isTeleporting) return;
    this._isTeleporting = true;

    audioManager.play('teleport');

    const duration = 320; // 320ms smooth ease
    const start = performance.now();
    const isVR = (this.vrSession && this.vrSession.presenting) || this.rendererIsXR();

    if (isVR && this.cameraRig) {
      const startRigPos = this.cameraRig.position.clone();
      const targetRigPos = data.vrRigPos.clone();
      const startYaw = this.cameraRig.rotation.y;
      const lookTarget = data.lookTarget || new THREE.Vector3(data.vrRigPos.x, 1.4, data.vrRigPos.z + 2.0);
      const dir = new THREE.Vector3().subVectors(lookTarget, data.vrRigPos);
      let targetYaw = Math.atan2(-dir.x, -dir.z);

      // Shortest angle difference
      let diff = (targetYaw - startYaw) % (Math.PI * 2);
      if (diff < -Math.PI) diff += Math.PI * 2;
      if (diff > Math.PI) diff -= Math.PI * 2;
      targetYaw = startYaw + diff;

      this._teleportState = {
        active: true,
        start,
        duration,
        isVR: true,
        startPos: startRigPos,
        targetPos: targetRigPos,
        startYaw,
        targetYaw,
        data,
      };
    } else {
      const startPos = this.camera.position.clone();
      const targetPos = data.target.clone();
      const lookTarget = data.lookTarget || new THREE.Vector3(targetPos.x, targetPos.y - 0.2, targetPos.z - 2.0);

      this._teleportState = {
        active: true,
        start,
        duration,
        isVR: false,
        startPos,
        targetPos,
        lookTarget,
        data,
      };
    }
  }

  /** Direct teleport to a vector target */
  teleportTo(targetPos) {
    const node = TELEPORT_NODES.find(n => n.target.distanceTo(targetPos) < 1.0) || {
      id: 'custom',
      target: targetPos,
      vrRigPos: new THREE.Vector3(targetPos.x, 0, targetPos.z),
      lookTarget: new THREE.Vector3(targetPos.x, 1.4, targetPos.z - 2.0),
    };
    this.teleportToNode(node);
  }

  /** Frame-driven update inside main animation loop */
  update(dt) {
    const now = performance.now();

    // 1. Process active teleport transition
    if (this._teleportState && this._teleportState.active) {
      const { start, duration, isVR, startPos, targetPos, startYaw, targetYaw, lookTarget, data } = this._teleportState;
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1.0);
      const easeT = t * (2 - t); // ease-out quad

      if (isVR && this.cameraRig) {
        this.cameraRig.position.lerpVectors(startPos, targetPos, easeT);
        this.cameraRig.rotation.y = startYaw + (targetYaw - startYaw) * easeT;
        this.cameraRig.updateMatrixWorld(true);
      } else {
        this.camera.position.lerpVectors(startPos, targetPos, easeT);
        if (this.vrSession && this.vrSession._orbitControls && lookTarget) {
          this.vrSession._orbitControls.target.copy(lookTarget);
          this.vrSession._orbitControls.update();
        }
      }

      if (t >= 1.0) {
        this._teleportState.active = false;
        this._isTeleporting = false;
        this._currentRigPos.copy(targetPos);

        // After reaching aisle, trigger storage_search concept overlay automatically once
        if (data && ['math', 'food', 'sports'].includes(data.id)) {
          conceptOverlayManager.trigger('storage_search');
        }
      }
    }

    // 2. Gentle pulse & distance management for all teleport nodes
    const time = now * 0.003;
    const playerPos = (this.cameraRig && (this.vrSession?.presenting || this.rendererIsXR()))
      ? this.cameraRig.position
      : this.camera.position;

    for (const { centerDot, ring, discMat, label, hitCylinder, data } of this._nodes) {
      const dist = Math.hypot(playerPos.x - data.floorPos.x, playerPos.z - data.floorPos.z);
      const isCurrent = dist < 1.1;

      // When standing at a node, hide its label and hit cylinder, and disable disc raycasts so it never blocks shelves or bottom containers
      label.visible = !isCurrent;
      hitCylinder.visible = !isCurrent;
      disc.raycast = isCurrent ? noopRaycast : THREE.Mesh.prototype.raycast;
      centerDot.raycast = isCurrent ? noopRaycast : THREE.Mesh.prototype.raycast;

      if (isCurrent) {
        centerDot.material.opacity = 0.2;
        ring.material.opacity = 0.2;
        discMat.emissiveIntensity = 0.15;
      } else {
        centerDot.material.opacity = 0.6 + Math.sin(time) * 0.25;
        ring.material.opacity = 0.7 + Math.cos(time) * 0.2;
        discMat.emissiveIntensity = 0.5;
      }
    }
  }
}

function noopRaycast() {}
