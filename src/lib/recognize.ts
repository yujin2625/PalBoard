"use client";

import { PALS, palIconUrl } from "./pal-data";
import type { Pal, PalKey } from "./types";

// dHash: resize source to (HASH_SIZE+1) × HASH_SIZE grayscale, then for each
// row compare adjacent pixels (left > right ? 1 : 0). Yields a hash of
// (HASH_SIZE * HASH_SIZE) bits robust to color/lighting shifts and minor
// noise. 16 → 256-bit hash gives noticeably better discrimination between
// similar-silhouette pals than the classic 8 → 64-bit.
const HASH_SIZE = 16;
const HASH_W = HASH_SIZE + 1;
const HASH_H = HASH_SIZE;
const HASH_BITS = HASH_SIZE * HASH_SIZE;

type CanvasSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/** Compute dHash for any drawable source. Stored as a Uint8Array of bits
 * (one bit per byte slot is overkill but keeps comparisons branch-free). */
export type Hash = Uint8Array;

export function dHash(source: CanvasSource): Hash {
  const c = document.createElement("canvas");
  c.width = HASH_W;
  c.height = HASH_H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Uint8Array(HASH_BITS);
  // Mid-gray fill — minimises edge-case "left vs right" bits at the border
  // when the source has transparency.
  ctx.fillStyle = "#888";
  ctx.fillRect(0, 0, HASH_W, HASH_H);
  ctx.drawImage(source, 0, 0, HASH_W, HASH_H);
  const data = ctx.getImageData(0, 0, HASH_W, HASH_H).data;
  const out = new Uint8Array(HASH_BITS);
  let bit = 0;
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W - 1; x++) {
      const i = (y * HASH_W + x) * 4;
      const j = (y * HASH_W + x + 1) * 4;
      const g1 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const g2 = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
      out[bit++] = g1 > g2 ? 1 : 0;
    }
  }
  return out;
}

export function hammingDistance(a: Hash, b: Hash): number {
  let n = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) n++;
  return n;
}

// ---------- Icon hash dictionary -----------------------------------------

// Cache key embeds hash params so changes invalidate old caches automatically.
const CACHE_KEY = `palboard.iconHashes.v5.s${HASH_SIZE}`;

interface CachedEntry {
  hash: string; // hex
}

let _hashes: Map<PalKey, Hash> | null = null;

function hashToHex(h: Hash): string {
  let s = "";
  for (let i = 0; i < h.length; i += 4) {
    const nib = (h[i] << 3) | (h[i + 1] << 2) | (h[i + 2] << 1) | h[i + 3];
    s += nib.toString(16);
  }
  return s;
}

function hexToHash(s: string): Hash {
  const out = new Uint8Array(HASH_BITS);
  let bit = 0;
  for (let i = 0; i < s.length && bit < HASH_BITS; i++) {
    const nib = parseInt(s[i], 16);
    out[bit++] = (nib >> 3) & 1;
    out[bit++] = (nib >> 2) & 1;
    out[bit++] = (nib >> 1) & 1;
    out[bit++] = nib & 1;
  }
  return out;
}

async function loadIconAsImage(p: Pal): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = palIconUrl(p);
  await new Promise<void>((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("icon load failed: " + p.key));
  });
  return img;
}

