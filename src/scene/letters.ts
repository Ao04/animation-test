// Hand-lettered glyphs drawn with the ink pen (no font files needed).
// Each glyph is a list of strokes in a unit box (x: 0..width, y: 0..1).

import { Pt } from "../kit/math";
import { Ctx, curve } from "../kit/pen";

type Glyph = { w: number; strokes: { pts: Pt[]; smooth?: boolean }[] };

const G: Record<string, Glyph> = {
  E: { w: 0.62, strokes: [{ pts: [[0.62, 0], [0, 0], [0, 1], [0.62, 1]] }, { pts: [[0, 0.5], [0.52, 0.5]] }] },
  X: { w: 0.72, strokes: [{ pts: [[0, 0], [0.72, 1]] }, { pts: [[0.72, 0], [0, 1]] }] },
  A: { w: 0.78, strokes: [{ pts: [[0, 1], [0.39, 0], [0.78, 1]] }, { pts: [[0.17, 0.62], [0.61, 0.62]] }] },
  M: { w: 0.86, strokes: [{ pts: [[0, 1], [0.04, 0], [0.43, 0.62], [0.82, 0], [0.86, 1]] }] },
  D: {
    w: 0.7,
    strokes: [{ pts: [[0, 0], [0, 1]] }, { pts: [[0, 0], [0.42, 0.03], [0.7, 0.5], [0.42, 0.97], [0, 1]], smooth: true }],
  },
  Y: { w: 0.72, strokes: [{ pts: [[0, 0], [0.36, 0.5], [0.72, 0]] }, { pts: [[0.36, 0.5], [0.36, 1]] }] },
  S: {
    w: 0.62,
    strokes: [{ pts: [[0.6, 0.12], [0.32, 0], [0.04, 0.2], [0.3, 0.48], [0.6, 0.74], [0.32, 1], [0.02, 0.88]], smooth: true }],
  },
  "3": {
    w: 0.6,
    strokes: [{ pts: [[0.02, 0.12], [0.3, 0], [0.58, 0.2], [0.28, 0.47], [0.6, 0.72], [0.3, 1], [0.0, 0.88]], smooth: true }],
  },
  ":": { w: 0.18, strokes: [{ pts: [[0.09, 0.3], [0.09, 0.31]] }, { pts: [[0.09, 0.82], [0.09, 0.83]] }] },
  " ": { w: 0.35, strokes: [] },
};

/** Draw text with straight segments (sharp letters) or smooth curves. */
export const letter = (ctx: Ctx, text: string, x: number, y: number, size: number, color: string, lw: number, seed = 1) => {
  let cx = x;
  let i = 0;
  for (const ch of text) {
    const g = G[ch];
    if (!g) continue;
    for (const s of g.strokes) {
      const pts = s.pts.map(([px, py]) => [cx + px * size, y + py * size] as Pt);
      if (s.smooth) {
        curve(ctx, pts, { lw, color, seed: seed + i * 7, amp: 0.8 });
      } else {
        // segment by segment so corners stay crisp
        for (let k = 0; k < pts.length - 1; k++) {
          curve(ctx, [pts[k], pts[k + 1]], { lw, color, seed: seed + i * 7 + k, amp: 0.8 });
        }
      }
      i++;
    }
    cx += (g.w + 0.2) * size;
  }
};
