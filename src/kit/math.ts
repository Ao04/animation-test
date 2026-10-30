// Small deterministic math / animation helpers. Nothing here uses Math.random,
// so every frame renders identically no matter which order Remotion draws it.

export type Pt = [number, number];

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const deg = (d: number) => (d * Math.PI) / 180;

export const rot = ([x, y]: Pt, a: number): Pt => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
};
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Pt, s: number): Pt => [a[0] * s, a[1] * s];
export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Hash an integer (and optional seed) into [0, 1). */
export const hash = (n: number, seed = 0) => {
  let h = (Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** Smooth 1D value noise in [-1, 1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
};

/** Seeded PRNG (mulberry32) for building stable layouts. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Damped-spring response to a unit step that happened `dt` seconds ago.
 * Returns 0 before the step, settles at 1 with a little overshoot.
 */
export const springStep = (dt: number, freq = 6, damping = 0.45) => {
  if (dt <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * dt) * (Math.cos(wd * dt) + ((damping * w) / wd) * Math.sin(wd * dt));
};

/**
 * Fingertip curve around a key press at d = t - tKey (seconds):
 * lift (negative), strike, short hold, release with a tiny rebound.
 */
export const pressCurve = (d: number, lift: number, press: number) => {
  if (d < -0.11 || d > 0.2) return 0;
  if (d < -0.035) return -lift * easeOut(invLerp(-0.11, -0.035, d));
  if (d < 0) return lerp(-lift, press, easeIn(invLerp(-0.035, 0, d)));
  if (d < 0.04) return press;
  const r = invLerp(0.04, 0.2, d);
  return press * (1 - easeOut(r)) - Math.sin(r * Math.PI) * lift * 0.18;
};

/** Standard blink: fast close, short hold, slower open. Returns 0..1. */
export const blinkCurve = (d: number) => {
  if (d < 0 || d >= 0.2) return 0;
  if (d < 0.05) return easeIn(d / 0.05);
  if (d < 0.085) return 1;
  return 1 - easeOut((d - 0.085) / 0.115);
};

/** 0 -> 1 -> 0 bump between a and b (smooth). */
export const bump = (t: number, a: number, b: number) => Math.sin(clamp((t - a) / (b - a)) * Math.PI);

/** Two-bone IK: returns the elbow position for a limb from `a` to target `c`. */
export const ik2 = (a: Pt, c: Pt, l1: number, l2: number, bendSign: 1 | -1): Pt => {
  const d = Math.min(dist(a, c), l1 + l2 - 0.01);
  const base = Math.atan2(c[1] - a[1], c[0] - a[0]);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = base + bendSign * Math.acos(cosA);
  return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
};
