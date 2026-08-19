/**
 * Scoreboard.js
 * A 3D scoreboard at the delivery station showing delivery count.
 * Updates via canvas texture re-draw on each score change.
 */

import * as THREE from 'three';

export class Scoreboard {
  /**
   * @param {THREE.Object3D} parent
   * @param {THREE.Vector3} localPos  position relative to parent
   */
  constructor(parent, localPos = new THREE.Vector3(0, 1.6, 0)) {
    this._score  = 0;
    this._streak = 0;

    // Canvas
    this._canvas  = document.createElement('canvas');
    this._canvas.width  = 256;
    this._canvas.height = 160;
    this._ctx     = this._canvas.getContext('2d');
    this._texture = new THREE.CanvasTexture(this._canvas);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.5),
      new THREE.MeshStandardMaterial({ map: this._texture, transparent: true, side: THREE.DoubleSide }),
    );
    mesh.position.copy(localPos);
    parent.add(mesh);

    this._draw();
  }

  update({ score, streak }) {
    this._score  = score;
    this._streak = streak;
    this._draw();
  }

  _draw() {
    const { _canvas: canvas, _ctx: ctx } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#1a0a00';
    this._roundRect(ctx, 0, 0, canvas.width, canvas.height, 14);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth   = 4;
    this._roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 12);
    ctx.stroke();

    // Score
    ctx.fillStyle = '#ffd166';
    ctx.font      = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Deliveries', canvas.width / 2, 36);

    ctx.font      = 'bold 60px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(this._score), canvas.width / 2, 100);

    // Streak
    if (this._streak >= 3) {
      ctx.font      = 'bold 18px Arial';
      ctx.fillStyle = '#06d6a0';
      ctx.fillText(`🔥 ${this._streak} in a row!`, canvas.width / 2, 140);
    }

    this._texture.needsUpdate = true;
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
