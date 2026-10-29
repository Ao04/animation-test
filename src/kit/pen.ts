// Hand-drawn Canvas 2D toolkit.
//
// Shapes are described with a few anchor points and rendered as smooth
// Catmull-Rom splines. `handify` adds a small, *stable* wobble (seeded, not
// random per frame) so straight lines look inked by hand instead of
// ruler-perfect. Because the wobble lives in the shape's local space, parts
// can be moved, rotated and animated without the lines "swimming".

import { Pt, hash, noise1 } from "./math";

export type Ctx = CanvasRenderingContext2D;

export const INK = "#2a201c";
export const LINE = 5;

export interface HandOpts {
  seed?: number;
  amp?: number; // wobble amplitude in px
  step?: number; // subdivision length in px
  closed?: boolean;
}

/** Subdivide a polyline and push points along the normal with smooth noise. */
export const handify = (pts: Pt[], { seed = 1, amp = 1.1, step = 34, closed = false }: HandOpts = {}): Pt[] => {
  if (amp <= 0) return pts;
  const out: Pt[] = [];
  const n = pts.length;
  const segs = closed ? n : n - 1;
  let travelled = 0;
  for (let i = 0; i < segs; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const k = Math.max(1, Math.round(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const d = travelled + len * t;
      // anchors keep their exact position, in-between points wobble
      const w = j === 0 ? 0.25 : 1;
      const o = noise1(d / 55, seed) * amp * w + noise1(d / 13, seed + 9) * amp * 0.25 * w;
      out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
    }
    travelled += len;
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
};

/** Smooth closed/open Catmull-Rom path through points. */
export const spline = (ctx: Ctx, pts: Pt[], closed = true, tension = 1) => {
  const n = pts.length;
  if (n < 2) return;
  const p = (i: number): Pt => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const t = tension / 6;
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * t,
      p1[1] + (p2[1] - p0[1]) * t,
      p2[0] - (p3[0] - p1[0]) * t,
      p2[1] - (p3[1] - p1[1]) * t,
      p2[0],
      p2[1],
    );
  }
  if (closed) ctx.closePath();
};

/** Polyline path (sharp corners) with hand wobble. */
export const poly = (ctx: Ctx, pts: Pt[], closed = true) => {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
};

export interface PaintOpts {
  fill?: string | CanvasGradient | null;
  stroke?: string | null;
  lw?: number;
}

const paint = (ctx: Ctx, { fill, stroke = INK, lw = LINE }: PaintOpts) => {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && lw > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }
};

/** Organic blob: smooth closed spline through anchors, filled + inked. */
export const blob = (ctx: Ctx, pts: Pt[], opts: PaintOpts & { seed?: number; amp?: number } = {}) => {
  const p = handify(pts, { seed: opts.seed ?? 3, amp: opts.amp ?? 0.6, closed: true, step: 60 });
  ctx.beginPath();
  spline(ctx, p, true, 0.9);
  paint(ctx, opts);
};

/** Open curved ink line through points. */
export const curve = (ctx: Ctx, pts: Pt[], opts: { lw?: number; color?: string; seed?: number; amp?: number } = {}) => {
  const p = handify(pts, { seed: opts.seed ?? 5, amp: opts.amp ?? 0.6, step: 40 });
  ctx.beginPath();
  spline(ctx, p, false, 0.9);
  paint(ctx, { fill: null, stroke: opts.color ?? INK, lw: opts.lw ?? LINE });
};

/** Hand-inked straight line. */
export const line = (ctx: Ctx, a: Pt, b: Pt, opts: { lw?: number; color?: string; seed?: number; amp?: number } = {}) => {
  const p = handify([a, b], { seed: opts.seed ?? 11, amp: opts.amp ?? 1.2, step: 30 });
  ctx.beginPath();
  spline(ctx, p, false, 0.8);
  paint(ctx, { fill: null, stroke: opts.color ?? INK, lw: opts.lw ?? LINE });
};

/** Hand-inked rectangle with softly rounded corners. */
export const box = (
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: PaintOpts & { r?: number; seed?: number; amp?: number } = {},
) => {
  const r = Math.min(opts.r ?? 4, w / 2, h / 2);
  const c = r * 0.45;
  const pts: Pt[] = [
    [x + r, y],
    [x + w - r, y],
    [x + w - c, y + c],
    [x + w, y + r],
    [x + w, y + h - r],
    [x + w - c, y + h - c],
    [x + w - r, y + h],
    [x + r, y + h],
    [x + c, y + h - c],
    [x, y + h - r],
    [x, y + r],
    [x + c, y + c],
  ];
  const p = handify(pts, { seed: opts.seed ?? 21, amp: opts.amp ?? 1.0, closed: true, step: 36 });
  ctx.beginPath();
  spline(ctx, p, true, 0.55);
  paint(ctx, opts);
};

/**
 * Limb "tube": a smooth thick stroke with an ink outline. Several segments
 * with different widths can be passed; all outlines are drawn first so the
 * joints merge without inner seams.
 */
export const tubes = (ctx: Ctx, segs: { pts: Pt[]; w: number }[], fill: string, lw = LINE, ink = INK) => {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const pass of [0, 1]) {
    for (const s of segs) {
      ctx.beginPath();
      spline(ctx, s.pts, false, 1);
      ctx.strokeStyle = pass === 0 ? ink : fill;
      ctx.lineWidth = pass === 0 ? s.w + lw * 2 : s.w;
      ctx.stroke();
    }
  }
};

/** Stable pseudo-random in [a, b) keyed by an integer. */
export const pick = (i: number, a: number, b: number, seed = 0) => a + (b - a) * hash(i, seed);
