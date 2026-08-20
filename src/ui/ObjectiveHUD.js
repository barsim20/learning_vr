/**
 * ObjectiveHUD.js
 * Clear, real-time step-by-step objective banner floating at the top of the user's FOV.
 * Continuously guides the user through every state of the game.
 */

import * as THREE from 'three';
import { gameState, STATE } from '../core/GameState.js';
import { conceptOverlayManager } from './ConceptOverlayManager.js';

const _hudCamPos = new THREE.Vector3();
const _hudCamQuat = new THREE.Quaternion();
const _hudOffset = new THREE.Vector3();

export class ObjectiveHUD {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(scene, camera) {
    this.scene  = scene;
    this.camera = camera;

    this.group = new THREE.Group();
    scene.add(this.group);

    this._canvas  = document.createElement('canvas');
    this._canvas.width  = 640;
    this._canvas.height = 100;
    this._ctx     = this._canvas.getContext('2d');
    this._texture = new THREE.CanvasTexture(this._canvas);
    this._texture.generateMipmaps = false;
    this._texture.minFilter = THREE.LinearFilter;

    this._sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this._texture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      })
    );
    this._sprite.renderOrder = 998;
    this._sprite.scale.set(1.4, 0.22, 1);
    this.group.add(this._sprite);

    this._currentMessage = 'Click "START SHIFT" to begin!';
    this._draw();

    // Subscribe to state changes
    gameState.on('change', () => this.updateState());
    gameState.on('order',  () => this.updateState());
    gameState.on('binOpened', () => this.updateState());
  }

  updateState() {
    let msg = '';
    const active = gameState.activeOrder;

    switch (gameState.current) {
      case STATE.IDLE:
        msg = '⏳ Waiting for next customer...';
        break;

      case STATE.ORDER:
        if (active) {
          msg = `👉 TASK: Find "${active.label}" in the ${active.category.toUpperCase()} aisle!`;
        } else {
          msg = '👉 Read the customer order at the counter!';
        }
        break;

      case STATE.NAVIGATING:
        msg = active
          ? `👉 Walk to ${active.category.toUpperCase()} aisle & tap "${active.label}" bin lock!`
          : '👉 Go to the storage aisles!';
        break;

      case STATE.PUZZLE:
        if (gameState.activeBin && gameState.activeBin.isOpen) {
          msg = active
            ? `📦 Tap "${active.label}" to grab it!`
            : '📦 Grab the item from the open bin!';
        } else {
          msg = '🧩 Watch & repeat the 3×3 light pattern to unlock the bin!';
        }
        break;

      case STATE.CARRYING:
        msg = '📦 Item collected! Walk to the golden "DELIVER HERE" station.';
        break;

      case STATE.DELIVERING:
        msg = '📬 Delivering knowledge item...';
        break;

      case STATE.RESULT:
        msg = '🎉 Delivery complete! Next customer arriving...';
        break;

      default:
        msg = 'Follow the golden task markers!';
    }

    if (msg !== this._currentMessage) {
      this._currentMessage = msg;
      this._draw();
    }
  }

  _draw() {
    const { _canvas: canvas, _ctx: ctx } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Banner background
    ctx.fillStyle = 'rgba(20, 10, 0, 0.88)';
    this._roundRect(ctx, 0, 0, canvas.width, canvas.height, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    this._roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 10);
    ctx.stroke();

    // Banner Title
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CURRENT OBJECTIVE', canvas.width / 2, 26);

    // Message
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px Arial';
    ctx.fillText(this._currentMessage, canvas.width / 2, 65);

    this._texture.needsUpdate = true;
  }

  /** Position HUD smoothly at top-center of camera FOV */
  update(camera) {
    if (!camera) return;
    if (gameState.isIn(STATE.INIT) || (conceptOverlayManager.overlayGroup && conceptOverlayManager.overlayGroup.visible)) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    // Vector offset in front of camera: 0.45m up, 1.1m forward
    camera.getWorldPosition(_hudCamPos);
    camera.getWorldQuaternion(_hudCamQuat);
    _hudOffset.set(0, 0.45, -1.1).applyQuaternion(_hudCamQuat);
    this.group.position.copy(_hudCamPos).add(_hudOffset);
    this.group.quaternion.copy(_hudCamQuat);
  }

  _roundRect(ctx, x, y, w, h, r) {
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
}