export async function ensureIconHashes(
  onProgress?: (done: number, total: number) => void,
): Promise<Map<PalKey, Hash>> {
  if (_hashes) return _hashes;
  // Try cache
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, CachedEntry>;
      const map = new Map<PalKey, Hash>();
      for (const p of PALS) {
        const e = obj[p.key];
        if (!e) {
          map.clear();
          break;
        }
        map.set(p.key, hexToHash(e.hash));
      }
      if (map.size === PALS.length) {
        _hashes = map;
        return map;
      }
    }
  } catch {}

  // Compute fresh — load icons in parallel with a small concurrency limit.
  const map = new Map<PalKey, Hash>();
  const total = PALS.length;
  let done = 0;
  const concurrency = 16;
  let i = 0;
  async function worker() {
    while (i < PALS.length) {
      const idx = i++;
      const p = PALS[idx];
      try {
        const img = await loadIconAsImage(p);
        // Pre-process the reference icon the same way we treat screenshot
        // cells so the hashes are directly comparable.
        const cell = preprocessReference(img);
        map.set(p.key, dHash(cell));
      } catch {
        map.set(p.key, new Uint8Array(HASH_BITS));
      }
      done++;
      onProgress?.(done, total);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  // Persist cache
  try {
    const obj: Record<string, CachedEntry> = {};
    for (const [k, v] of map) obj[k] = { hash: hashToHex(v) };
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {}

  _hashes = map;
  return map;
}

// ---------- Cell extraction + matching -----------------------------------

export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RecognizedCell {
  index: number;
  /** Pal key with the smallest Hamming distance. */
  palKey: PalKey | null;
  distance: number;
  /** Gap between best and second-best (higher = more confident). */
  margin: number;
  /** True when the cell looks like an empty slot (very low variance). */
  empty: boolean;
  /** Thumbnail data URL for the result table. */
  thumb: string;
}

/** Slice a cropped region into a grid and recognize each cell. */
export function recognizeGrid(
  source: CanvasSource,
  crop: Crop,
  cols: number,
  rows: number,
  iconHashes: Map<PalKey, Hash>,
  opts: { gapX?: number; gapY?: number } = {},
): RecognizedCell[] {
  const gapX = opts.gapX ?? 0;
  const gapY = opts.gapY ?? 0;
  const out: RecognizedCell[] = [];
  const cellW = (crop.w - gapX * (cols - 1)) / cols;
  const cellH = (crop.h - gapY * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = crop.x + c * (cellW + gapX);
      const sy = crop.y + r * (cellH + gapY);
      const cell = extractCell(source, sx, sy, cellW, cellH);
      const empty = isEmptyCell(cell);
      const cellHash = dHash(cell);
      let best: PalKey | null = null;
      let bestDist = HASH_BITS + 1;
      let second = HASH_BITS + 1;
      if (!empty) {
        for (const [k, h] of iconHashes) {
          const d = hammingDistance(cellHash, h);
          if (d < bestDist) {
            second = bestDist;
            bestDist = d;
            best = k;
          } else if (d < second) {
            second = d;
          }
        }
      }
      out.push({
        index: r * cols + c,
        palKey: empty ? null : best,
        distance: bestDist,
        margin: second - bestDist,
        empty,
        thumb: cell.toDataURL("image/jpeg", 0.7),
      });
    }
  }
  return out;
}

/** Normalise a reference icon the same way we'd treat a screenshot cell so
 * dHashes are directly comparable: square crop, inner circular mask, corner
 * mask for the overlay slots. */
function preprocessReference(img: HTMLImageElement): HTMLCanvasElement {
  return extractCell(img, 0, 0, img.naturalWidth, img.naturalHeight);
}

/** Public helper: returns a JPEG data URL of the *processed* reference icon
 * (same masking the matcher uses internally). Used in the result table so
 * the user can see that screenshot cells and reference icons go through
 * the exact same corner-masking pipeline. */
export async function processedReferenceThumb(palKey: PalKey): Promise<string | null> {
  const pal = PALS.find((p) => p.key === palKey);
  if (!pal) return null;
  try {
    const img = await loadIconAsImage(pal);
    return preprocessReference(img).toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

/** Crop a single source rect into a normalised 96×96 hash canvas. The key
 * step is detecting the actual pal-body bounding box and zooming so it
 * fills the canvas — both screenshot cells (small pal inside a framed
 * circle) and wiki PNG references (pal already centered) end up at the
 * same scale, which is what makes their dHashes comparable. */
function extractCell(
  source: CanvasSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): HTMLCanvasElement {
  // Step 1: render the source rect at a working resolution.
  const TEMP = 256;
  const tmp = document.createElement("canvas");
  tmp.width = TEMP;
  tmp.height = TEMP;
  const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
  tctx.drawImage(source, sx, sy, sw, sh, 0, 0, TEMP, TEMP);

  // Step 2: find the tight foreground bbox (pal body, ignoring frame/bg).
  const bbox = detectForegroundBbox(tctx, TEMP, TEMP) ?? {
    x: TEMP * 0.07,
    y: TEMP * 0.07,
    w: TEMP * 0.86,
    h: TEMP * 0.86,
  };

  // Step 3: make the bbox square (centered) so the aspect ratio is
  // preserved when we drop it into the round hash canvas.
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  const side = Math.max(bbox.w, bbox.h) * 1.05; // small padding around the pal
  const sxx = Math.max(0, cx - side / 2);
  const syy = Math.max(0, cy - side / 2);
  const swH = Math.min(TEMP - sxx, side);
  const shH = Math.min(TEMP - syy, side);

  const size = 96;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#888";
  ctx.fillRect(0, 0, size, size);

  // Circular clip — keeps the corners as the bg fill so they don't bias
  // the hash. The pal body roughly fills the circle now.
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(tmp, sxx, syy, swH, shH, 0, 0, size, size);
  ctx.restore();

  // Cover the top corners with mid-gray. Lock/alpha-horn overlays in
  // screenshots and equivalent regions of the reference both get wiped so
  // the comparison stays apples-to-apples.
  ctx.fillStyle = "#888";
  ctx.beginPath();
  ctx.arc(size * 0.18, size * 0.18, size * 0.20, 0, Math.PI * 2);
  ctx.arc(size * 0.82, size * 0.18, size * 0.20, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/**
 * Detect the foreground (pal-body) bounding box inside a working canvas.
 *
 *   • If the source has meaningful alpha (typical wiki PNG with
 *     transparent background) we use the alpha channel.
 *   • Otherwise we sample a thin ring near the cell edges to learn the
 *     background colour, then find the bbox of pixels far enough from it.
 *
 * Returns null if nothing convincing is found (caller falls back to the
 * full canvas with a small inset).
 */
function detectForegroundBbox(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } | null {
  const data = ctx.getImageData(0, 0, w, h).data;

  // Probe alpha channel.
  let transparentPixels = 0;
  const stride = 4;
  for (let i = 3; i < data.length; i += stride * 16) {
    if (data[i] < 250) transparentPixels++;
  }
  const hasAlpha = transparentPixels > 8;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  if (hasAlpha) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 40) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
  } else {
    // Sample background from the outer ring (top/bottom/left/right strips
    // 4 px wide). Median is more robust than mean to a pal that touches
    // the border.
    const samples: number[][] = [];
    const pushSample = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      samples.push([data[i], data[i + 1], data[i + 2]]);
    };
    const strip = 4;
    for (let y = 0; y < strip; y++) for (let x = 0; x < w; x += 2) pushSample(x, y);
    for (let y = h - strip; y < h; y++) for (let x = 0; x < w; x += 2) pushSample(x, y);
    for (let x = 0; x < strip; x++) for (let y = 0; y < h; y += 2) pushSample(x, y);
    for (let x = w - strip; x < w; x++) for (let y = 0; y < h; y += 2) pushSample(x, y);
    const medianChannel = (idx: number) => {
      const arr = samples.map((s) => s[idx]).sort((a, b) => a - b);
      return arr[arr.length >> 1];
    };
    const bgR = medianChannel(0);
    const bgG = medianChannel(1);
    const bgB = medianChannel(2);

    // Threshold² — colour distance large enough to clearly differ from bg.
    const threshSq = 70 * 70;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dr = data[i] - bgR;
        const dg = data[i + 1] - bgG;
        const db = data[i + 2] - bgB;
        if (dr * dr + dg * dg + db * db > threshSq) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  // Sanity check — a bbox that fills 95%+ of the canvas means the
  // background detection failed; better to fall back to a manual inset.
  if (bw > w * 0.95 && bh > h * 0.95) return null;
  // Very tiny bbox is likely noise.
  if (bw < w * 0.15 || bh < h * 0.15) return null;
  return { x: minX, y: minY, w: bw, h: bh };
}

/** Conservative empty-slot heuristic — only the very darkest, most uniform
 * cells (the gray placeholder rings) are filtered out. Real pal icons keep
 * enough variance to pass. */
function isEmptyCell(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  const d = ctx.getImageData(w * 0.3, h * 0.3, w * 0.4, h * 0.4).data;
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    sum += g;
    sum2 += g * g;
    n++;
  }
  if (n === 0) return true;
  const mean = sum / n;
  const variance = sum2 / n - mean * mean;
  return variance < 80 && mean < 90;
}
