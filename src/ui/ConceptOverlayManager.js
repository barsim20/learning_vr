/**
 * ConceptOverlayManager.js
 * Manages the In-FOV Learning Explanations overlay system:
 * 1. Darkening Backdrop Mesh that dims out the surrounding 3D environment.
 * 2. High-Contrast Concept Explanation Card with icon, bold title, scenario context, and kid-friendly explanation.
 * 3. Interactive "I UNDERSTAND 🧠" button that requires explicit gaze/pinch acknowledgment.
 * 4. Persistent 3D "🧠" Badges anchored near objects for re-triggering explanations on demand.
 */

import * as THREE from 'three';
import { CONCEPT_EXPLANATIONS } from '../content/conceptExplanations.js';
import { gameState } from '../core/GameState.js';
import { audioManager } from '../core/AudioManager.js';

const _overlayPos = new THREE.Vector3();
const _overlayQuat = new THREE.Quaternion();
const _overlayOffset = new THREE.Vector3();

export class ConceptOverlayManager {
  /**
   * @param {THREE.Scene} [scene]
   * @param {THREE.Camera} [camera]
   * @param {InputManager} [input]
   */
  constructor(scene = null, camera = null, input = null) {
    this.activeKey = null;
    this._onDismissCallback = null;

    if (scene && camera && input) {
      this.init(scene, camera, input);
    }
  }

  /** Initialize with scene, camera, input */
  init(scene, camera, input) {
    this.scene  = scene;
    this.camera = camera;
    this.input  = input;

    this.group = new THREE.Group();
    scene.add(this.group);

    this._buildOverlayMesh();
    this.hideOverlay();
  }

  // ── Overlay Mesh Construction ─────────────────────────────────────────────

