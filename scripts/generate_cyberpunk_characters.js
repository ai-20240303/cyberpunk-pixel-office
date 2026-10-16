#!/usr/bin/env node
/**
 * Generate 6 Crisp 16x32 RPG-Style Cyberpunk Character Sprite Sheets
 * (assets/characters/char_0.png ~ char_5.png) for AI TradingView Pixel Office.
 *
 * Sprite sheet spec: 112 x 96 px (RGBA, 7 cols x 3 rows, 16x32 per frame)
 * - Row 0: Front (facing down)
 * - Row 1: Back (facing up)
 * - Row 2: Side profile (facing right; mirrored for left)
 * - Col 0: Neutral standing pose (both feet level)
 * - Col 1: Walk step A (left foot forward)
 * - Col 2: Walk step B (right foot forward)
 * - Col 3..6: Seated pose
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BASE_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(BASE_DIR, 'assets', 'characters');

const SHEET_W = 112;
const SHEET_H = 96;
const FW = 16;
const FH = 32;

const AGENTS = [
  {
    id: 0,
    name: '數據領航員 (Quote Hub)',
    hair: [226, 242, 255],
    hairShade: [148, 184, 218],
    skin: [252, 220, 198],
    skinShade: [224, 184, 160],
    eye: [14, 165, 233],
    visor: [56, 189, 248],
    jacket: [30, 58, 95],
    jacketShade: [18, 38, 66],
    shirt: [240, 249, 255],
    accent: [56, 189, 248],
    pants: [24, 34, 54],
    shoes: [15, 23, 42],
  },
  {
    id: 1,
    name: '夜盤交易員 (Night Trader)',
    hair: [76, 29, 149],
    hairShade: [46, 16, 101],
    skin: [248, 218, 200],
    skinShade: [218, 180, 162],
    eye: [192, 38, 211],
    visor: [217, 70, 239],
    jacket: [38, 24, 62],
    jacketShade: [24, 14, 42],
    shirt: [192, 132, 252],
    accent: [217, 70, 239],
    pants: [22, 18, 36],
    shoes: [16, 12, 28],
  },
  {
    id: 2,
    name: '首席交易官 (Order Gateway)',
    hair: [71, 85, 105],
    hairShade: [45, 55, 72],
    skin: [244, 210, 188],
    skinShade: [214, 174, 150],
    eye: [234, 88, 12],
    visor: [249, 115, 22],
    jacket: [68, 34, 28],
    jacketShade: [44, 20, 18],
    shirt: [254, 215, 170],
    accent: [251, 146, 60],
    pants: [32, 28, 34],
    shoes: [20, 18, 22],
  },
  {
    id: 3,
    name: '日盤交易員 (Day Trader)',
    hair: [234, 179, 8],
    hairShade: [180, 128, 4],
    skin: [252, 222, 200],
    skinShade: [222, 186, 162],
    eye: [2, 132, 199],
    visor: [56, 189, 248],
    jacket: [37, 99, 235],
    jacketShade: [29, 78, 216],
    shirt: [255, 255, 255],
    accent: [56, 189, 248],
    pants: [30, 41, 59],
    shoes: [15, 23, 42],
  },
  {
    id: 4,
    name: 'WF分析師 (WF Analyst)',
    hair: [16, 185, 129],
    hairShade: [5, 150, 105],
    skin: [250, 220, 202],
    skinShade: [220, 184, 166],
    eye: [5, 150, 105],
    visor: [52, 211, 153],
    jacket: [226, 232, 240],
    jacketShade: [180, 192, 208],
    shirt: [15, 118, 110],
    accent: [52, 211, 153],
    pants: [30, 41, 59],
    shoes: [15, 23, 42],
  },
  {
    id: 5,
    name: '績效稽核師 (Post Clerk)',
    hair: [236, 72, 153],
    hairShade: [190, 24, 93],
    skin: [252, 224, 208],
    skinShade: [224, 188, 170],
    eye: [147, 51, 234],
    visor: [244, 114, 182],
    jacket: [59, 28, 84],
    jacketShade: [38, 16, 56],
    shirt: [251, 207, 232],
    accent: [244, 114, 182],
    pants: [28, 22, 44],
    shoes: [18, 14, 30],
  },
];

function createCanvas(w, h) {
  const buf = new Uint8Array(w * h * 4);
  return {
    w,
    h,
    buf,
    set(x, y, rgb, a = 255) {
      if (x < 0 || x >= w || y < 0 || y >= h || !rgb) return;
      const idx = (y * w + x) * 4;
      buf[idx] = rgb[0];
      buf[idx + 1] = rgb[1];
      buf[idx + 2] = rgb[2];
      buf[idx + 3] = a;
    },
    rect(x1, y1, x2, y2, rgb, a = 255) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          this.set(x, y, rgb, a);
        }
      }
    },
  };
}

function drawFrame(rawCanvas, agent, row, col, ox, oy) {
  const c = {
    set(x, y, rgb, a = 255) {
      rawCanvas.set(ox + x, oy + y, rgb, a);
    },
    rect(x1, y1, x2, y2, rgb, a = 255) {
      rawCanvas.rect(ox + x1, oy + y1, ox + x2, oy + y2, rgb, a);
    },
  };

  const isSitting = col >= 3;
  const walkStep = col === 1 ? 1 : (col === 2 ? -1 : 0);
  const out = [15, 20, 32]; // Crisp dark outline

  // ==========================================
  // 1. HEAD & HAIR (y: 4..15) — Rounded RPG Chibi Head
  // ==========================================
  // Outer dark silhouette (rounded corners)
  c.rect(5, 4, 10, 4, out);
  c.rect(4, 5, 11, 5, out);
  c.rect(3, 6, 12, 13, out);
  c.rect(4, 14, 11, 15, out);

  if (row === 0) {
    // FRONT VIEW
    // Hair dome
    c.rect(5, 5, 10, 7, agent.hair);
    c.rect(4, 6, 11, 8, agent.hair);
    c.rect(4, 8, 4, 11, agent.hairShade);
    c.rect(11, 8, 11, 11, agent.hairShade);

    // Face skin
    c.rect(5, 9, 10, 13, agent.skin);
    c.rect(5, 14, 10, 14, agent.skinShade);

    // Forehead bangs
    c.set(6, 9, agent.hair);
    c.set(9, 9, agent.hair);

    // Crisp RPG Eyes + Cyber Visor rim
    c.rect(5, 11, 6, 12, out);
    c.rect(9, 11, 10, 12, out);
    c.set(5, 11, agent.visor);
    c.set(9, 11, agent.visor);
    // Subtle cyber headset earpieces
    c.rect(3, 10, 3, 12, agent.accent);
    c.rect(12, 10, 12, 12, agent.accent);

  } else if (row === 1) {
    // BACK VIEW
    c.rect(5, 5, 10, 13, agent.hair);
    c.rect(4, 6, 11, 13, agent.hair);
    c.rect(4, 11, 11, 14, agent.hairShade);
    // Back cyber headband strip
    c.rect(5, 10, 10, 10, agent.accent);

  } else {
    // SIDE PROFILE VIEW (facing right)
    c.rect(4, 5, 10, 13, agent.hair);
    c.rect(4, 7, 7, 13, agent.hairShade);
    // Face on right (x: 8..11)
    c.rect(8, 9, 11, 13, agent.skin);
    c.rect(8, 14, 10, 14, agent.skinShade);
    // Eye + cyber earpiece
    c.rect(10, 11, 10, 12, out);
    c.set(10, 11, agent.visor);
    c.rect(6, 10, 7, 12, agent.accent);
  }

  // ==========================================
  // 2. TORSO & JACKET (y: 16..23)
  // ==========================================
  c.rect(4, 16, 11, 23, out);
  c.rect(5, 16, 10, 22, agent.jacket);

  if (row === 0) {
    // Shirt V-neck / tie + cyber badge
    c.rect(7, 16, 8, 21, agent.shirt);
    c.rect(7, 18, 8, 19, agent.accent);
    // Jacket lapels
    c.rect(5, 16, 6, 22, agent.jacket);
    c.rect(9, 16, 10, 22, agent.jacket);
    // Neon collar trim
    c.set(5, 16, agent.accent);
    c.set(10, 16, agent.accent);
  } else if (row === 1) {
    c.rect(5, 16, 10, 22, agent.jacketShade);
    c.rect(7, 17, 8, 21, agent.accent);
  } else {
    c.rect(5, 16, 10, 22, agent.jacket);
    c.rect(7, 17, 8, 19, agent.accent);
  }

  // Arms
  if (row !== 2) {
    const lArmY = 17 + (walkStep === 1 ? 1 : 0);
    const rArmY = 17 + (walkStep === -1 ? 1 : 0);
    c.rect(3, lArmY, 4, lArmY + 4, out);
    c.rect(3, lArmY, 3, lArmY + 3, agent.jacketShade);
    c.set(3, lArmY + 4, agent.skin);

    c.rect(11, rArmY, 12, rArmY + 4, out);
    c.rect(12, rArmY, 12, rArmY + 3, agent.jacketShade);
    c.set(12, rArmY + 4, agent.skin);
  } else {
    const armX = isSitting ? 8 : (7 + walkStep);
    c.rect(armX, 17, armX + 2, 21, agent.jacketShade);
    c.set(armX + 1, 22, agent.skin);
  }

  // ==========================================
  // 3. LEGS & BOOTS (y: 24..30)
  // ==========================================
  if (isSitting) {
    // Clean seated legs
    c.rect(4, 24, 11, 27, out);
    c.rect(5, 24, 10, 26, agent.pants);
    c.rect(5, 27, 6, 28, agent.shoes);
    c.rect(9, 27, 10, 28, agent.shoes);
  } else if (row === 2) {
    // Side walking legs
    const fX = 7 + walkStep;
    const bX = 7 - walkStep;
    c.rect(bX - 1, 24, bX + 2, 30, out);
    c.rect(bX, 24, bX + 1, 28, agent.pants);
    c.rect(bX, 29, bX + 1, 30, agent.shoes);

    c.rect(fX - 1, 24, fX + 2, 30, out);
    c.rect(fX, 24, fX + 1, 28, agent.pants);
    c.rect(fX, 29, fX + 1, 30, agent.shoes);
    c.set(fX + 1, 29, agent.accent);
  } else {
    const lShift = walkStep === 1 ? -1 : 0;
    const rShift = walkStep === -1 ? -1 : 0;

    // Left leg
    c.rect(4, 24, 7, 30 + lShift, out);
    c.rect(5, 24, 6, 28 + lShift, agent.pants);
    c.rect(5, 29 + lShift, 6, 30 + lShift, agent.shoes);
    c.set(5, 29 + lShift, agent.accent);

    // Right leg
    c.rect(8, 24, 11, 30 + rShift, out);
    c.rect(9, 24, 10, 28 + rShift, agent.pants);
    c.rect(9, 29 + rShift, 10, 30 + rShift, agent.shoes);
    c.set(10, 29 + rShift, agent.accent);
  }
}

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i++) {
    c ^= buffer[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodeRgbaPng(buf, w, h) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    const srcStart = y * w * 4;
    Buffer.from(buf.buffer, srcStart, w * 4).copy(raw, rowStart + 1);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const agent of AGENTS) {
    const canvas = createCanvas(SHEET_W, SHEET_H);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 7; col++) {
        drawFrame(canvas, agent, row, col, col * FW, row * FH);
      }
    }
    const pngBuf = encodeRgbaPng(canvas.buf, SHEET_W, SHEET_H);
    const outFile = path.join(OUT_DIR, `char_${agent.id}.png`);
    fs.writeFileSync(outFile, pngBuf);
    console.log(`Generated crisp RPG sprite ${outFile} — ${agent.name}`);
  }
}

main();
