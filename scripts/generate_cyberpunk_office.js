#!/usr/bin/env node
/**
 * Generate a Crisp Native 640x800 Cyberpunk Pixel-Art Office Background
 * (assets/oficina.png & assets/oficina-placeholder.png)
 * strictly aligned to data/map.json (20x25 tiles @ 32x32px each).
 *
 * Designed for maximum visual clarity, sharp contrast, and zero scanline blur.
 * IMPORTANT: Never modifies data/map.json.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BASE_DIR = path.resolve(__dirname, '..');
const MAP_JSON = path.join(BASE_DIR, 'data', 'map.json');
const OUT_PNG = path.join(BASE_DIR, 'assets', 'oficina.png');
const OUT_PLACEHOLDER = path.join(BASE_DIR, 'assets', 'oficina-placeholder.png');

const COLS = 20;
const ROWS = 25;
const TILE = 32; // Native 32x32 tile resolution -> 640x800 crisp pixels
const W = COLS * TILE; // 640
const H = ROWS * TILE; // 800

const buf = new Uint8Array(W * H * 4);

function setPx(x, y, rgb, alpha = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = (y * W + x) * 4;
  if (alpha >= 255) {
    buf[idx] = rgb[0];
    buf[idx + 1] = rgb[1];
    buf[idx + 2] = rgb[2];
    buf[idx + 3] = 255;
  } else {
    const a = alpha / 255;
    buf[idx] = Math.round(buf[idx] * (1 - a) + rgb[0] * a);
    buf[idx + 1] = Math.round(buf[idx + 1] * (1 - a) + rgb[1] * a);
    buf[idx + 2] = Math.round(buf[idx + 2] * (1 - a) + rgb[2] * a);
    buf[idx + 3] = 255;
  }
}

function fillRect(x1, y1, x2, y2, fillRgb, outlineRgb = null) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (outlineRgb && (x === minX || x === maxX || y === minY || y === maxY)) {
        setPx(x, y, outlineRgb);
      } else if (fillRgb) {
        setPx(x, y, fillRgb);
      }
    }
  }
}

function strokeRect(x1, y1, x2, y2, rgb) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  for (let x = minX; x <= maxX; x++) {
    setPx(x, minY, rgb);
    setPx(x, maxY, rgb);
  }
  for (let y = minY; y <= maxY; y++) {
    setPx(minX, y, rgb);
    setPx(maxX, y, rgb);
  }
}

function drawLine(x1, y1, x2, y2, rgb) {
  let dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
  let dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  let cx = x1, cy = y1;
  while (true) {
    setPx(cx, cy, rgb);
    if (cx === x2 && cy === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; cx += sx; }
    if (e2 <= dx) { err += dx; cy += sy; }
  }
}

function isStructuralWall(x, y) {
  if (x === 0 || x === 19 || y === 0 || y === 24) return true;
  if (y === 8 || y === 17) return true;
  if ((x === 6 || x === 13) && (y >= 1 && y <= 7)) return true;
  if (x === 13 && (y >= 18 && y <= 23)) return true;
  return false;
}

function inferRoom(x, y, roomLookup) {
  const key = `${x},${y}`;
  if (roomLookup[key]) return roomLookup[key];
  if (y >= 1 && y <= 7) {
    if (x >= 1 && x <= 5) return '夜盤房';
    if (x >= 7 && x <= 12) return '委託執行室';
    if (x >= 14 && x <= 18) return '日盤房';
  } else if (y >= 9 && y <= 16 && x >= 1 && x <= 18) {
    return '情報大廳';
  } else if (y >= 18 && y <= 23) {
    if (x >= 1 && x <= 12) return '休息房';
    if (x >= 14 && x <= 18) return '研究室';
  }
  return '';
}

// Clean, high-clarity Cyberpunk Room Palettes
const ROOM_THEMES = {
  '夜盤房': {
    floorEven: [20, 18, 38],
    floorOdd: [24, 22, 44],
    gridLine: [36, 32, 64],
    neon: [192, 132, 252],       // Crisp Cyber Purple
    neonBright: [233, 213, 255],
    accent: [56, 189, 248],
  },
  '委託執行室': {
    floorEven: [28, 20, 30],
    floorOdd: [34, 24, 36],
    gridLine: [54, 36, 52],
    neon: [251, 146, 60],        // Crisp Cyber Amber
    neonBright: [254, 215, 170],
    accent: [248, 113, 113],
  },
  '日盤房': {
    floorEven: [16, 26, 44],
    floorOdd: [20, 32, 52],
    gridLine: [32, 50, 78],
    neon: [56, 189, 248],        // Crisp Cyber Blue-Cyan
    neonBright: [186, 230, 253],
    accent: [129, 140, 248],
  },
  '情報大廳': {
    floorEven: [15, 23, 38],
    floorOdd: [18, 28, 45],
    gridLine: [28, 44, 68],
    neon: [14, 165, 233],        // Electric Sky Blue
    neonBright: [125, 211, 252],
    accent: [52, 211, 153],
  },
  '休息房': {
    floorEven: [22, 24, 38],
    floorOdd: [26, 29, 45],
    gridLine: [38, 43, 66],
    neon: [244, 114, 182],       // Clean Synth Pink
    neonBright: [251, 207, 232],
    accent: [167, 139, 250],
  },
  '研究室': {
    floorEven: [14, 28, 36],
    floorOdd: [18, 34, 43],
    gridLine: [28, 54, 66],
    neon: [52, 211, 153],        // Clean Matrix Mint
    neonBright: [167, 243, 208],
    accent: [34, 211, 238],
  },
};

function drawFloorTile(tx, ty, room) {
  const px = tx * TILE, py = ty * TILE;
  const theme = ROOM_THEMES[room] || ROOM_THEMES['情報大廳'];
  const isEven = ((tx + ty) % 2) === 0;
  const base = isEven ? theme.floorEven : theme.floorOdd;

  // Crisp flat tile fill + 1px clean grid border (no noisy dots)
  fillRect(px, py, px + TILE - 1, py + TILE - 1, base);
  drawLine(px, py, px + TILE - 1, py, theme.gridLine);
  drawLine(px, py, px, py + TILE - 1, theme.gridLine);

  // Keep (4,23) and (5,23) pure floor tiles for door opening patch
  if ((tx === 4 || tx === 5) && ty === 23) return;

  // Central corridor clean guide line
  if (room === '情報大廳' && ty === 12) {
    drawLine(px, py + 31, px + TILE - 1, py + 31, [24, 68, 108]);
  }
}

function drawStructuralWall(tx, ty, collision, roomLookup) {
  const px = tx * TILE, py = ty * TILE;
  const wallTop = [38, 47, 72];
  const wallFace = [22, 28, 46];
  const wallBorder = [64, 80, 118];

  // Solid 3D architectural wall block
  fillRect(px, py, px + TILE - 1, py + TILE - 1, wallFace);
  fillRect(px + 1, py + 1, px + TILE - 2, py + TILE - 8, wallTop);
  strokeRect(px, py, px + TILE - 1, py + TILE - 8, wallBorder);

  const belowWalkable = (ty + 1 < ROWS) && !(collision[ty + 1][tx] === 1 && isStructuralWall(tx, ty + 1));
  if (belowWalkable) {
    const rBelow = inferRoom(tx, ty + 1, roomLookup);
    const theme = ROOM_THEMES[rBelow] || ROOM_THEMES['情報大廳'];
    // Clean 2px neon accent strip along south wall baseboard
    fillRect(px, py + TILE - 7, px + TILE - 1, py + TILE - 1, [14, 18, 32]);
    fillRect(px, py + TILE - 5, px + TILE - 1, py + TILE - 4, theme.neon);
  }
}

function drawDoorTile(tx, ty, roomLookup) {
  const rAbove = inferRoom(tx, ty - 1, roomLookup);
  const rBelow = inferRoom(tx, ty + 1, roomLookup);
  const room = (rAbove && rAbove !== '情報大廳') ? rAbove : (rBelow || '情報大廳');
  drawFloorTile(tx, ty, room);

  const px = tx * TILE, py = ty * TILE;
  const theme = ROOM_THEMES[room] || ROOM_THEMES['情報大廳'];

  // Clean metallic door jambs on left & right
  fillRect(px, py + 4, px + 4, py + 27, [56, 70, 100], [88, 108, 148]);
  fillRect(px + 27, py + 4, px + 31, py + 27, [56, 70, 100], [88, 108, 148]);

  // Crisp glowing laser threshold bar
  fillRect(px + 5, py + 14, px + 26, py + 17, theme.neon);
  drawLine(px + 6, py + 15, px + 25, py + 15, theme.neonBright);
}

function drawChairTile(tx, ty, collision, room) {
  const px = tx * TILE, py = ty * TILE;
  const theme = ROOM_THEMES[room] || ROOM_THEMES['情報大廳'];

  let facing = 'down';
  const dirs = [
    [0, 1, 'down'],
    [0, -1, 'up'],
    [1, 0, 'right'],
    [-1, 0, 'left'],
  ];
  for (const [dx, dy, dirName] of dirs) {
    const nx = tx + dx, ny = ty + dy;
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
      if (collision[ny][nx] === 1 && !isStructuralWall(nx, ny)) {
        facing = dirName;
        break;
      }
    }
  }

  // Subtle floor shadow
  fillRect(px + 8, py + 20, px + 23, py + 27, [10, 13, 24]);
  // Clean ergonomic chair cushion (32x32 scale)
  fillRect(px + 8, py + 10, px + 23, py + 23, [36, 46, 70], theme.neon);
  fillRect(px + 10, py + 12, px + 21, py + 21, [48, 60, 88]);

  // Chair backrest
  if (facing === 'down') {
    fillRect(px + 8, py + 5, px + 23, py + 10, [24, 30, 50], theme.neon);
    drawLine(px + 11, py + 7, px + 20, py + 7, theme.neonBright);
  } else if (facing === 'up') {
    fillRect(px + 8, py + 21, px + 23, py + 26, [24, 30, 50], theme.neon);
    drawLine(px + 11, py + 24, px + 20, py + 24, theme.neonBright);
  } else if (facing === 'right') {
    fillRect(px + 5, py + 8, px + 10, py + 23, [24, 30, 50], theme.neon);
    drawLine(px + 7, py + 11, px + 7, py + 20, theme.neonBright);
  } else if (facing === 'left') {
    fillRect(px + 21, py + 8, px + 26, py + 23, [24, 30, 50], theme.neon);
    drawLine(px + 24, py + 11, px + 24, py + 20, theme.neonBright);
  }
}

function drawCyberFurniture(tx, ty, room) {
  drawFloorTile(tx, ty, room);
  const px = tx * TILE, py = ty * TILE;
  const theme = ROOM_THEMES[room] || ROOM_THEMES['情報大廳'];
  const deskSurface = [34, 44, 68];
  const deskFront = [20, 26, 44];
  const deskBorder = [72, 90, 128];
  const screenBg = [10, 18, 32];

  if (room === '夜盤房' || room === '日盤房' || room === '研究室') {
    // Clean, sharp trading desk + dual widescreen monitor
    fillRect(px + 1, py + 4, px + 30, py + 23, deskSurface, deskBorder);
    fillRect(px + 1, py + 23, px + 30, py + 29, deskFront, deskBorder);
    drawLine(px + 2, py + 26, px + 29, py + 26, theme.neon);

    // Widescreen Monitor
    fillRect(px + 4, py + 8, px + 27, py + 19, screenBg, theme.neon);
    // Crisp K-line bars inside screen
    const bars = [
      [6, 13, 17, [52, 211, 153]],
      [10, 11, 16, [52, 211, 153]],
      [14, 12, 17, [248, 113, 113]],
      [18, 10, 15, [52, 211, 153]],
      [22, 11, 16, theme.neonBright],
    ];
    for (const [bx, y1, y2, col] of bars) {
      fillRect(px + bx, py + y1, px + bx + 1, py + y2, col);
    }
  } else if (room === '委託執行室') {
    // Clean Order Gateway Server Console
    fillRect(px + 2, py + 2, px + 29, py + 29, [30, 26, 42], theme.neon);
    fillRect(px + 5, py + 5, px + 26, py + 26, [14, 14, 24], deskBorder);
    for (let ry = 9; ry <= 21; ry += 4) {
      fillRect(px + 8, py + ry, px + 19, py + ry + 1, theme.neon);
      fillRect(px + 22, py + ry, px + 23, py + ry + 1, [52, 211, 153]);
    }
  } else if (room === '情報大廳') {
    // Clean Quote Hub Monitor Desk
    fillRect(px + 1, py + 5, px + 30, py + 26, deskSurface, deskBorder);
    fillRect(px + 3, py + 8, px + 28, py + 21, screenBg, theme.neon);
    drawLine(px + 6, py + 15, px + 12, py + 12, theme.neonBright);
    drawLine(px + 12, py + 12, px + 19, py + 17, theme.neonBright);
    drawLine(px + 19, py + 17, px + 25, py + 11, theme.accent);
    drawLine(px + 2, py + 24, px + 29, py + 24, theme.neon);
  } else if (room === '休息房') {
    // Clean Lounge Table
    fillRect(px + 1, py + 3, px + 30, py + 28, [34, 32, 56], theme.neon);
    fillRect(px + 4, py + 6, px + 27, py + 25, [22, 28, 48], deskBorder);
    drawLine(px + 6, py + 15, px + 25, py + 15, [56, 189, 248]);
  }
}

function drawRoomOutlineBorders() {
  // Crisp 1px inner neon perimeter on each room so boundaries are super clear without foggy fill
  const roomBoxes = [
    ['夜盤房', 1, 1, 5, 7],
    ['委託執行室', 7, 1, 12, 7],
    ['日盤房', 14, 1, 18, 7],
    ['情報大廳', 1, 9, 18, 16],
    ['休息房', 1, 18, 12, 23],
    ['研究室', 14, 18, 18, 23],
  ];
  for (const [rname, x1, y1, x2, y2] of roomBoxes) {
    const neon = ROOM_THEMES[rname].neon;
    const px1 = x1 * TILE, py1 = y1 * TILE;
    const px2 = (x2 + 1) * TILE - 1, py2 = (y2 + 1) * TILE - 1;
    strokeRect(px1, py1, px2, py2, [
      Math.round(neon[0] * 0.55),
      Math.round(neon[1] * 0.55),
      Math.round(neon[2] * 0.55),
    ]);
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

function encodeNativePng(srcBuf, w, h) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    const srcStart = y * w * 4;
    Buffer.from(srcBuf.buffer, srcStart, w * 4).copy(raw, rowStart + 1);
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
  const mapData = JSON.parse(fs.readFileSync(MAP_JSON, 'utf8'));
  const roomLookup = {};
  for (const r of mapData.rooms || []) {
    for (const t of r.tiles || []) {
      roomLookup[`${t.x},${t.y}`] = r.name;
    }
  }
  const collision = mapData.collision;

  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const cell = collision[ty][tx];
      const room = inferRoom(tx, ty, roomLookup);
      if (cell === 0) {
        drawFloorTile(tx, ty, room);
      } else if (cell === 2) {
        drawDoorTile(tx, ty, roomLookup);
      } else if (cell === 3) {
        drawFloorTile(tx, ty, room);
        drawChairTile(tx, ty, collision, room);
      } else if (cell === 1) {
        if (isStructuralWall(tx, ty)) {
          drawStructuralWall(tx, ty, collision, roomLookup);
        } else {
          drawCyberFurniture(tx, ty, room);
        }
      }
    }
  }

  drawRoomOutlineBorders();

  const pngBuffer = encodeNativePng(buf, W, H);
  fs.mkdirSync(path.dirname(OUT_PNG), { recursive: true });
  fs.writeFileSync(OUT_PNG, pngBuffer);
  fs.writeFileSync(OUT_PLACEHOLDER, pngBuffer);
  console.log(`Generated Crisp 640x800 Office PNG: ${OUT_PNG} (${pngBuffer.length} bytes)`);
}

main();
