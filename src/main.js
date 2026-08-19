/**
 * main.js
 * BrainDonald's — entry point.
 * Sets up Three.js renderer, WebXR, scene, UI overlays, and the game loop.
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
import { gameState, STATE } from './core/GameState.js';

import { StartScreen }    from './ui/StartScreen.js';
import { ObjectiveHUD }   from './ui/ObjectiveHUD.js';

// ── Renderer ────────────────────────────────────────────────────────────────

const canvas   = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.xr.enabled        = true;
renderer.outputColorSpace   = THREE.SRGBColorSpace;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── Scene & Camera ───────────────────────────────────────────────────────────

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a00); // dark warm
scene.fog = new THREE.Fog(0x1a0a00, 12, 22);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1.6, -1.8); // Standing behind the counter (Store Manager position)
camera.lookAt(0, 1.4, 0.5);       // Facing forward toward the customer area

// ── VR Session ───────────────────────────────────────────────────────────────

const vrSession = new VRSession(renderer, camera);
vrSession.init().then(() => {
  document.getElementById('status').textContent = '';
});

// ── Input ────────────────────────────────────────────────────────────────────

const input = new InputManager(renderer, scene, camera);

// ── Environment ──────────────────────────────────────────────────────────────

new Restaurant(scene);
new Counter(scene);

const deliveryStation = new DeliveryStation(
  scene,
  new THREE.Vector3(2.2, 0, -0.5),  // Beside counter, accessible to Store Manager
  input,
);

const storageAisle = new StorageAisle(scene, input);

// ── Gameplay ─────────────────────────────────────────────────────────────────

const npcPosition = new THREE.Vector3(0, 0, 0.8); // Customer stands in front of the counter
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

  // Get current XR camera in VR, or normal camera on desktop
  const activeCamera = renderer.xr.isPresenting
    ? renderer.xr.getCamera()
    : camera;

  vrSession.update();
  input.update();
  orderSystem.update(activeCamera, dt);
  storageAisle.update(activeCamera, dt);
  startScreen.update(activeCamera);
  objectiveHUD.update(activeCamera);

  // Update carried item if any
  if (gameState.carriedItem && gameState._carriedItemRef) {
    gameState._carriedItemRef.updateCarried(activeCamera, dt);
  }

  renderer.render(scene, camera);
});
