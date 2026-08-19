/**
 * OrderSystem.js
 * Manages the order cycle: pick item, show NPC, wait for delivery.
 * Fires a new order whenever GameState reaches IDLE or RESULT.
 */

import { gameState, STATE } from '../core/GameState.js';
import { getRandomItem } from '../content/knowledgeDatabase.js';
import { CustomerNPC } from '../gameplay/CustomerNPC.js';
import * as THREE from 'three';

const ORDER_DELAY_MS = 2500; // pause between orders

export class OrderSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} npcPosition  where the NPC stands
   */
  constructor(scene, npcPosition) {
    this.scene = scene;
    this._npc  = new CustomerNPC(scene, npcPosition);

    // Listen for state changes to auto-trigger next order
    gameState.on(STATE.IDLE,   () => this._scheduleNextOrder());
    gameState.on(STATE.RESULT, () => this._scheduleNextOrder());
  }

  /** Start the first order */
  start() {
    gameState.transition(STATE.IDLE);
  }

  _scheduleNextOrder() {
    setTimeout(() => {
      this._issueOrder();
    }, ORDER_DELAY_MS);
  }

  _issueOrder() {
    const item = getRandomItem();
    gameState.activeOrder = item;
    gameState.carriedItem = null;
    gameState.transition(STATE.ORDER);

    this._npc.show(item.orderLine, item.category);
  }

  /** Per-frame update for NPC animation */
  update(camera, dt) {
    this._npc.update(camera, dt);
  }
}
