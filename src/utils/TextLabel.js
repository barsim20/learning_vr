/**
 * TextLabel.js
 * Creates a THREE.Sprite with text rendered onto a canvas texture.
 * Lightweight alternative to troika-three-text — works offline, no font loading.
 *
 * Usage:
 *   const label = createTextLabel('2 + 2 = 4', { fontSize: 28, bgColor: '#e63946' });
 *   scene.add(label);
 */

import * as THREE from 'three';

/**
 * @param {string} text
 * @param {object} opts
 * @param {number}  [opts.fontSize=24]
 * @param {string}  [opts.fontColor='#ffffff']
 * @param {string}  [opts.bgColor='rgba(0,0,0,0.75)']
 * @param {string}  [opts.font='bold 24px Arial']
 * @param {number}  [opts.padding=12]
 * @param {number}  [opts.maxWidth=300]     canvas px before wrap
 * @param {number}  [opts.worldScale=0.01]  three units per canvas px
 * @returns {THREE.Sprite}
 */
export function createTextLabel(text, opts = {}) {
  const {
    fontSize = 24,
    fontColor = '#ffffff',
    bgColor = 'rgba(20,10,0,0.85)',
    padding = 12,
    maxWidth = 280,
    worldScale = 0.006,
    borderRadius = 8,
  } = opts;

  const font = `bold ${fontSize}px Arial, sans-serif`;

  // --- measure ---
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;

  // word-wrap
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const lineH = fontSize * 1.35;
  const w = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width))) + padding * 2;
  const h = lines.length * lineH + padding * 2;

  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);

  // --- draw background ---
  ctx.font = font; // reset after resize
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // rounded rect bg
  ctx.fillStyle = bgColor;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, borderRadius);
  ctx.fill();

  // --- draw text ---
  ctx.fillStyle = fontColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, padding + i * lineH);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width * worldScale, canvas.height * worldScale, 1);

  // store for later updates
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  sprite.userData.font = font;
  sprite.userData.worldScale = worldScale;

  return sprite;
}

/** Helper: draw a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
