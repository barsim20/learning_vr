/**
 * CustomerNPC.js
 * A cute, charming BrainDonald's Neuron Character NPC.
 * High-performance procedural 3D model running at locked 90 FPS in VR.
 */

import * as THREE from 'three';
import { SpeechBubble } from '../ui/SpeechBubble.js';
import { voiceManager } from '../core/VoiceManager.js';
import { conceptOverlayManager } from '../ui/ConceptOverlayManager.js';

export class CustomerNPC {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} position  world position (feet level)
   */
  constructor(scene, position) {
    this.scene  = scene;
    this._bobTime = 0;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = Math.PI; // Face towards Store Manager behind counter
    scene.add(this.group);

    this._synapseMats = [];
    this._buildCharacter();
    this._bubble = new SpeechBubble(this.group, 2.2);
    this.hide();
  }

  _buildCharacter() {
    const root = new THREE.Group();
    this.characterGroup = root;
    this.group.add(root);

    // Materials
    const somaMat = new THREE.MeshStandardMaterial({
      color: 0xffa07a, // warm light salmon/coral
      roughness: 0.4,
      metalness: 0.05,
    });
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0xe63946, // BrainDonald's red
      roughness: 0.5,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffd166,
      emissiveIntensity: 0.3,
      roughness: 0.3,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pupilMat    = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const blushMat    = new THREE.MeshStandardMaterial({ color: 0xff6b81, roughness: 0.6 });

    // 1. Torso / Body with Apron (y: 0.8m to 1.35m)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.55, 16), apronMat);
    body.position.y = 1.05;
    body.castShadow = true;
    root.add(body);

    // Apron Straps & Golden Arch Badge
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), goldMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 1.18, 0.26);
    root.add(badge);

    // 2. Head / Soma (Large friendly sphere at y=1.65m)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 20), somaMat);
    head.position.y = 1.62;
    head.castShadow = true;
    root.add(head);

    // 3. Cute Fast-Food Visor / Cap
    const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.1, 20), apronMat);
    capBase.position.set(0, 1.88, 0);
    root.add(capBase);

    const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 20, 1, false, 0, Math.PI), goldMat);
    capBrim.position.set(0, 1.84, 0.12);
    capBrim.rotation.x = 0.15;
    root.add(capBrim);

    // 4. Expressive Cartoon Eyes
    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.12, 1.64, 0.32);

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), eyeWhiteMat);
      eyeGroup.add(sclera);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), pupilMat);
      pupil.position.set(0, 0, 0.04);
      eyeGroup.add(pupil);

      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), eyeWhiteMat);
      highlight.position.set(0.015, 0.015, 0.065);
      eyeGroup.add(highlight);

      root.add(eyeGroup);

      // Rosy Cheeks
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), blushMat);
      blush.position.set(side * 0.22, 1.54, 0.28);
      blush.scale.set(1, 0.6, 0.4);
      root.add(blush);
    }

    // 5. Cute Smile
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.014, 8, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x661111, roughness: 0.5 })
    );
    smile.position.set(0, 1.52, 0.33);
    smile.rotation.z = Math.PI;
    smile.rotation.x = -0.2;
    root.add(smile);

    // 6. Cute Branching Dendrites with Glowing Synaptic Bulbs
    const dendriteConfigs = [
      { angle: 0.4,  rotZ:  0.5, length: 0.32 },
      { angle: -0.4, rotZ: -0.5, length: 0.32 },
      { angle: 1.1,  rotZ:  0.8, length: 0.28 },
      { angle: -1.1, rotZ: -0.8, length: 0.28 },
      { angle: 0.0,  rotZ:  0.1, length: 0.36 },
    ];

    dendriteConfigs.forEach(({ rotZ, length }, i) => {
      const dendriteGroup = new THREE.Group();
      dendriteGroup.position.set((i - 2) * 0.12, 1.90, 0);
      dendriteGroup.rotation.z = rotZ;

      // Stem branch
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, length, 8), somaMat);
      stem.position.y = length / 2;
      dendriteGroup.add(stem);

      // Glowing Synapse Tip
      const synMat = new THREE.MeshStandardMaterial({
        color: 0x06d6a0,
        emissive: 0x06d6a0,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), synMat);
      bulb.position.y = length;
      dendriteGroup.add(bulb);

      this._synapseMats.push(synMat);
      root.add(dendriteGroup);
    });

    // 7. Arms / Hands
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), somaMat);
      arm.position.set(side * 0.32, 1.08, 0.1);
      arm.rotation.z = -side * 0.4;
      arm.rotation.x = 0.5;
      root.add(arm);

      const mitten = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), somaMat);
      mitten.position.set(side * 0.38, 0.94, 0.22);
      root.add(mitten);
    }
  }

  /** Show the NPC with an order */
  show(orderText, category) {
    this.group.visible = true;
    this._bubble.show(`"${orderText}"`);
    voiceManager.play('order', category);
    conceptOverlayManager.trigger('customer_order');
  }

  hide() {
    this.group.visible = false;
    this._bubble.hide();
  }

  /** Gentle idle bob & synaptic glow pulse — call every frame */
  update(camera, dt) {
    if (!this.group.visible) return;
    this._bobTime += dt;

    // Smooth breathing bob
    this.characterGroup.position.y = Math.sin(this._bobTime * 1.5) * 0.025;
    this.characterGroup.rotation.y = Math.sin(this._bobTime * 0.8) * 0.04;

    // Synaptic glow pulsation
    const glow = 0.6 + Math.sin(this._bobTime * 3.0) * 0.4;
    for (const mat of this._synapseMats) {
      mat.emissiveIntensity = glow;
    }

    this._bubble.update(camera);
  }
}

