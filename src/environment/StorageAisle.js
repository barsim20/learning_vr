/**
 * StorageAisle.js
 * Builds the 3 storage aisles (Math, Food, Sports) with shelving units
 * and places a StorageBin for each knowledge item.
 */

import * as THREE from 'three';
import { KNOWLEDGE_ITEMS, CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS } from '../content/knowledgeDatabase.js';
import { StorageBin } from '../gameplay/StorageBin.js';
import { createTextLabel } from '../utils/TextLabel.js';
import { gameState, STATE } from '../core/GameState.js';

// One aisle per category, spread left-to-right
const AISLE_CONFIG = [
  { category: CATEGORIES.MATH,   x: -5 },
  { category: CATEGORIES.FOOD,   x:  0 },
  { category: CATEGORIES.SPORTS, x:  5 },
];

const AISLE_Z = -7;       // Back wall coordinate for aisles
const BIN_SPACING_Y = 0.70;
const BIN_START_Y   = 1.10;

export class StorageAisle {
  /**
   * @param {THREE.Scene} scene
   * @param {InputManager} input
   */
  constructor(scene, input) {
    this.scene = scene;
    this.input = input;
    this.bins  = []; // all StorageBin instances

    this.group = new THREE.Group();
    scene.add(this.group);

    for (const aisle of AISLE_CONFIG) {
      this._buildAisle(aisle);
    }

    // Reset opened bins when a new order arrives
    gameState.on(STATE.ORDER, () => this.resetBins());
  }

  resetBins() {
    for (const bin of this.bins) {
      if (bin.isOpen) {
        bin.reset();
      }
    }
  }

  _buildAisle({ category, x }) {
    const color  = CATEGORY_COLORS[category];
    const label  = CATEGORY_LABELS[category];
    const items  = KNOWLEDGE_ITEMS.filter(i => i.category === category);

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.85 }); // warm wood
    const totalBins = items.length;
    const shelfCenterY = BIN_START_Y + ((totalBins - 1) * BIN_SPACING_Y) / 2; // 1.80
    const shelfHeight = (totalBins - 1) * BIN_SPACING_Y + 0.70; // 2.10m
    const shelfZ = AISLE_Z + 0.28;

    // ── 1. Shelf Backing Panel ───────────────────────────────────────────
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, shelfHeight, 0.05),
      shelfMat,
    );
    back.position.set(x, shelfCenterY, AISLE_Z - 0.02);
    back.castShadow = true;
    this.group.add(back);

    // ── 2. Shelf Side Uprights (Left & Right) ────────────────────────────
    for (const side of [-1, 1]) {
      const sideUpright = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, shelfHeight, 0.60),
        shelfMat,
      );
      sideUpright.position.set(x + side * 0.58, shelfCenterY, shelfZ);
      sideUpright.castShadow = true;
      this.group.add(sideUpright);
    }

    // ── 3. Shelf Horizontal Planks (Under Each Bin + Top Roof) ───────────
    for (let i = 0; i <= totalBins; i++) {
      const plankY = i < totalBins
        ? (BIN_START_Y + i * BIN_SPACING_Y) - 0.30  // supporting plank under bin i
        : (BIN_START_Y + (totalBins - 1) * BIN_SPACING_Y) + 0.30; // top roof plank

      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.05, 0.60),
        shelfMat,
      );
      plank.position.set(x, plankY, shelfZ);
      plank.castShadow = true;
      this.group.add(plank);
    }

    // ── 4. Category Header Banner & Label ────────────────────────────────
    const topPlankY = BIN_START_Y + (totalBins - 1) * BIN_SPACING_Y + 0.30;
    const headerMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 });
    const header = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.22, 0.06),
      headerMat,
    );
    header.position.set(x, topPlankY + 0.16, shelfZ);
    this.group.add(header);

    // Category Text Label
    const catLabel = createTextLabel(label, {
      fontSize: 28,
      fontColor: '#ffffff',
      bgColor: 'rgba(0,0,0,0)',
      worldScale: 0.007,
    });
    catLabel.position.set(x, topPlankY + 0.42, shelfZ + 0.04);
    this.group.add(catLabel);

    // Category header interactive hover & click
    const onHeaderHover = (_, isHover) => {
      headerMat.emissiveIntensity = isHover ? 0.9 : 0.35;
    };
    const onHeaderSelect = () => {
      // Find matching active bin in this aisle if any
      const matchingBin = this.bins.find(b => b.itemData.category === category && gameState.activeOrder && b.itemData.id === gameState.activeOrder.id);
      if (matchingBin) {
        matchingBin._onDoorClick();
      }
    };

    header.userData.onHover   = onHeaderHover;
    header.userData.onSelect  = onHeaderSelect;
    catLabel.userData.onHover = onHeaderHover;
    catLabel.userData.onSelect = onHeaderSelect;

    this.input.register(header);
    this.input.register(catLabel);

    // ── 5. Storage Bins (Sitting directly on top of each shelf plank) ─────
    items.forEach((itemData, idx) => {
      const binY = BIN_START_Y + idx * BIN_SPACING_Y;
      const pos  = new THREE.Vector3(x, binY, shelfZ);
      const bin  = new StorageBin(itemData, pos, this.scene, this.input);
      this.bins.push(bin);
    });
  }

  /** Per-frame update — pass to all bins */
  update(camera, dt) {
    for (const bin of this.bins) bin.update(camera, dt);
  }

  /** Return the StorageBin for a given item ID */
  getBinByItemId(id) {
    return this.bins.find(b => b.itemData.id === id) || null;
  }
}
