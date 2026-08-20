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
   * @param {THREE.Group} [cameraRig]
   */
  constructor(renderer, camera, cameraRig = null) {
    this.renderer   = renderer;
    this.camera     = camera;
    this.cameraRig  = cameraRig;
    this.supported  = false;
    this.presenting = false;

    this._orbitControls = null;
    this._vrButton      = document.getElementById('vr-button');
    this._statusEl      = document.getElementById('status');
  }

  /** Check WebXR support and set up the Enter VR button. */
  async init() {
    try {
      if (!navigator.xr) {
        this._setStatus('WebXR not supported — running in desktop mode');
        this._setupDesktopFallback();
        return;
      }

      this.supported = await navigator.xr.isSessionSupported('immersive-vr');

      if (this.supported) {
        this._setStatus('Quest 3 ready — click Enter VR');
        if (this._vrButton) {
          this._vrButton.disabled = false;
          this._vrButton.addEventListener('click', () => this._startVR());
        }
      } else {
        this._setStatus('VR not supported — running in desktop mode');
        this._setupDesktopFallback();
      }
    } catch (err) {
      console.error('VRSession init error:', err);
      this._setStatus('VR Init Error: ' + (err.message || err));
      this._setupDesktopFallback();
    }
  }

  async _startVR() {
    try {
      this._setStatus('Starting VR session…');
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });

      if (this.cameraRig) {
        this.cameraRig.position.set(0, 0, -2.0); // Store Manager position behind counter
        this.cameraRig.rotation.set(0, 0, 0); // Keep identity rotation for 1:1 natural physical head tracking
        this.cameraRig.updateMatrixWorld(true);
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.set(0, 0, 0);
      }

      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);
      this.presenting = true;

      session.addEventListener('end', () => {
        this.presenting = false;
        this._setStatus('VR session ended — click Enter VR to resume');
        if (this._vrButton) {
          this._vrButton.style.display = 'block';
          this._vrButton.disabled = false;
        }
        if (this._orbitControls) this._orbitControls.enabled = true;
      });

      if (this._orbitControls) this._orbitControls.enabled = false;
      if (this._vrButton) this._vrButton.style.display = 'none';
      this._setStatus('');
    } catch (err) {
      console.error('Failed to start VR session:', err);
      this._setStatus('Failed to enter VR: ' + (err.message || err));
      if (this._vrButton) this._vrButton.disabled = false;
    }
  }

  _setupDesktopFallback() {
    this._vrButton.style.display = 'none';
    if (this.cameraRig) {
      this.cameraRig.position.set(0, 0, 0);
      this.cameraRig.rotation.set(0, 0, 0);
    }
    this.camera.position.set(0, 1.6, -2.0);
    this._orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this._orbitControls.enableDamping = true;
    this._orbitControls.dampingFactor = 0.1;
    this._orbitControls.target.set(0, 1.4, 0.5); // Target customer in front of counter
    this._orbitControls.update();
  }

  /** Call every frame to keep OrbitControls smooth */
  update() {
    if (this._orbitControls && !this.presenting) this._orbitControls.update();
  }

  _setStatus(msg) {
    if (this._statusEl) this._statusEl.textContent = msg;
  }
}
