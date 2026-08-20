/**
 * InputManager.js
 * Multi-modal Input Manager:
 *  - Gaze Dwell (hands-free head tracking with progress reticle)
 *  - WebXR Hand Pinch (gesture control with Quest 3 joint tracking & target retention)
 *  - VR Controller Raycasting (with matrix world synchronization)
 *  - Desktop Mouse Click
 *
 * Emits: 'select', 'hover' events on interactive objects.
 */

import * as THREE from 'three';
import { GazeReticle } from '../ui/GazeReticle.js';
import { audioManager } from './AudioManager.js';

const DWELL_TIME_MS = 1000; // 1 second continuous gaze triggers selection
const PINCH_THRESHOLD_START = 0.038; // 3.8 cm: pinch activates
const PINCH_THRESHOLD_RELEASE = 0.050; // 5.0 cm: pinch releases (hysteresis)
const TARGET_RETENTION_MS = 350; // 350ms buffer for hand twitch during pinch
const SELECT_DEBOUNCE_MS = 250; // 250ms debounce between select clicks

// Reusable scratch objects to eliminate per-frame GC allocations
const _vOrigin = new THREE.Vector3();
const _vDirection = new THREE.Vector3();
const _vLocalRayOrigin = new THREE.Vector3();
const _vLocalRayDir = new THREE.Vector3();
const _vWorldRayOrigin = new THREE.Vector3();
const _vWorldRayDir = new THREE.Vector3();
const _vEndPos = new THREE.Vector3();
const _qTemp = new THREE.Quaternion();

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
    this.reticle       = new GazeReticle(camera, scene);
    this._gazeTarget   = null;
    this._gazeStartTime = 0;
    this._gazeTriggered = false;

    // Hand tracking & Controller state
    this._pinchingHands = new Set(); // set of inputSource hands currently pinching
    this._lastHandTargetMap = new Map(); // source/ctrl -> { hit, time } for pinch target retention
    this._lastSelectTime = 0;
    this._lastSelectedObj = null;

    // VR controllers and hands
    this._controllers  = [];
    this._hands        = [];
    this._handRayMap   = new Map();

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
    const cam = this._getActiveCamera();
    cam.getWorldPosition(_vOrigin);
    cam.getWorldDirection(_vDirection);

    this._raycaster.set(_vOrigin, _vDirection);
    const hits = this._raycaster.intersectObjects(this._getActiveInteractables(), true);
    return hits.length > 0 ? this._findInteractable(hits[0].object) : null;
  }

  // ── VR (controllers & hands) ─────────────────────────────────────────────

  _setupVR() {
    const renderer = this.renderer;
    const parentContainer = this.cameraRig || this.scene;

    for (let i = 0; i < 2; i++) {
      // 1. Controller TargetRaySpace (pointing ray)
      const ctrl = renderer.xr.getController(i);

      const handleSelect = () => {
        if (this.cameraRig) this.cameraRig.updateMatrixWorld(true);
        ctrl.updateMatrixWorld(true);

        const hit = this._castFromController(ctrl);
        const now = performance.now();
        let target = hit;

        // Check target retention buffer if instant ray missed due to pinch movement
        if (!target) {
          const buffered = this._lastHandTargetMap.get(ctrl);
          if (buffered && (now - buffered.time < TARGET_RETENTION_MS)) {
            target = buffered.hit;
          }
        }

        if (target) {
          this._fireSelect(target);
        }
      };

      ctrl.addEventListener('selectstart', handleSelect);
      ctrl.addEventListener('select', handleSelect);
      parentContainer.add(ctrl);

      // Visual ray line for controller
      const positions = new Float32Array([0, 0, 0, 0, 0, -5]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x06d6a0,
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.Line(geo, mat);
      ctrl.add(line);
      ctrl.userData.ray = line;

      this._controllers.push(ctrl);
    }
  }

  _castFromController(ctrl) {
    if (this.cameraRig) this.cameraRig.updateMatrixWorld(true);
    ctrl.updateMatrixWorld(true);

    _vOrigin.setFromMatrixPosition(ctrl.matrixWorld);
    _vDirection.set(0, 0, -1).transformDirection(ctrl.matrixWorld).normalize();

    this._raycaster.set(_vOrigin, _vDirection);
    const hits = this._raycaster.intersectObjects(this._getActiveInteractables(), true);
    let hit = hits.length > 0 ? this._findInteractable(hits[0].object) : null;

    if (hit) {
      this._lastHandTargetMap.set(ctrl, { hit, time: performance.now() });
    }

    // Update visual ray
    if (ctrl.userData.ray) {
      const rayLine = ctrl.userData.ray;
      const rayLength = (hits.length > 0) ? hits[0].distance : 5.0;
      const posAttr = rayLine.geometry.attributes.position;
      posAttr.setXYZ(0, 0, 0, 0);
      posAttr.setXYZ(1, 0, 0, -rayLength);
      posAttr.needsUpdate = true;
      rayLine.material.color.setHex(hit ? 0xffd166 : 0x06d6a0);
      rayLine.material.opacity = hit ? 1.0 : 0.6;
      rayLine.visible = true;
    }

    return hit;
  }

  // ── WebXR Hand Tracking & Gesture Recognition ───────────────────────────

  _updateHandGestures() {
    try {
      const session = this.renderer.xr.getSession();
      if (!session || !session.inputSources) {
        this._hideHandRays();
        return null;
      }

      const frame = this.renderer.xr.getFrame ? this.renderer.xr.getFrame() : null;
      const referenceSpace = this.renderer.xr.getReferenceSpace ? this.renderer.xr.getReferenceSpace() : null;
      if (!frame || !referenceSpace) {
        this._hideHandRays();
        return null;
      }

      if (this.cameraRig) {
        this.cameraRig.updateMatrixWorld(true);
      }

      let primaryHandHit = null;
      const activeSources = new Set();
      const now = performance.now();

      for (const source of session.inputSources) {
        if (source.hand && typeof source.hand.get === 'function') {
          activeSources.add(source);

          const indexTip = source.hand.get('index-finger-tip');
          const middleTip = source.hand.get('middle-finger-tip');
          const thumbTip = source.hand.get('thumb-tip');
          const wrist = source.hand.get('wrist');
          const indexProximal = source.hand.get('index-finger-phalanx-proximal') ||
                                source.hand.get('index-finger-metacarpal');

          if (indexTip && thumbTip) {
            const indexPose = frame.getJointPose ? frame.getJointPose(indexTip, referenceSpace) : null;
            const thumbPose = frame.getJointPose ? frame.getJointPose(thumbTip, referenceSpace) : null;

            if (indexPose && thumbPose && indexPose.transform && thumbPose.transform) {
              const p1 = indexPose.transform.position;
              const p2 = thumbPose.transform.position;
              const distIndex = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);

              // Optional middle finger pinch check for ergonomics
              let distMiddle = 1.0;
              if (middleTip && frame.getJointPose) {
                const middlePose = frame.getJointPose(middleTip, referenceSpace);
                if (middlePose && middlePose.transform) {
                  const pm = middlePose.transform.position;
                  distMiddle = Math.hypot(pm.x - p2.x, pm.y - p2.y, pm.z - p2.z);
                }
              }

              const wasPinching = this._pinchingHands.has(source);
              const isPinching = wasPinching
                ? (distIndex < PINCH_THRESHOLD_RELEASE || distMiddle < PINCH_THRESHOLD_RELEASE)
                : (distIndex < PINCH_THRESHOLD_START || distMiddle < PINCH_THRESHOLD_START);

              // Compute stabilized ray origin and direction in WebXR reference space
              _vLocalRayOrigin.set(p1.x, p1.y, p1.z);
              let haveValidRay = false;

              // Preferred: WebXR runtime targetRaySpace (calibrated, stabilized pinch-aim ray)
              const targetRayPose = (source.targetRaySpace && frame.getPose)
                ? frame.getPose(source.targetRaySpace, referenceSpace)
                : null;

              if (targetRayPose && targetRayPose.transform) {
                _vLocalRayOrigin.set(
                  targetRayPose.transform.position.x,
                  targetRayPose.transform.position.y,
                  targetRayPose.transform.position.z,
                );
                const q = targetRayPose.transform.orientation;
                _qTemp.set(q.x, q.y, q.z, q.w);
                _vLocalRayDir.set(0, 0, -1).applyQuaternion(_qTemp).normalize();
                haveValidRay = true;
              }

              // Fallback: Arm/palm vector (wrist -> index base) which does not curl during pinch
              if (!haveValidRay && wrist && indexProximal && frame.getJointPose) {
                const wristPose = frame.getJointPose(wrist, referenceSpace);
                const indexBasePose = frame.getJointPose(indexProximal, referenceSpace);
                if (wristPose && indexBasePose && wristPose.transform && indexBasePose.transform) {
                  const pw = wristPose.transform.position;
                  const pb = indexBasePose.transform.position;
                  _vLocalRayOrigin.set(pb.x, pb.y, pb.z);
                  _vLocalRayDir.set(pb.x - pw.x, pb.y - pw.y, pb.z - pw.z);
                  if (_vLocalRayDir.lengthSq() > 0.0001) {
                    _vLocalRayDir.normalize();
                    haveValidRay = true;
                  }
                }
              }

              // Secondary fallback: forward from active camera
              if (!haveValidRay) {
                this._getActiveCamera().getWorldDirection(_vLocalRayDir);
              }

              // Transform origin and direction into Three.js World Space via cameraRig
              if (this.cameraRig) {
                _vWorldRayOrigin.copy(_vLocalRayOrigin);
                this.cameraRig.localToWorld(_vWorldRayOrigin);
                _vWorldRayDir.copy(_vLocalRayDir).applyQuaternion(this.cameraRig.quaternion).normalize();
              } else {
                _vWorldRayOrigin.copy(_vLocalRayOrigin);
                _vWorldRayDir.copy(_vLocalRayDir);
              }

              // Raycast along world ray
              this._raycaster.set(_vWorldRayOrigin, _vWorldRayDir);
              const hits = this._raycaster.intersectObjects(this._getActiveInteractables(), true);
              let currentHit = null;
              let rayLength = 5.0;

              if (hits.length > 0) {
                currentHit = this._findInteractable(hits[0].object);
                rayLength = hits[0].distance;
              }

              if (currentHit) {
                if (!primaryHandHit) primaryHandHit = currentHit;
                this._lastHandTargetMap.set(source, { hit: currentHit, time: now });
              }

              // Visual ray line in scene space
              const line = this._getOrCreateHandRay(source);
              _vEndPos.copy(_vWorldRayOrigin).addScaledVector(_vWorldRayDir, rayLength);
              const posAttr = line.geometry.attributes.position;
              posAttr.setXYZ(0, _vWorldRayOrigin.x, _vWorldRayOrigin.y, _vWorldRayOrigin.z);
              posAttr.setXYZ(1, _vEndPos.x, _vEndPos.y, _vEndPos.z);
              posAttr.needsUpdate = true;
              line.material.color.setHex(isPinching ? 0xffd166 : (currentHit ? 0xffd166 : 0x06d6a0));
              line.material.opacity = isPinching ? 1.0 : (currentHit ? 0.9 : 0.5);
              line.visible = true;

              // Handle Pinch Trigger with Per-Hand Target Retention Buffer
              if (isPinching && !wasPinching) {
                this._pinchingHands.add(source);
                let targetToSelect = currentHit;

                // If ray slipped off target during the pinch movement, select buffered target
                if (!targetToSelect) {
                  const buffered = this._lastHandTargetMap.get(source);
                  if (buffered && (now - buffered.time < TARGET_RETENTION_MS)) {
                    targetToSelect = buffered.hit;
                  }
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

      return primaryHandHit;
    } catch (err) {
      console.warn('Hand tracking update warning:', err);
      return null;
    }
  }

  _getOrCreateHandRay(source) {
    if (!this._handRayMap) this._handRayMap = new Map();
    let line = this._handRayMap.get(source);
    if (!line) {
      const positions = new Float32Array(6);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
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
    const activeCamera = this._getActiveCamera();

    // Ensure cameraRig world transform is synchronized
    if (this.cameraRig) {
      this.cameraRig.updateMatrixWorld(true);
    }

    // Update Gaze Reticle tracking
    if (this.reticle) {
      this.reticle.update(activeCamera);
    }

    // 1. Check VR Hands & Controllers
    if (this.renderer.xr.isPresenting) {
      const handHit = this._updateHandGestures();
      if (handHit) hit = handHit;

      for (const ctrl of this._controllers) {
        const ctrlHit = this._castFromController(ctrl);
        if (!hit && ctrlHit) hit = ctrlHit;
      }
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
    const now = performance.now();
    // Debounce duplicate events on the same object within 250ms
    if (this._lastSelectedObj === obj && (now - this._lastSelectTime < SELECT_DEBOUNCE_MS)) {
      return;
    }
    this._lastSelectedObj = obj;
    this._lastSelectTime = now;

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
