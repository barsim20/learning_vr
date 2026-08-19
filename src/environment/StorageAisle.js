/**
 * StorageAisle.js
 * Builds the 3 storage aisles (Math, Food, Sports) with shelving units
 * and places a StorageBin for each knowledge item.
 */

import * as THREE from 'three';
import { KNOWLEDGE_ITEMS, CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS } from '../content/knowledgeDatabase.js';
import { StorageBin } from '../gameplay/StorageBin.js';
import { createTextLabel } from '../utils/TextLabel.js';

// One aisle per category, spread left-to-right
const AISLE_CONFIG = [
  { category: CATEGORIES.MATH,   x: -5 },
  { category: CATEGORIES.FOOD,   x:  0 },
  { category: CATEGORIES.SPORTS, x:  5 },
];

const AISLE_Z = -7;       // how far back aisles are
const BIN_SPACING_Y = 0.75;
const BIN_START_Y   = 1.5;

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
  }

  _buildAisle({ category, x }) {
    const color  = CATEGORY_COLORS[category];
    const label  = CATEGORY_LABELS[category];
    const items  = KNOWLEDGE_ITEMS.filter(i => i.category === category);

    // ── Shelf backing ──────────────────────────────────────────────────
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.9 }); // wood brown

    // Back panel
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.5, 0.08),
      shelfMat,
    );
    back.position.set(x, 1.35, AISLE_Z);
    back.castShadow = true;
    this.group.add(back);

    // Shelf planks
    for (let i = 0; i < items.length + 1; i++) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.06, 0.3),
        shelfMat,
      );
      plank.position.set(x, BIN_START_Y - 0.35 + i * BIN_SPACING_Y - BIN_SPACING_Y * 1.5, AISLE_Z + 0.14);
      this.group.add(plank);
    }

    // ── Category colour strip / header ────────────────────────────────
    const header = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.05),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }),
    );
    header.position.set(x, 2.75, AISLE_Z + 0.03);
    this.group.add(header);

    // Category label above header
    const catLabel = createTextLabel(label, {
      fontSize: 28,
      fontColor: '#ffffff',
      bgColor: 'rgba(0,0,0,0)',
      worldScale: 0.007,
    });
    catLabel.position.set(x, 3.1, AISLE_Z + 0.1);
    this.group.add(catLabel);

    // ── StorageBins ───────────────────────────────────────────────────
    items.forEach((itemData, idx) => {
      const binY = BIN_START_Y + idx * BIN_SPACING_Y;
      const pos  = new THREE.Vector3(x, binY, AISLE_Z + 0.2);
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
