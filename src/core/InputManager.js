/**
 * InputManager.js
 * Multi-modal Input Manager:
 *  - Gaze Dwell (hands-free head tracking with progress reticle)
 *  - WebXR Hand Pinch (gesture control)
 *  - VR Controller Raycasting
 *  - Desktop Mouse Click
 *
 * Emits: 'select', 'hover' events on interactive objects.
 */

import * as THREE from 'three';
import { GazeReticle } from '../ui/GazeReticle.js';
import { audioManager } from './AudioManager.js';

const DWELL_TIME_MS = 1000; // 1 second continuous gaze triggers selection

export class InputManager {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {THREE.Group} [cameraRig]
   */
  constructor(renderer, scene, camera, cameraRig = null) {
    this.renderer      = renderer;
    this.scene         = scene;
    this.camera        = camera;
    this.cameraRig     = cameraRig;
    this.interactables = []; // THREE.Object3D[] that can be selected
    this._modalInteractables = null; // When active, raycasts ONLY test these objects

    this._raycaster    = new THREE.Raycaster();
    this._mouse        = new THREE.Vector2();
    this._hovered      = null;

    // Gaze Dwell tracking
    this.reticle       = new GazeReticle(camera);
    this._gazeTarget   = null;
    this._gazeStartTime = 0;
    this._gazeTriggered = false;

    // Hand tracking state
    this._pinchingHands = new Set(); // set of inputSource hands currently pinching
    this._lastHandTarget = null; // { hit, time } for pinch target retention

    // VR controllers
    this._controllers  = [];

    this._setupDesktop();
    this._setupVR();
  }

  // ── Modal Isolation ──────────────────────────────────────────────────────

  setModal(interactables) {
    this._modalInteractables = Array.isArray(interactables) ? interactables : [interactables];
    if (this._hovered && !this._isObjectInModal(this._hovered)) {
      this._fireHover(this._hovered, false);
      this._hovered = null;
    }
  }

  clearModal() {
    this._modalInteractables = null;
  }

  _isObjectInModal(obj) {
    if (!this._modalInteractables) return true;
    let cur = obj;
    while (cur) {
      if (this._modalInteractables.includes(cur)) return true;
      cur = cur.parent;
    }
    return false;
  }