  _buildOverlayMesh() {
    this.overlayGroup = new THREE.Group();
    this.scene.add(this.overlayGroup);

    // 1. Darkening Backdrop Mesh (dims environment & blocks all world raycasts)
    const backdropGeo = new THREE.PlaneGeometry(10, 8);
    const backdropMat = new THREE.MeshBasicMaterial({
      color: 0x030205,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.backdrop = new THREE.Mesh(backdropGeo, backdropMat);
    this.backdrop.position.set(0, 0, -0.05);
    this.backdrop.renderOrder = 990;
    this.overlayGroup.add(this.backdrop);

    // 2. Main Concept Card Mesh (Canvas texture)
    this.cardCanvas = document.createElement('canvas');
    this.cardCanvas.width  = 720;
    this.cardCanvas.height = 460;
    this.cardCtx = this.cardCanvas.getContext('2d');

    this.cardTexture = new THREE.CanvasTexture(this.cardCanvas);
    this.cardTexture.generateMipmaps = false;
    this.cardTexture.minFilter = THREE.LinearFilter;
    const cardGeo = new THREE.PlaneGeometry(1.3, 0.83);
    const cardMat = new THREE.MeshBasicMaterial({
      map: this.cardTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.cardMesh = new THREE.Mesh(cardGeo, cardMat);
    this.cardMesh.position.set(0, 0.08, 0.01);
    this.cardMesh.renderOrder = 991;
    this.overlayGroup.add(this.cardMesh);

    // 3. Interactive "I UNDERSTAND 🧠" Acknowledgment Button Mesh
    this.btnCanvas = document.createElement('canvas');
    this.btnCanvas.width  = 400;
    this.btnCanvas.height = 100;
    this.btnCtx = this.btnCanvas.getContext('2d');

    this.btnTexture = new THREE.CanvasTexture(this.btnCanvas);
    this.btnTexture.generateMipmaps = false;
    this.btnTexture.minFilter = THREE.LinearFilter;
    const btnGeo = new THREE.PlaneGeometry(0.72, 0.18);
    this.btnMat = new THREE.MeshBasicMaterial({
      map: this.btnTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.btnMesh = new THREE.Mesh(btnGeo, this.btnMat);
    this.btnMesh.position.set(0, -0.32, 0.04);
    this.btnMesh.renderOrder = 992;
    this.overlayGroup.add(this.btnMesh);

    // Generous transparent raycastable hit volume box centered on button
    const btnHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.45, 0.3),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    btnHitBox.position.set(0, 0, 0);
    this.btnMesh.add(btnHitBox);
    this.btnHitBox = btnHitBox;

    // Explicit user click/pinch on button dismisses the overlay
    const onAcknowledge = () => {
      this._onAcknowledge();
    };
    const onButtonHover = (_, isHover) => {
      this._drawButton(isHover);
      this.btnMesh.scale.setScalar(isHover ? 1.06 : 1.0);
    };

    this.btnMesh.userData.onHover   = onButtonHover;
    this.btnMesh.userData.onSelect  = onAcknowledge;
    btnHitBox.userData.onHover      = onButtonHover;
    btnHitBox.userData.onSelect     = onAcknowledge;

    // Backdrop & Card absorb raycasts to block world interactions, but do NOT auto-dismiss
    this.cardMesh.userData.onHover  = () => {};
    this.cardMesh.userData.onSelect = () => {};
    this.backdrop.userData.onHover  = () => {};
    this.backdrop.userData.onSelect = () => {};

    this.input.register(this.btnMesh);
    this.input.register(btnHitBox);
    this.input.register(this.cardMesh);
    this.input.register(this.backdrop);
  }

  // ── Card Rendering ────────────────────────────────────────────────────────

  _renderCardContent(conceptData) {
    const ctx = this.cardCtx;
    const w = this.cardCanvas.width;
    const h = this.cardCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Card background panel (rounded rect with gold border)
    ctx.fillStyle = 'rgba(25, 14, 8, 0.96)';
    roundRect(ctx, 10, 10, w - 20, h - 20, 24);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();

    // Top Header Badge
    ctx.fillStyle = 'rgba(255, 209, 102, 0.18)';
    roundRect(ctx, 30, 22, w - 60, 46, 14);
    ctx.fill();

    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧠 BRAIN SCIENCE FACT', w / 2, 45);

    // Large Icon
    ctx.font = '50px sans-serif';
    ctx.fillText(conceptData.icon, w / 2, 112);

    // Concept Title (Bold, kid-friendly)
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(conceptData.concept, w / 2, 168);

    // Subtitle divider line
    ctx.beginPath();
    ctx.moveTo(80, 192);
    ctx.lineTo(w - 80, 192);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    let currentY = 208;

    // 1. Scenario Context Line (Highlighted in Cyan/Gold box)
    if (conceptData.scenario) {
      ctx.fillStyle = 'rgba(6, 214, 160, 0.12)';
      roundRect(ctx, 40, currentY, w - 80, 52, 10);
      ctx.fill();

      ctx.font = 'bold 19px Arial, sans-serif';
      ctx.fillStyle = '#06d6a0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🎮 SCENARIO: ${conceptData.scenario}`, w / 2, currentY + 26);

      currentY += 62;
    }

    // 2. Memory Science Explanation Sentence (Clear White Text)
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const lines = wrapText(ctx, `"${conceptData.explanation}"`, w - 80);
    lines.forEach((line) => {
      ctx.fillText(line, w / 2, currentY);
      currentY += 28;
    });

    this.cardTexture.needsUpdate = true;
    this._drawButton(false);
  }

  _drawButton(isHover) {
    const ctx = this.btnCtx;
    const w = this.btnCanvas.width;
    const h = this.btnCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Rounded button background
    ctx.fillStyle = isHover ? '#06d6a0' : '#04b384';
    roundRect(ctx, 6, 6, w - 12, h - 12, 22);
    ctx.fill();

    ctx.lineWidth = isHover ? 6 : 4;
    ctx.strokeStyle = isHover ? '#ffd166' : '#ffffff';
    ctx.stroke();

    // Button label
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('I UNDERSTAND! 🧠', w / 2, h / 2);

    this.btnTexture.needsUpdate = true;
  }

  // ── Overlay Trigger & Dismissal ───────────────────────────────────────────

  /**
   * Trigger a concept overlay. Shows automatically the first time (unless forceShow is true).
   * @param {string} conceptKey   key from CONCEPT_EXPLANATIONS
   * @param {THREE.Object3D|null} [_anchorObject=null] (kept for compatibility)
   * @param {THREE.Vector3|null} [_badgeOffset=null]  (kept for compatibility)
   * @param {boolean} [forceShow=false]
   * @param {Function} [onDismiss=null] callback when overlay is consciously dismissed by click
   */
  trigger(conceptKey, _anchorObject = null, _badgeOffset = null, forceShow = false, onDismiss = null) {
    // Support trigger(key, onDismiss) shorthand
    if (typeof _anchorObject === 'function') {
      onDismiss = _anchorObject;
      _anchorObject = null;
    }

    const conceptData = CONCEPT_EXPLANATIONS[conceptKey];
    if (!conceptData) {
      if (onDismiss) onDismiss();
      return;
    }

    // Only show automatically if never seen before in the game (or if forced)
    if (!forceShow && !gameState.shouldTriggerConcept(conceptKey)) {
      if (onDismiss) onDismiss();
      return;
    }

    // Record that concept has been shown
    gameState.recordConceptShown(conceptKey);

    this.activeKey = conceptKey;
    this._onDismissCallback = onDismiss;

    this._renderCardContent(conceptData);

    // Position overlay in front of camera (0.95m distance in VR/desktop)
    if (this.camera) {
      this.camera.getWorldPosition(_overlayPos);
      this.camera.getWorldQuaternion(_overlayQuat);
      _overlayOffset.set(0, 0, -0.95).applyQuaternion(_overlayQuat);
      this.overlayGroup.position.copy(_overlayPos).add(_overlayOffset);
      this.overlayGroup.quaternion.copy(_overlayQuat);
    }

    this.overlayGroup.visible = true;
    if (this.input) {
      this.input.setModal([this.btnMesh, this.btnHitBox, this.cardMesh, this.backdrop]);
    }
    audioManager.play('conceptOpen');
  }

  _onAcknowledge() {
    audioManager.play('ding');

    const cb = this._onDismissCallback;
    this._onDismissCallback = null;

    this.hideOverlay();

    if (cb) {
      cb();
    }
  }

  hideOverlay() {
    this.overlayGroup.visible = false;
    this.activeKey = null;
    if (this.input) {
      this.input.clearModal();
    }
  }

  // ── Main Update Loop ──────────────────────────────────────────────────────

  update(camera) {
    if (!camera) return;
    camera.getWorldPosition(_overlayPos);
    camera.getWorldQuaternion(_overlayQuat);

    // Keep overlay positioned and aligned 0.95m in front of camera while open
    if (this.overlayGroup.visible) {
      _overlayOffset.set(0, 0, -0.95).applyQuaternion(_overlayQuat);
      this.overlayGroup.position.copy(_overlayPos).add(_overlayOffset);
      this.overlayGroup.quaternion.copy(_overlayQuat);
    }
  }
}

export const conceptOverlayManager = new ConceptOverlayManager();

/** Helper: draw rounded rectangle */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Helper: text line wrapper */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
