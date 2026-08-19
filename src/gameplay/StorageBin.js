/**
 * StorageBin.js
 * A single labelled storage bin with a door that opens after puzzle success.
 * Contains a KnowledgeItem the player can pick up.
 */

import * as THREE from 'three';
import { createTextLabel } from '../utils/TextLabel.js';
import { CATEGORY_COLORS } from '../content/knowledgeDatabase.js';
import { MemoryPuzzle } from './MemoryPuzzle.js';
import { KnowledgeItem } from './KnowledgeItem.js';
import { gameState, STATE } from '../core/GameState.js';

export class StorageBin {
  /**
   * @param {object} itemData        knowledge item data
   * @param {THREE.Vector3} position world position
   * @param {THREE.Scene} scene
   * @param {InputManager} input
   */
  constructor(itemData, position, scene, input) {
    this.itemData  = itemData;
    this.scene     = scene;
    this.input     = input;
    this.isOpen    = false;
    this._item     = null;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    this._buildShell();
    this._buildDoor();
    this._buildLabel();
    this._buildPuzzle();
  }

  // ── Visual construction ───────────────────────────────────────────────

  _buildShell() {
    const color = CATEGORY_COLORS[this.itemData.category];
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

    // Back + sides of bin (U-shape; door is separate)
    const parts = [
      { size: [0.5, 0.5, 0.05], pos: [0,    0, -0.25] }, // back
      { size: [0.05, 0.5, 0.5], pos: [-0.25, 0, 0] },    // left
      { size: [0.05, 0.5, 0.5], pos: [0.25, 0, 0] },     // right
      { size: [0.5, 0.05, 0.5], pos: [0, -0.25, 0] },    // bottom
      { size: [0.5, 0.05, 0.5], pos: [0,  0.25, 0] },    // top
    ];
    for (const { size, pos } of parts) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      m.position.set(...pos);
      m.castShadow = true;
      this.group.add(m);
    }
  }

  _buildDoor() {
    const color = CATEGORY_COLORS[this.itemData.category];
    const darkerColor = new THREE.Color(color).multiplyScalar(0.7);

    this._door = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.46, 0.04),
      new THREE.MeshStandardMaterial({ color: darkerColor, roughness: 0.5 }),
    );
    this._door.position.set(0, 0, 0.24);
    this.group.add(this._door);

    // Lock icon (small gold cube on door face)
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.5 }),
    );
    lock.position.set(0, 0, 0.035);
    this._door.add(lock);
    this._lockMesh = lock;

    // Door is the click target
    this._door.userData.onSelect = () => this._onDoorClick();
    this._door.userData.onHover  = (_, isHover) => {
      this._door.material.emissive = isHover
        ? new THREE.Color(CATEGORY_COLORS[this.itemData.category]).multiplyScalar(0.3)
        : new THREE.Color(0);
    };
    this.input.register(this._door);
  }

  _buildLabel() {
    const label = createTextLabel(this.itemData.label, {
      fontSize: 16,
      fontColor: '#ffffff',
      bgColor: 'rgba(0,0,0,0.8)',
      maxWidth: 160,
      worldScale: 0.004,
    });
    label.position.set(0, 0.38, 0.26);
    this.group.add(label);
  }

  _buildPuzzle() {
    // Puzzle grid is positioned just in front of the bin door
    const puzzleAnchor = new THREE.Object3D();
    puzzleAnchor.position.set(0, 0, 0.5);
    this.group.add(puzzleAnchor);

    this._puzzle = new MemoryPuzzle(puzzleAnchor, this.input, {
      onSuccess: () => this._openBin(),
      onFail:    () => {
        // Re-enable door click so player can try again
        gameState.transition(STATE.ORDER);
      },
    });
  }

  // ── Interaction ───────────────────────────────────────────────────────

  _onDoorClick() {
    // Only interactable when a matching order is active
    if (!gameState.activeOrder) return;
    if (gameState.activeOrder.id !== this.itemData.id) {
      // Wrong bin — flash red briefly
      const orig = this._door.material.color.getHex();
      this._door.material.color.setHex(0xe63946);
      setTimeout(() => this._door.material.color.setHex(orig), 400);
      return;
    }
    if (this.isOpen) {
      this._spawnItem();
      return;
    }

    // Start puzzle
    gameState.transition(STATE.PUZZLE);
    gameState.activeBin = this;
    this._puzzle.start();
  }

  _openBin() {
    this.isOpen = true;

    // Animate door opening (slide up)
    this._animateDoorOpen();
    this._lockMesh.visible = false;
    this._spawnItem();
  }

  _animateDoorOpen() {
    const door = this._door;
    const targetY = door.position.y + 0.5;
    const startY  = door.position.y;
    const duration = 500;
    const start = performance.now();

    const tick = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      door.position.y = startY + (targetY - startY) * easeOut(t);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  _spawnItem() {
    if (this._item) return; // already spawned
    this._item = new KnowledgeItem(
      this.itemData,
      this.scene,
      this.input,
      (item) => this._onItemPickup(item),
    );
    // Place item just inside the bin opening
    const worldPos = new THREE.Vector3();
    this.group.getWorldPosition(worldPos);
    this._item.setPosition(worldPos.x, worldPos.y + 0.1, worldPos.z + 0.4);
  }

  _onItemPickup(item) {
    gameState.carriedItem = item.data;
    gameState.transition(STATE.CARRYING);
  }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(camera, dt) {
    if (this._item && !this._item.carried) {
      this._item.updateIdle(dt);
    }
  }

  dispose() {
    this.input.unregister(this._door);
    this._puzzle.dispose();
    if (this._item) this._item.dispose();
    this.scene.remove(this.group);
  }
}

function easeOut(t) { return 1 - (1 - t) ** 3; }