  _getActiveInteractables() {
    return this._modalInteractables || this.interactables;
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

  _getActiveCamera() {
    return this.renderer.xr.isPresenting ? this.renderer.xr.getCamera() : this.camera;
  }

  _castFromMouse() {
    this._raycaster.setFromCamera(this._mouse, this._getActiveCamera());
    const hits = this._raycaster.intersectObjects(this._getActiveInteractables(), true);
    return hits.length > 0 ? this._findInteractable(hits[0].object) : null;
  }

  // ── Gaze Raycasting ──────────────────────────────────────────────────────

  _castFromCamera() {
    this._raycaster.setFromCamera({ x: 0, y: 0 }, this._getActiveCamera());
    const hits = this._raycaster.intersectObjects(this._getActiveInteractables(), true);
    return hits.length > 0 ? this._findInteractable(hits[0].object) : null;
  }

  // ── VR (controllers & hands) ─────────────────────────────────────────────

  _setupVR() {
    const renderer = this.renderer;
    const parentContainer = this.cameraRig || this.scene;

    for (let i = 0; i < 2; i++) {
      const ctrl = renderer.xr.getController(i);
      ctrl.addEventListener('selectstart', () => {
        const hit = this._castFromController(ctrl);
        if (hit) this._fireSelect(hit);
      });
      parentContainer.add(ctrl);

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
    const hits = this._raycaster.intersectObjects(this._getActiveInteractables(), true);
    return hits.length > 0 ? this._findInteractable(hits[0].object) : null;
  }

  // ── WebXR Hand Tracking & Gesture Recognition ───────────────────────────

  _updateHandGestures() {
    const session = this.renderer.xr.getSession();
    if (!session || !session.inputSources) {
      this._hideHandRays();
      return null;
    }

    const frame = this.renderer.xr.getFrame();
    const referenceSpace = this.renderer.xr.getReferenceSpace();
    if (!frame || !referenceSpace) {
      this._hideHandRays();
      return null;
    }

    let handHit = null;
    const activeSources = new Set();
    const now = performance.now();

    for (const source of session.inputSources) {
      if (source.hand) {
        activeSources.add(source);

        const indexTip = source.hand.get('index-finger-tip');
        const thumbTip = source.hand.get('thumb-tip');
        const wrist = source.hand.get('wrist');
        const indexProximal = source.hand.get('index-finger-phalanx-proximal') ||
                              source.hand.get('index-finger-metacarpal');

        if (indexTip && thumbTip) {
          const indexPose = frame.getJointPose?.(indexTip, referenceSpace);
          const thumbPose = frame.getJointPose?.(thumbTip, referenceSpace);

          if (indexPose && thumbPose) {
            const p1 = indexPose.transform.position;
            const p2 = thumbPose.transform.position;
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);

            const isPinching = dist < 0.035; // 3.5 cm pinch threshold
            const wasPinching = this._pinchingHands.has(source);

            // Compute stabilized ray origin and direction in WebXR reference space
            let localRayOrigin = new THREE.Vector3(p1.x, p1.y, p1.z);
            let localRayDir = new THREE.Vector3();
            let haveValidRay = false;

            // Preferred: WebXR runtime targetRaySpace (calibrated, stabilized pinch-aim ray)
            const targetRayPose = source.targetRaySpace ? frame.getPose?.(source.targetRaySpace, referenceSpace) : null;
            if (targetRayPose) {
              localRayOrigin.set(
                targetRayPose.transform.position.x,
                targetRayPose.transform.position.y,
                targetRayPose.transform.position.z,
              );
              const q = targetRayPose.transform.orientation;
              const quat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
              localRayDir.set(0, 0, -1).applyQuaternion(quat).normalize();
              haveValidRay = true;
            }

            // Fallback: Arm/palm vector (wrist -> index base) which does not curl during pinch
            if (!haveValidRay && wrist && indexProximal) {
              const wristPose = frame.getJointPose?.(wrist, referenceSpace);
              const indexBasePose = frame.getJointPose?.(indexProximal, referenceSpace);
              if (wristPose && indexBasePose) {
                const pw = wristPose.transform.position;
                const pb = indexBasePose.transform.position;
                localRayOrigin.set(pb.x, pb.y, pb.z);
                localRayDir.set(pb.x - pw.x, pb.y - pw.y, pb.z - pw.z);
                if (localRayDir.lengthSq() > 0.0001) {
                  localRayDir.normalize();
                  haveValidRay = true;
                }
              }
            }

            // Secondary fallback: forward from active camera
            if (!haveValidRay) {
              this._getActiveCamera().getWorldDirection(localRayDir);
            }

            // Transform origin and direction into Three.js World Space via cameraRig
            const worldRayOrigin = this.cameraRig
              ? this.cameraRig.localToWorld(localRayOrigin.clone())
              : localRayOrigin.clone();

            const worldRayDir = this.cameraRig
              ? localRayDir.clone().applyQuaternion(this.cameraRig.quaternion).normalize()
              : localRayDir.clone();

            // Raycast along world ray
            this._raycaster.set(worldRayOrigin, worldRayDir);
            const hits = this._raycaster.intersectObjects(this._getActiveInteractables(), true);
            let currentHit = null;
            let rayLength = 3.0;

            if (hits.length > 0) {
              currentHit = this._findInteractable(hits[0].object);
              rayLength = hits[0].distance;
            }

            if (currentHit) {
              handHit = currentHit;
              this._lastHandTarget = { hit: currentHit, time: now };
            }

            // Visual ray line in scene space
            const line = this._getOrCreateHandRay(source);
            const endPos = worldRayOrigin.clone().addScaledVector(worldRayDir, rayLength);
            line.geometry.setFromPoints([worldRayOrigin, endPos]);
            line.geometry.attributes.position.needsUpdate = true;
            line.material.color.setHex(isPinching ? 0xffd166 : 0x06d6a0);
            line.material.opacity = isPinching ? 1.0 : 0.6;
            line.visible = true;

            // Handle Pinch Trigger with Target Retention Buffer
            if (isPinching && !wasPinching) {
              this._pinchingHands.add(source);
              let targetToSelect = currentHit;
              // Target retention: if ray slipped within last 200ms during pinch gesture, select buffered target
              if (!targetToSelect && this._lastHandTarget && (now - this._lastHandTarget.time < 200)) {
                targetToSelect = this._lastHandTarget.hit;
              }
              if (targetToSelect) {
                this._fireSelect(targetToSelect);
              }
            } else if (!isPinching && wasPinching) {
              this._pinchingHands.delete(source);
            }
          }
        }
      }
    }

    // Hide rays for inactive hand sources
    if (this._handRayMap) {
      for (const [source, line] of this._handRayMap.entries()) {
        if (!activeSources.has(source)) {
          line.visible = false;
        }
      }
    }

    return handHit;
  }

  _getOrCreateHandRay(source) {
    if (!this._handRayMap) this._handRayMap = new Map();
    let line = this._handRayMap.get(source);
    if (!line) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -3),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x06d6a0,
        transparent: true,
        opacity: 0.6,
      });
      line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this._handRayMap.set(source, line);
    }
    return line;
  }

  _hideHandRays() {
    if (this._handRayMap) {
      for (const line of this._handRayMap.values()) {
        line.visible = false;
      }
    }
  }

  // ── Main Update (called each frame) ──────────────────────────────────────

  update() {
    let hit = null;
    const now = performance.now();

    // 1. Check Controllers & Hand Pinch
    if (this.renderer.xr.isPresenting) {
      for (const ctrl of this._controllers) {
        hit = this._castFromController(ctrl);
        if (hit) break;
      }

      const handHit = this._updateHandGestures();
      if (!hit && handHit) hit = handHit;
    }

    // 2. Gaze Dwell (Head Tracking)
    const gazeHit = this._castFromCamera();
    if (!hit && gazeHit) {
      hit = gazeHit;
    }

    // Process Gaze Dwell Progress & Auto-Select
    if (gazeHit) {
      if (this._gazeTarget !== gazeHit) {
        this._gazeTarget = gazeHit;
        this._gazeStartTime = now;
        this._gazeTriggered = false;
      } else if (!this._gazeTriggered) {
        const elapsed = now - this._gazeStartTime;
        const progress = Math.min(elapsed / DWELL_TIME_MS, 1.0);

        this.reticle.setProgress(progress, true);

        if (progress >= 1.0) {
          this._gazeTriggered = true;
          this._fireSelect(gazeHit);
          this.reticle.setProgress(0, true);
        }
      }
    } else {
      this._gazeTarget = null;
      this._gazeTriggered = false;
      this.reticle.setProgress(0, false);
    }

    // 3. Process Desktop Hover
    if (!this.renderer.xr.isPresenting && !hit) {
      hit = this._castFromMouse();
    }

    // Fire Hover events
    if (hit !== this._hovered) {
      if (this._hovered) this._fireHover(this._hovered, false);
      if (hit)           this._fireHover(hit, true);
      this._hovered = hit;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _findInteractable(obj) {
    // Check hierarchy visibility
    let check = obj;
    while (check) {
      if (check.visible === false) return null;
      check = check.parent;
    }
    const pool = this._getActiveInteractables();
    let cur = obj;
    while (cur) {
      if (pool.includes(cur)) return cur;
      cur = cur.parent;
    }
    return null;
  }

  _fireSelect(obj) {
    if (obj.userData.cellIndex === undefined) {
      audioManager.play('click');
    }
    if (obj.userData.onSelect) obj.userData.onSelect(obj);
  }

  _fireHover(obj, isHover) {
    if (isHover) {
      audioManager.play('hover', { volume: 0.2 });
    }
    if (obj.userData.onHover) obj.userData.onHover(obj, isHover);
  }

  register(obj) {
    if (!this.interactables.includes(obj)) this.interactables.push(obj);
  }

  unregister(obj) {
    this.interactables = this.interactables.filter(o => o !== obj);
  }
}
