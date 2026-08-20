/**
 * main.js
 * BrainDonald's — entry point.
 * Sets up Three.js renderer, WebXR, scene, UI overlays, Teleportation, and the game loop.
 */

import * as THREE from 'three';
import { VRSession }      from './core/VRSession.js';
import { InputManager }   from './core/InputManager.js';
import { audioManager, SFX_MAP } from './core/AudioManager.js';

import { Restaurant }     from './environment/Restaurant.js';
import { Counter }        from './environment/Counter.js';
import { StorageAisle }   from './environment/StorageAisle.js';
import { DeliveryStation } from './environment/DeliveryStation.js';

import { OrderSystem }    from './gameplay/OrderSystem.js';
import { TeleportSystem } from './gameplay/TeleportSystem.js';
import { gameState, STATE } from './core/GameState.js';

import { StartScreen }    from './ui/StartScreen.js';
import { ObjectiveHUD }   from './ui/ObjectiveHUD.js';
import { conceptOverlayManager } from './ui/ConceptOverlayManager.js';

// ── Renderer ────────────────────────────────────────────────────────────────

const canvas   = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap;
renderer.xr.enabled        = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.outputColorSpace   = THREE.SRGBColorSpace;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── Scene, Camera & Player Rig ───────────────────────────────────────────────

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a00); // dark warm
scene.fog = new THREE.Fog(0x1a0a00, 12, 22);

const cameraRig = new THREE.Group();
cameraRig.position.set(0, 0, -2.0); // Store Manager position behind counter
cameraRig.rotation.set(0, 0, 0); // Keep identity rotation so WebXR head tracking is 1:1 and natural
scene.add(cameraRig);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1.6, -2.0);  // Store Manager stands behind counter on desktop
camera.lookAt(0, 1.4, 0.5);        // Looking forward toward counter and customer
cameraRig.add(camera);

// ── VR Session ───────────────────────────────────────────────────────────────

const vrSession = new VRSession(renderer, camera, cameraRig);
vrSession.init().then(() => {
  document.getElementById('status').textContent = '';
});

// ── Input & Concept Overlays ──────────────────────────────────────────────────

const input = new InputManager(renderer, scene, camera, cameraRig);
conceptOverlayManager.init(scene, camera, input);

// ── Environment ──────────────────────────────────────────────────────────────

new Restaurant(scene);
new Counter(scene);

const deliveryStation = new DeliveryStation(
  scene,
  new THREE.Vector3(2.2, 0, -0.5),  // Next to counter
  input,
);

const storageAisle = new StorageAisle(scene, input);

// Controllerless Locomotion / Teleport System
const teleportSystem = new TeleportSystem(scene, camera, input, vrSession, cameraRig);

// ── Gameplay ─────────────────────────────────────────────────────────────────

const npcPosition = new THREE.Vector3(0, 0, 1.0); // Customer stands in front of the counter
const orderSystem = new OrderSystem(scene, npcPosition);

// ── UI Overlays (StartScreen + ObjectiveHUD) ──────────────────────────────────

const objectiveHUD = new ObjectiveHUD(scene, camera);

let shiftStarted = false;
const startScreen = new StartScreen(scene, input, () => {
  shiftStarted = true;
  orderSystem.start();
  objectiveHUD.updateState();
});

// ── Audio preload (after first interaction) ───────────────────────────────────

let audioReady = false;
function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  audioManager.resume();
  audioManager.loadAll(SFX_MAP);
}
window.addEventListener('click',      ensureAudio, { once: true });
window.addEventListener('touchstart', ensureAudio, { once: true });
renderer.xr.addEventListener('sessionstart', ensureAudio);

// ── Render loop ───────────────────────────────────────────────────────────────

let lastTime = performance.now();

renderer.setAnimationLoop((timestamp, frame) => {
  const now = timestamp || performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.1); // seconds, capped
  lastTime  = now;

  // In WebXR, update XR camera immediately so all HUDs, reticles & rays have 0-latency tracking
  if (renderer.xr.isPresenting) {
    renderer.xr.updateCamera(camera);
  }

  // Get current XR camera in VR, or normal camera on desktop
  const activeCamera = renderer.xr.isPresenting
    ? renderer.xr.getCamera()
    : camera;

  vrSession.update();
  input.update();
  teleportSystem.update(dt);
  orderSystem.update(activeCamera, dt);
  storageAisle.update(activeCamera, dt);
  startScreen.update(activeCamera);
  objectiveHUD.update(activeCamera);
  conceptOverlayManager.update(activeCamera);

  // Update carried item if any
  if (gameState.carriedItem && gameState._carriedItemRef) {
    gameState._carriedItemRef.updateCarried(activeCamera, dt);
  }

  renderer.render(scene, camera);
});
