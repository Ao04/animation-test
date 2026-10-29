// Paper texture + film grain, generated procedurally once per browser tab
// (deterministic, so every rendered frame gets identical paper).

import { hash, rng } from "./math";

const make = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Value noise on a lattice, bilinear-smoothed: returns a w*h array in [0,1]. */
const valueNoise = (w: number, h: number, cell: number, seed: number) => {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = hash(i, seed);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = y / cell;
    const iy = Math.floor(fy);
    let ty = fy - iy;
    ty = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < w; x++) {
      const fx = x / cell;
      const ix = Math.floor(fx);
      let tx = fx - ix;
      tx = tx * tx * (3 - 2 * tx);
      const a = g[iy * gw + ix];
      const b = g[iy * gw + ix + 1];
      const c = g[(iy + 1) * gw + ix];
      const d = g[(iy + 1) * gw + ix + 1];
      out[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
};

let paperCache: HTMLCanvasElement | null = null;

/**
 * Mottled paper: blotchy low-frequency noise + fibres, meant to be drawn with
 * `multiply`. Mostly white so it only darkens slightly.
 */
export const paper = (w: number, h: number) => {
  if (paperCache && paperCache.width === w && paperCache.height === h) return paperCache;
  // build at half resolution then upscale smoothly - blotches are soft anyway
  const sw = Math.ceil(w / 2);
  const sh = Math.ceil(h / 2);
  const n1 = valueNoise(sw, sh, 90, 11);
  const n2 = valueNoise(sw, sh, 28, 23);
  const n3 = valueNoise(sw, sh, 7, 37);
  const small = make(sw, sh);
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(sw, sh);
  for (let i = 0; i < sw * sh; i++) {
    const v = 0.55 * n1[i] + 0.3 * n2[i] + 0.15 * n3[i];
    const shade = 1 - Math.max(0, v - 0.35) * 0.16;
    img.data[i * 4] = 255 * shade;
    img.data[i * 4 + 1] = 252 * shade;
    img.data[i * 4 + 2] = 246 * shade;
    img.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);

  const c = make(w, h);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, w, h);

  // faint fibres / scratches
  const r = rng(99);
  ctx.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = r() * Math.PI;
    const l = 6 + r() * 26;
    ctx.strokeStyle = `rgba(120,100,80,${0.025 + r() * 0.04})`;
    ctx.lineWidth = 0.6 + r() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  paperCache = c;
  return c;
};

const grainCache: HTMLCanvasElement[] = [];

/** A few tiles of fine monochrome grain (drawn with `overlay`, very low alpha). */
export const grainTile = (i: number) => {
  const N = 4;
  if (grainCache.length === 0) {
    for (let k = 0; k < N; k++) {
      const s = 256;
      const c = make(s, s);
      const ctx = c.getContext("2d")!;
      const img = ctx.createImageData(s, s);
      for (let p = 0; p < s * s; p++) {
        const v = 128 + (hash(p, 500 + k) - 0.5) * 255;
        img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = v;
        img.data[p * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      grainCache.push(c);
    }
  }
  return grainCache[((i % N) + N) % N];
};

/** Reusable offscreen canvas by key (for bloom etc.). */
const pool = new Map<string, HTMLCanvasElement>();
export const offscreen = (key: string, w: number, h: number) => {
  let c = pool.get(key);
  if (!c || c.width !== w || c.height !== h) {
    c = make(w, h);
    pool.set(key, c);
  }
  return c;
};
