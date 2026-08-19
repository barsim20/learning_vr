/**
 * ConceptOverlayManager.js
 * Manages the In-FOV Learning Explanations overlay system:
 * 1. Darkening Backdrop Mesh that dims out the surrounding 3D environment.
 * 2. High-Contrast Concept Explanation Card with icon, bold title, and kid-friendly explanation.
 * 3. Interactive "I UNDERSTAND 🧠" button that requires explicit gaze/pinch acknowledgment.
 * 4. Persistent 3D "🧠" Badges anchored near objects for re-triggering explanations on demand.
 */

import * as THREE from 'three';
import { CONCEPT_EXPLANATIONS } from '../content/conceptExplanations.js';
import { gameState } from '../core/GameState.js';
import { audioManager } from '../core/AudioManager.js';

export class ConceptOverlayManager {
  /**
   * @param {THREE.Scene} [scene]
   * @param {THREE.Camera} [camera]
   * @param {InputManager} [input]
   */
  constructor(scene = null, camera = null, input = null) {
    this.activeOverlay = null;
    this.activeKey = null;
    this._badges = new Map(); // conceptKey -> THREE.Group

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

    // 1. Darkening Backdrop Mesh (dims environment)
    const backdropGeo = new THREE.PlaneGeometry(6, 4);
    const backdropMat = new THREE.MeshBasicMaterial({
      color: 0x050308,
      transparent: true,
      opacity: 0.88,
      depthTest: false,
    });
    this.backdrop = new THREE.Mesh(backdropGeo, backdropMat);
    this.backdrop.renderOrder = 990;
    this.overlayGroup.add(this.backdrop);

    // Backdrop click-to-prevent-pass-through
    this.backdrop.userData.onSelect = () => {};
    this.input.register(this.backdrop);

    // 2. Main Concept Card Mesh (Canvas texture)
    this.cardCanvas = document.createElement('canvas');
    this.cardCanvas.width  = 640;
    this.cardCanvas.height = 420;
    this.cardCtx = this.cardCanvas.getContext('2d');

    this.cardTexture = new THREE.CanvasTexture(this.cardCanvas);
    this.cardTexture.minFilter = THREE.LinearFilter;
    const cardGeo = new THREE.PlaneGeometry(1.2, 0.78);
    const cardMat = new THREE.MeshBasicMaterial({
      map: this.cardTexture,
      transparent: true,
      depthTest: false,
    });
    this.cardMesh = new THREE.Mesh(cardGeo, cardMat);
    this.cardMesh.position.set(0, 0.08, 0.01);
    this.cardMesh.renderOrder = 991;
    this.overlayGroup.add(this.cardMesh);

    // 3. Interactive "I UNDERSTAND 🧠" Acknowledgment Button Mesh
    this.btnCanvas = document.createElement('canvas');
    this.btnCanvas.width  = 360;
    this.btnCanvas.height = 90;
    this.btnCtx = this.btnCanvas.getContext('2d');

    this.btnTexture = new THREE.CanvasTexture(this.btnCanvas);
    const btnGeo = new THREE.PlaneGeometry(0.65, 0.16);
    this.btnMat = new THREE.MeshBasicMaterial({
      map: this.btnTexture,
      transparent: true,
      depthTest: false,
    });
    this.btnMesh = new THREE.Mesh(btnGeo, this.btnMat);
    this.btnMesh.position.set(0, -0.26, 0.02);
    this.btnMesh.renderOrder = 992;
    this.overlayGroup.add(this.btnMesh);

    // Button interactions
    this.btnMesh.userData.onHover = (_, isHover) => {
      this._drawButton(isHover);
    };
    this.btnMesh.userData.onSelect = () => {
      this._onAcknowledge();
    };
    this.input.register(this.btnMesh);
  }

  // ── Card Rendering ────────────────────────────────────────────────────────

  _renderCardContent(conceptData) {
    const ctx = this.cardCtx;
    const w = this.cardCanvas.width;
    const h = this.cardCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Card background panel (rounded rect with gold border)
    ctx.fillStyle = 'rgba(25, 14, 8, 0.95)';
    roundRect(ctx, 10, 10, w - 20, h - 20, 24);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();

    // Top Header Badge
    ctx.fillStyle = 'rgba(255, 209, 102, 0.15)';
    roundRect(ctx, 30, 24, w - 60, 48, 14);
    ctx.fill();

    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧠 BRAIN SCIENCE FACT', w / 2, 48);

    // Large Icon
    ctx.font = '54px sans-serif';
    ctx.fillText(conceptData.icon, w / 2, 120);

    // Concept Title (Bold, kid-friendly)
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(conceptData.concept, w / 2, 185);

    // Subtitle divider line
    ctx.beginPath();
    ctx.moveTo(80, 212);
    ctx.lineTo(w - 80, 212);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Explanation Sentence (wrapped)
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const lines = wrapText(ctx, `"${conceptData.explanation}"`, w - 80);
    const lineH = 30;
    const startY = 230;
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, startY + i * lineH);
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
    roundRect(ctx, 4, 4, w - 8, h - 8, 20);
    ctx.fill();

