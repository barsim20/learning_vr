/**
 * VRSession.js
 * Manages the WebXR session lifecycle.
 * Falls back to desktop OrbitControls when WebXR is unavailable.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class VRSession {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Camera} camera
   */
  constructor(renderer, camera) {
    this.renderer   = renderer;
    this.camera     = camera;
    this.supported  = false;
    this.presenting = false;

    this._orbitControls = null;
    this._vrButton      = document.getElementById('vr-button');
    this._statusEl      = document.getElementById('status');
  }

  /** Check WebXR support and set up the Enter VR button. */
  async init() {
    if (!navigator.xr) {
      this._setStatus('WebXR not supported — running in desktop mode');
      this._setupDesktopFallback();
      return;
    }

    this.supported = await navigator.xr.isSessionSupported('immersive-vr');

    if (this.supported) {
      this._setStatus('Quest 3 ready — click Enter VR');
      this._vrButton.disabled = false;
      this._vrButton.addEventListener('click', () => this._startVR());
    } else {
      this._setStatus('VR not supported — running in desktop mode');
      this._setupDesktopFallback();
    }
  }

  async _startVR() {
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
    });

    this.renderer.xr.enabled = true;
    await this.renderer.xr.setSession(session);
    this.presenting = true;

    session.addEventListener('end', () => {
      this.presenting = false;
      this._setStatus('VR session ended');
    });

    this._vrButton.style.display = 'none';
    this._setStatus('');
  }

  _setupDesktopFallback() {
    this._vrButton.style.display = 'none';
    this._orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this._orbitControls.enableDamping = true;
    this._orbitControls.dampingFactor = 0.1;
    this._orbitControls.target.set(0, 1.4, 0.5); // Target customer in front of counter
    this.camera.position.set(0, 1.6, -1.8);     // Store Manager behind counter
    this._orbitControls.update();
  }

  /** Call every frame to keep OrbitControls smooth */
  update() {
    if (this._orbitControls) this._orbitControls.update();
  }

  _setStatus(msg) {
    if (this._statusEl) this._statusEl.textContent = msg;
  }
}
