// news-image-20261123 — "The World in One Day"
// A one-day newspaper front page for Monday 23 November 2026, drawn
// procedurally with a 5x7 pixel font and a tiny PNG encoder, standard
// library only. No network, no randomness, no clock: two runs write
// byte-identical output. Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 pixel font. One string per glyph: 7 rows of 5 bits, joined by '/'.
// Only capitals, digits and common punctuation: the whole page is set in
// capitals, like a broadsheet poster.
// ---------------------------------------------------------------------------
const GLYPHS: Record<string, string> = {
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01110/10001/10000/10000/10000/10001/01110',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01110/10001/10000/10111/10001/10001/01111',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '01110/00100/00100/00100/00100/00100/01110',
  J: '00111/00010/00010/00010/00010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/10101/10011/10001/10001/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/10101/01010',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
  '0': '01110/10001/10011/10101/11001/10001/01110',
  '1': '00100/01100/00100/00100/00100/00100/01110',
  '2': '01110/10001/00001/00110/01000/10000/11111',
  '3': '11111/00010/00100/00010/00001/10001/01110',
  '4': '00010/00110/01010/10010/11111/00010/00010',
  '5': '11111/10000/11110/00001/00001/10001/01110',
  '6': '00110/01000/10000/11110/10001/10001/01110',
  '7': '11111/00001/00010/00100/01000/01000/01000',
  '8': '01110/10001/10001/01110/10001/10001/01110',
  '9': '01110/10001/10001/01111/00001/00010/01100',
  ' ': '00000/00000/00000/00000/00000/00000/00000',
  '.': '00000/00000/00000/00000/00000/01100/01100',
  ',': '00000/00000/00000/00000/01100/00100/01000',
  ':': '00000/01100/01100/00000/01100/01100/00000',
  ';': '00000/01100/01100/00000/01100/00100/01000',
  "'": '00100/00100/01000/00000/00000/00000/00000',
  '-': '00000/00000/00000/01110/00000/00000/00000',
  '(': '00010/00100/01000/01000/01000/00100/00010',
  ')': '01000/00100/00010/00010/00010/00100/01000',
  '/': '00001/00010/00010/00100/01000/01000/10000',
  '%': '11001/11010/00010/00100/01000/01011/10011',
  '!': '00100/00100/00100/00100/00100/00000/00100',
  '?': '01110/10001/00001/00110/00100/00000/00100',
  '&': '01100/10010/10100/01000/10101/10010/01101',
  '+': '00000/00100/00100/11111/00100/00100/00000',
  $: '00100/01111/10100/01110/00101/11110/00100',
  '"': '01010/01010/00000/00000/00000/00000/00000',
  '=': '00000/00000/11111/00000/11111/00000/00000',
  '*': '00000/10101/01110/11111/01110/10101/00000',
};

// ---------------------------------------------------------------------------
// Framebuffer: plain RGB bytes, with rectangle, disc and text drawing.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const INK: RGB = [26, 26, 26];
const PAPER: RGB = [248, 245, 238];
const NAVY: RGB = [22, 35, 63];
const GOLD: RGB = [217, 164, 65];
const RED: RGB = [193, 18, 31];
const TEAL: RGB = [15, 118, 110];
const SLATE: RGB = [90, 96, 110];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [46, 125, 50];
const SKY: RGB = [176, 216, 230];

const px = new Uint8Array(W * H * 3);

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

function fillDisc(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    fillRect(cx - half, cy + dy, half * 2 + 1, 1, c);
  }
}