    ctx.lineWidth = isHover ? 5 : 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Button label
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('I UNDERSTAND! 🧠', w / 2, h / 2);

    this.btnTexture.needsUpdate = true;
  }

  // ── Overlay Trigger & Dismissal ───────────────────────────────────────────

  /**
   * Trigger a concept overlay.
   * @param {string} conceptKey   key from CONCEPT_EXPLANATIONS
   * @param {THREE.Object3D} [anchorObject]  object near which to place persistent badge
   * @param {THREE.Vector3} [badgeOffset]     offset for badge position
   * @param {boolean} [forceShow=false]      force show even if seen (e.g. from badge click)
   */
  trigger(conceptKey, anchorObject = null, badgeOffset = new THREE.Vector3(0, 0.8, 0), forceShow = false) {
    const conceptData = CONCEPT_EXPLANATIONS[conceptKey];
    if (!conceptData) return;

    if (!forceShow && !gameState.shouldTriggerConcept(conceptKey)) {
      // Already seen, ensure badge exists near object if provided
      if (anchorObject) {
        this.ensureBadge(conceptKey, anchorObject, badgeOffset);
      }
      return;
    }

    // Record that concept has been shown
    gameState.recordConceptShown(conceptKey);

    this.activeKey = conceptKey;
    this._targetAnchor = anchorObject;
    this._badgeOffset  = badgeOffset;

    this._renderCardContent(conceptData);
    this.overlayGroup.visible = true;

    audioManager.play('chime');
  }

  _onAcknowledge() {
    audioManager.play('ding');
    const key = this.activeKey;

    if (this._targetAnchor && key) {
      this.ensureBadge(key, this._targetAnchor, this._badgeOffset);
    }

    this.hideOverlay();
  }

  hideOverlay() {
    this.overlayGroup.visible = false;
    this.activeKey = null;
    this._targetAnchor = null;
  }

  // ── Persistent 🧠 Badge Creation ──────────────────────────────────────────

  /** Create or retrieve a persistent "🧠" badge near an object */
  ensureBadge(conceptKey, parentObject, offset = new THREE.Vector3(0, 0.8, 0)) {
    if (this._badges.has(conceptKey)) {
      const badge = this._badges.get(conceptKey);
      badge.visible = true;
      return badge;
    }

    const conceptData = CONCEPT_EXPLANATIONS[conceptKey];
    if (!conceptData) return null;

    const badgeGroup = new THREE.Group();
    badgeGroup.position.copy(offset);
    parentObject.add(badgeGroup);

    // Disc background
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.03, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xffd166,
        emissiveIntensity: 0.3,
        roughness: 0.4,
      }),
    );
    disc.rotation.x = Math.PI / 2;
    badgeGroup.add(disc);

    // Glowing ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.02, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }),
    );
    ring.rotation.x = Math.PI / 2;
    badgeGroup.add(ring);

    // Canvas label with "🧠 LEARN MORE"
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(20,10,0,0.85)';
    roundRect(ctx, 4, 4, 192, 92, 16);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd166';
    ctx.stroke();

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧠 CONCEPT', 100, 50);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.4, 0.2, 1);
    sprite.position.set(0, 0.22, 0);
    badgeGroup.add(sprite);

    // Interactions
    disc.userData.onHover = (_, isHover) => {
      disc.material.emissiveIntensity = isHover ? 0.9 : 0.3;
      badgeGroup.scale.setScalar(isHover ? 1.15 : 1.0);
    };
    disc.userData.onSelect = () => {
      this.trigger(conceptKey, parentObject, offset, true);
    };

    this.input.register(disc);
    this._badges.set(conceptKey, badgeGroup);

    return badgeGroup;
  }

  // ── Main Update Loop ──────────────────────────────────────────────────────

  update(camera) {
    // Keep overlay positioned and billboarded 1.2m directly in front of camera
    if (this.overlayGroup.visible) {
      const camPos = new THREE.Vector3();
      const camDir = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      camera.getWorldDirection(camDir);

      const targetPos = camPos.clone().addScaledVector(camDir, 1.2);
      this.overlayGroup.position.copy(targetPos);
      this.overlayGroup.lookAt(camPos);
    }

    // Billboard persistent badges to face camera
    for (const badge of this._badges.values()) {
      if (badge.visible) {
        badge.lookAt(camera.position);
      }
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
