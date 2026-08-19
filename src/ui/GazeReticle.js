/**
 * GazeReticle.js
 * Visual Gaze Reticle & Dwell Progress Indicator.
 * Attached to the camera. Fills a circular progress ring when looking at an interactable object.
 */

import * as THREE from 'three';

export class GazeReticle {
  /**
   * @param {THREE.Camera} camera
   */
  constructor(camera) {
    this.camera = camera;
    this.group  = new THREE.Group();

    // Canvas texture for dynamic progress ring
    this._canvas = document.createElement('canvas');
    this._canvas.width  = 128;
    this._canvas.height = 128;
    this._ctx    = this._canvas.getContext('2d');
    this._texture = new THREE.CanvasTexture(this._canvas);

    this._sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this._texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
    );
    this._sprite.scale.set(0.04, 0.04, 1);
    this.group.add(this._sprite);

    // Position reticle 1 meter in front of camera
    this.group.position.set(0, 0, -1);
    camera.add(this.group);

    this._progress = 0; // 0.0 to 1.0
    this._isHovering = false;

    this.draw(0, false);
  }

  /**
   * Update progress (0.0 to 1.0)
   * @param {number} progress  0.0 = empty, 1.0 = full dwell
   * @param {boolean} isHovering
   */
  setProgress(progress, isHovering) {
    if (this._progress !== progress || this._isHovering !== isHovering) {
      this._progress   = progress;
      this._isHovering = isHovering;
      this.draw(progress, isHovering);
    }
  }

  draw(progress, isHovering) {
    const { _canvas: canvas, _ctx: ctx } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const center = 64;
    const radius = 24;

    // Center dot
    ctx.fillStyle = isHovering ? '#ffd166' : 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(center, center, isHovering ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();

    // Outer background ring (subtle when hovering)
    if (isHovering) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Active Dwell Progress Arc
      if (progress > 0) {
        ctx.strokeStyle = '#06d6a0'; // bright green completion ring
        ctx.lineWidth   = 6;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        const startAngle = -Math.PI / 2;
        const endAngle   = startAngle + (Math.PI * 2 * progress);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.stroke();
      }
    }

    this._texture.needsUpdate = true;
  }
}