function drawGlyph(x: number, y: number, scale: number, c: RGB, ch: string): void {
  const g = GLYPHS[ch] ?? GLYPHS['?'];
  const rows = g.split('/');
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (rows[r][col] === '1') {
        fillRect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  for (let i = 0; i < s.length; i++) {
    drawGlyph(x + i * 6 * scale, y, scale, c, s[i]);
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

// Greedy word wrap: returns lines that fit inside maxWidth pixels.
function wrapText(s: string, maxWidth: number, scale: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur === '' ? w : cur + ' ' + w;
    if (textWidth(next, scale) <= maxWidth || cur === '') {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: 8-bit RGB, no filtering, zlib via node:zlib.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Small pictograms, drawn from rectangles and discs.
// ---------------------------------------------------------------------------
function drawShip(x: number, y: number, s: number, c: RGB): void {
  // Hull: a stepped trapezoid.
  fillRect(x, y + 5 * s, 12 * s, 2 * s, c);
  fillRect(x + s, y + 7 * s, 10 * s, 2 * s, c);
  fillRect(x + 2 * s, y + 9 * s, 8 * s, s, c);
  // Deck cabin + mast + flag.
  fillRect(x + 4 * s, y + 3 * s, 4 * s, 2 * s, c);
  fillRect(x + 6 * s, y, s, 3 * s, c);
  fillRect(x + 7 * s, y, 3 * s, s, RED);
  // Waves.
  fillRect(x, y + 11 * s, 3 * s, s, c);
  fillRect(x + 5 * s, y + 11 * s, 3 * s, s, c);
  fillRect(x + 10 * s, y + 11 * s, 2 * s, s, c);
}

function drawDrop(x: number, y: number, s: number, c: RGB): void {
  fillDisc(x + 6 * s, y + 8 * s, 4 * s, c);
  fillRect(x + 4 * s, y + 4 * s, 4 * s, 3 * s, c);
  fillRect(x + 5 * s, y + 2 * s, 2 * s, 2 * s, c);
  fillRect(x + 3 * s, y + 7 * s, 2 * s, 3 * s, WHITE);
}

function drawBallot(x: number, y: number, s: number, c: RGB): void {
  fillRect(x, y + 4 * s, 12 * s, 8 * s, c);
  fillRect(x + 2 * s, y + 2 * s, 8 * s, 2 * s, c);
  // Check mark in white.
  fillRect(x + 3 * s, y + 7 * s, 2 * s, 2 * s, WHITE);
  fillRect(x + 5 * s, y + 6 * s, 2 * s, 3 * s, WHITE);
  fillRect(x + 7 * s, y + 5 * s, 2 * s, 4 * s, WHITE);
}

function drawFactory(x: number, y: number, s: number, c: RGB): void {
  fillRect(x, y + 5 * s, 12 * s, 7 * s, c);
  fillRect(x + s, y + 2 * s, 2 * s, 3 * s, c);
  fillRect(x + 9 * s, y, 2 * s, 5 * s, c);
  // Flame licking the chimney, in red.
  fillRect(x + 9 * s, y - 2 * s, 2 * s, 2 * s, RED);
  fillRect(x + 10 * s, y - 3 * s, s, s, RED);
}

// ---------------------------------------------------------------------------
// Layout helpers.
// ---------------------------------------------------------------------------
function rule(x: number, y: number, w: number, c: RGB, h = 2): void {
  fillRect(x, y, w, h, c);
}

function storyBlock(
  x: number,
  y: number,
  w: number,
  kicker: string,
  headline: string,
  body: string,
  icon: ((ix: number, iy: number) => void) | null,
): number {
  const iconW = icon ? 84 : 0;
  const textW = w - iconW;
  if (icon) icon(x + w - 72, y + 4);
  drawText(x, y + 8, kicker, 2, RED);
  const headLines = wrapText(headline, textW, 3);
  let yy = y + 34;
  for (const ln of headLines) {
    drawText(x, yy, ln, 3, INK);
    yy += 25;
  }
  yy += 6;
  const bodyLines = wrapText(body, w, 2);
  for (const ln of bodyLines) {
    drawText(x, yy, ln, 2, INK);
    yy += 17;
  }
  return yy;
}

// ---------------------------------------------------------------------------
// The front page.
// ---------------------------------------------------------------------------
function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  // Outer frame.
  fillRect(0, 0, W, 8, INK);
  fillRect(0, H - 8, W, 8, INK);
  fillRect(0, 0, 8, H, INK);
  fillRect(W - 8, 0, 8, H, INK);

  // Masthead.
  fillRect(16, 16, 992, 152, NAVY);
  drawTextCentered(512, 44, 'THE WORLD IN ONE DAY', 5, WHITE);
  drawTextCentered(512, 118, 'MONDAY 23 NOVEMBER 2026', 3, GOLD);
  rule(32, 182, 960, INK, 3);
  drawTextCentered(512, 194, 'SIX STORIES THAT DEFINED THE DAY', 2, INK);
  rule(32, 222, 960, INK, 3);

  // ---- Lead story: COP31 collapses.
  const lx = 32;
  const lw = 620;
  drawText(lx, 240, 'CLIMATE - COP31, TURKEY', 2, RED);
  let yy = 268;
  for (const ln of ['CLIMATE TALKS', 'COLLAPSE']) {
    drawText(lx, yy, ln, 4, INK);
    yy += 34;
  }
  yy += 8;
  const leadLines = wrapText(
    'UN CLIMATE SUMMIT IN TURKEY ENDS WITH NO DEAL AFTER RECORD-LONG TALKS SPLIT OVER FOSSIL FUELS AND FINANCE.',
    lw,
    2,
  );
  for (const ln of leadLines) {
    drawText(lx, yy, ln, 2, INK);
    yy += 17;
  }
  yy += 10;
  drawText(lx, yy, 'THE LONGEST CLIMATE CONFERENCE ON RECORD', 2, RED);
  yy += 17;
  drawText(lx, yy, 'BREAKS UP WITHOUT AGREEMENT.', 2, RED);

  // Lead art: a globe with a red slash, captioned.
  fillRect(684, 232, 308, 236, SKY);
  const cx = 838;
  const cy = 330;
  fillDisc(cx, cy, 78, TEAL);
  fillDisc(cx - 30, cy - 22, 22, GREEN);
  fillDisc(cx + 28, cy + 8, 26, GREEN);
  fillDisc(cx + 6, cy + 34, 14, GREEN);
  for (let i = -52; i <= 52; i += 9) {
    fillRect(cx + i - 4, cy - i - 4, 9, 9, RED);
  }
  drawTextCentered(838, 436, 'NO DEAL IN TURKEY', 2, RED);

  rule(32, 494, 960, INK, 2);

  // ---- Row 2.
  storyBlock(
    32, 510, 464,
    'WAR AT SEA - LIBYA',
    'UKRAINE SINKS RUSSIAN WARSHIP',
    'NAVAL DRONES HIT THE CORVETTE MERKURY AT BENGHAZI. KYIV SAYS THE WAR HAS REACHED THE MEDITERRANEAN.',
    (ix, iy) => drawShip(ix, iy, 5, INK),
  );
  storyBlock(
    528, 510, 464,
    'MIDDLE EAST - HORMUZ',
    'TRUMP WARNS IRAN OF NEW STRIKES',
    'US PRESIDENT THREATENS STRIKES IN THE NEW YEAR AS TANKER ATTACKS SURGE IN THE STRAIT OF HORMUZ.',
    (ix, iy) => drawDrop(ix, iy, 5, INK),
  );
  fillRect(510, 510, 2, 190, SLATE);

  rule(32, 716, 960, INK, 2);

  // ---- Row 3.
  storyBlock(
    32, 732, 464,
    'USA - MIDTERMS',
    'DEMOCRATS TAKE THE HOUSE',
    'PARTY WINS AT LEAST 258 SEATS, A HISTORIC MAJORITY IN THE US HOUSE OF REPRESENTATIVES.',
    (ix, iy) => drawBallot(ix, iy, 5, INK),
  );
  storyBlock(
    528, 732, 464,
    'ASIA - INDONESIA',
    'FACTORY FIRE KILLS 24',
    'BLAZE AT A SWEETS FACTORY LEAVES AT LEAST 24 DEAD AND DOZENS MISSING.',
    (ix, iy) => drawFactory(ix, iy, 5, INK),
  );
  fillRect(510, 732, 2, 180, SLATE);

  // ---- Footer strip: the science story.
  fillRect(16, 930, 992, 78, NAVY);
  drawTextCentered(512, 946, 'ALSO: AI HELPS PROVE RIEMANN HYPOTHESIS', 2, GOLD);
  drawTextCentered(512, 972, 'ANTHROPIC SAYS AI HELPED PROVE THE FAMOUS MATHS PUZZLE', 2, WHITE);
}

function main(): void {
  drawPage();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG());
}

main();
