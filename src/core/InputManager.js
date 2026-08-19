/**
 * InputManager.js
 * Unified input: VR controller raycasting + desktop mouse.
 *
 * Emits: 'select', 'hover' events on interactive objects.
 * Objects opt-in by being added to InputManager.interactables.
 */

import * as THREE from 'three';

export class InputManager {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(renderer, scene, camera) {
    this.renderer      = renderer;
    this.scene         = scene;
    this.camera        = camera;
    this.interactables = []; // THREE.Object3D[] that can be selected

    this._raycaster    = new THREE.Raycaster();
    this._mouse        = new THREE.Vector2();
    this._hovered      = null;

    // VR controller references (set when XR session starts)
    this._controllers  = [];

    this._setupDesktop();
    this._setupVR();
  }

  // ── Desktop (mouse) ──────────────────────────────────────────────────────

  _setupDesktop() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', e => {
      this._mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    canvas.addEventListener('click', () => {
      const hit = this._castFromMouse();
      if (hit) this._fireSelect(hit);
    });
  }

  _castFromMouse() {
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const hits = this._raycaster.intersectObjects(this.interactables, true);
    return hits.length > 0 ? this._findInteractable(hits[0].object) : null;
  }

  // ── VR (controller) ──────────────────────────────────────────────────────

  _setupVR() {
    const renderer = this.renderer;

    for (let i = 0; i < 2; i++) {
      const ctrl = renderer.xr.getController(i);
      ctrl.addEventListener('selectstart', () => {
        const hit = this._castFromController(ctrl);
        if (hit) this._fireSelect(hit);
      });
      this.scene.add(ctrl);

      // Visual ray line
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -5),
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.6 });
      const line = new THREE.Line(geo, mat);
      ctrl.add(line);
      ctrl.userData.ray = line;

      this._controllers.push(ctrl);
    }
  }

  _castFromController(ctrl) {
    const origin    = new THREE.Vector3();
    const direction = new THREE.Vector3(0, 0, -1);
    origin.setFromMatrixPosition(ctrl.matrixWorld);
    direction.transformDirection(ctrl.matrixWorld).normalize();

    this._raycaster.set(origin, direction);
    const hits = this._raycaster.intersectObjects(this.interactables, true);
    return hits.length > 0 ? this._findInteractable(hits[0].object) : null;
  }

  // ── Hover (called each frame) ─────────────────────────────────────────────

  update() {
    let hit = null;

    if (this.renderer.xr.isPresenting) {
      // VR: use first controller that hits something
      for (const ctrl of this._controllers) {
        hit = this._castFromController(ctrl);
        if (hit) break;
      }
    } else {
      hit = this._castFromMouse();
    }

    if (hit !== this._hovered) {
      if (this._hovered) this._fireHover(this._hovered, false);
      if (hit)           this._fireHover(hit, true);
      this._hovered = hit;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Walk up the hierarchy to find the registered interactable ancestor */
  _findInteractable(obj) {
    let cur = obj;
    while (cur) {
      if (this.interactables.includes(cur)) return cur;
      cur = cur.parent;
    }
    return null;
  }

  _fireSelect(obj) {
    if (obj.userData.onSelect) obj.userData.onSelect(obj);
  }

  _fireHover(obj, isHover) {
    if (obj.userData.onHover) obj.userData.onHover(obj, isHover);
  }

  register(obj) {
    if (!this.interactables.includes(obj)) this.interactables.push(obj);
  }

  unregister(obj) {
    this.interactables = this.interactables.filter(o => o !== obj);
  }
}
