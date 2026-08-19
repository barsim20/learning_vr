/**
 * StartScreen.js
 * A 3D start screen floating in front of the player's FOV.
 * Explains the game goals to 12-year-olds and provides a clickable "START SHIFT" button.
 */

import * as THREE from 'three';
import { gameState, STATE } from '../core/GameState.js';
import { audioManager } from '../core/AudioManager.js';
import { voiceManager } from '../core/VoiceManager.js';

export class StartScreen {
  /**
   * @param {THREE.Scene} scene
   * @param {InputManager} input
   * @param {Function} onStart  callback when player clicks Start Shift
   */
  constructor(scene, input, onStart) {
    this.scene   = scene;
    this.input   = input;
    this.onStart = onStart;

    this.group = new THREE.Group();
    // Position directly in front of spawn position behind counter (x=0, y=1.55, z=-1.2)
    this.group.position.set(0, 1.55, -1.2);
    scene.add(this.group);

    this._canvas  = document.createElement('canvas');
    this._canvas.width  = 512;
    this._canvas.height = 320;
    this._ctx     = this._canvas.getContext('2d');
    this._texture = new THREE.CanvasTexture(this._canvas);

    this._buildPanel();
    this._buildButton();
    this._draw();
  }

  _buildPanel() {
    // 3D Panel background
    const panelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.75),
      new THREE.MeshStandardMaterial({
        map: this._texture,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.3,
      }),
    );
    this.group.add(panelMesh);

    // Frame border
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.79, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.4 }),
    );
    border.position.z = -0.015;
    this.group.add(border);
  }

  _buildButton() {
    // 3D Interactive Start Button (Enlarged for easy hit-testing)
    this._button = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.22, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0x06d6a0,
        emissive: 0x06d6a0,
        emissiveIntensity: 0.4,
        roughness: 0.3,
      }),
    );
    this._button.position.set(0, -0.26, 0.04);
    this.group.add(this._button);

    // Canvas label on button
    const btnCanvas = document.createElement('canvas');
    btnCanvas.width = 384;
    btnCanvas.height = 96;
    const btnCtx = btnCanvas.getContext('2d');
    btnCtx.fillStyle = '#ffffff';
    btnCtx.font = 'bold 38px Arial';
    btnCtx.textAlign = 'center';
    btnCtx.textBaseline = 'middle';
    btnCtx.fillText('▶ START SHIFT', 192, 48);

    const btnTex = new THREE.CanvasTexture(btnCanvas);
    const btnLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.2),
      new THREE.MeshBasicMaterial({ map: btnTex, transparent: true }),
    );
    btnLabel.position.z = 0.032;
    this._button.add(btnLabel);

    // Hover & Click handlers
    this._button.userData.onHover = (_, isHover) => {
      this._button.material.emissiveIntensity = isHover ? 0.9 : 0.4;
      this._button.scale.setScalar(isHover ? 1.08 : 1.0);
    };

    this._button.userData.onSelect = () => {
      audioManager.play('chime');
      voiceManager.play('welcome');
      this.hide();
      if (this.onStart) this.onStart();
    };

    this.input.register(this._button);
  }

  _draw() {
    const { _canvas: canvas, _ctx: ctx } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark header background
    ctx.fillStyle = 'rgba(20, 10, 0, 0.95)';
    this._roundRect(ctx, 0, 0, canvas.width, canvas.height, 16);
    ctx.fill();

    // Gold outer border
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    this._roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 14);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("🧠 WELCOME TO BRAINDONALD'S!", canvas.width / 2, 42);

    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('Your goal: Serve customer knowledge orders!', canvas.width / 2, 70);

    // Divider line
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 84);
    ctx.lineTo(canvas.width - 40, 84);
    ctx.stroke();

    // Step instructions
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px Arial';

    const steps = [
      { num: '1️⃣', text: 'Listen & read customer orders at the counter' },
      { num: '2️⃣', text: 'Go to the matching shelf & tap the bin lock' },
      { num: '3️⃣', text: 'Solve the 3×3 memory pattern to open the door' },
      { num: '4️⃣', text: 'Pick up the item & deliver it to the DELIVER station!' },
    ];

    steps.forEach((s, i) => {
      const y = 115 + i * 32;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(s.num, 36, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.text, 72, y);
    });

    this._texture.needsUpdate = true;
  }

  show() {
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
    this.input.unregister(this._button);
  }

  update(camera) {
    if (!this.group.visible) return;
    // Always face camera gently
    this.group.lookAt(camera.position);
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
