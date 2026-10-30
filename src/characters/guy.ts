// Male university student (21) for the bedroom set, built from a `GuyLook`
// so several designs share one rig: same seated typing pose as the girl,
// but adult male proportions (smaller head, longer neck, broader shoulders,
// a jawline, a hint of a nose, heavier brows).
//
// Hair never floats: its outer contour is computed by casting rays from the
// skull centre to the face outline and adding a small per-style volume, so
// the hair always hugs the head.

import { Pt, add, clamp, ik2, lerp, rot } from "../kit/math";
import { Ctx, blob, curve, penStyle, spline, tubes } from "../kit/pen";
import { BASE_LEAN, FAR_WRIST, FLOOR_Y, HIP, KEY_Y, NEAR_WRIST } from "../scene/layout";
import { HandPose, Pose } from "../scene/motion";

export type HairStyle = "short" | "centre" | "perm" | "sidePart" | "twoBlock";
export type TopKind = "hoodie" | "crew" | "knit" | "overshirt" | "cardigan";

export interface GuyLook {
  skin: string;
  skinShade: string;
  skinFar: string;
  hair: string;
  hairStyle: HairStyle;
  top: TopKind;
  main: string; // garment colour
  shade: string;
  deep: string;
  inner?: string; // tee under an open shirt / cardigan
  pants: string;
  pantsShade: string;
  shoe: string;
  sole: string;
  glasses?: boolean;
  stubble?: boolean;
}

type Xf = (p: Pt) => Pt;
const frame = (o: Pt, a: number, s = 1): Xf => (p) => add(o, rot([p[0] * s, p[1] * s], a));
const ink = () => penStyle.ink;

const HEAD_SCALE = 1.04;
const HEAD_C: Pt = [14, -104]; // a little higher than the girl's: longer neck

interface Rig {
  T: Xf;
  head: Xf;
  headAngle: number;
}

const rig = (pose: Pose): Rig => {
  const torsoAngle = BASE_LEAN + pose.lean;
  const lift = pose.breath * 1.6;
  const T: Xf = (p) => {
    const k = clamp(-p[1] / 250);
    return frame(HIP, torsoAngle)([p[0] * 1.06 + pose.breath * 1.2 * k, p[1] - lift * k]);
  };
  const neck = T([24, -250]);
  const headAngle = torsoAngle + 0.05 + pose.headTilt;
  return { T, head: frame(neck, headAngle, HEAD_SCALE), headAngle };
};

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------

const shoe = (ctx: Ctx, ankle: Pt, fill: string, sole: string, seed: number) => {
  const [x, y] = ankle;
  const bottom = FLOOR_Y - 2;
  blob(
    ctx,
    [
      [x - 32, y - 6],
      [x + 6, y - 14],
      [x + 42, y + 4],
      [x + 84, bottom - 22],
      [x + 98, bottom - 8],
      [x + 90, bottom],
      [x - 22, bottom],
      [x - 36, bottom - 14],
    ],
    { fill, seed, amp: 0.4 },
  );
  ctx.save();
  ctx.fillStyle = sole;
  ctx.fillRect(x - 34, bottom - 10, 128, 8);
  ctx.restore();
  curve(ctx, [[x - 34, bottom - 10], [x + 94, bottom - 10]], { lw: 3, seed: seed + 3 });
  curve(ctx, [[x + 8, y + 2], [x + 22, y + 14]], { lw: 2.5, seed: seed + 1 });
  curve(ctx, [[x + 18, y + 0], [x + 32, y + 10]], { lw: 2.5, seed: seed + 2 });
};

export const drawGuyLegs = (ctx: Ctx, _pose: Pose, L: GuyLook) => {
  const fh: Pt = [HIP[0] + 14, HIP[1] + 6];
  const fk: Pt = [840, 728];
  const fa: Pt = [836, 952];
  tubes(ctx, [{ pts: [fh, [734, 730], fk], w: 74 }, { pts: [fk, [842, 840], fa], w: 58 }], L.pantsShade);
  shoe(ctx, fa, L.sole, L.sole, 301);

  const h: Pt = [HIP[0], HIP[1] + 12];
  const k: Pt = [820, 738];
  const a: Pt = [806, 956];
  tubes(ctx, [{ pts: [h, [716, 740], k], w: 80 }, { pts: [k, [816, 846], a], w: 62 }], L.pants);
  curve(ctx, [[788, 760], [806, 775], [814, 796]], { lw: 3, seed: 311, color: "rgba(10,8,12,0.55)" });
  shoe(ctx, a, L.shoe, L.sole, 321);
};

// ---------------------------------------------------------------------------
// Arms & hands
// ---------------------------------------------------------------------------

interface ArmColors {
  sleeve: string;
  sleeveShade: string;
  skin: string;
  skinFar: string;
}

const HAND_SCALE = 1.28; // bigger hands than the girl's
const FINGER_REACH = [0, 9, 4];

const drawHand = (ctx: Ctx, wrist: Pt, angle: number, hp: HandPose, col: ArmColors, seed: number) => {
  const H = frame(wrist, angle, HAND_SCALE);
  const finger = (i: number, w: number, fill: string) => {
    const base = H([44, 8 - i * 7]);
    const tipRef = H([72 + FINGER_REACH[i], 0]);
    const lifted = Math.min(0, hp.dy) * 0.9;
    const tip: Pt = [tipRef[0], KEY_Y - 4 + hp.fingers[i] + lifted];
    const mid: Pt = [lerp(base[0], tip[0], 0.55), lerp(base[1], tip[1], 0.3) - 3.5];
    tubes(ctx, [{ pts: [base, mid, tip], w }], fill);
  };
  finger(2, 15, col.skinFar);
  finger(1, 15.5, col.skinFar);
  const tb = H([14, 10]);
  const tt: Pt = add(H([40, 15]), [0, hp.thumb]);
  tubes(ctx, [{ pts: [tb, tt], w: 16 }], col.skinFar);
  const palm = ([
    [-6, -16],
    [18, -20],
    [40, -15],
    [52, -5],
    [52, 9],
    [38, 15],
    [14, 17],
    [-6, 14],
  ] as Pt[]).map(H);
  blob(ctx, palm, { fill: col.skin, seed, amp: 0.3 });
  finger(0, 16.5, col.skin);
  // knuckle line: reads as a grown-up hand
  curve(ctx, [H([30, -14]), H([40, -12])], { lw: 2, seed: seed + 5, color: "rgba(42,32,28,0.45)" });
};

const drawArm = (ctx: Ctx, shoulder: Pt, wrist: Pt, hp: HandPose, col: ArmColors, seed: number, ribbed: boolean) => {
  const elbow = ik2(shoulder, wrist, 140, 140, 1);
  const um: Pt = [lerp(shoulder[0], elbow[0], 0.5) - 2, lerp(shoulder[1], elbow[1], 0.5) + 2];
  const fa = Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]);
  const cuffEnd = add(wrist, rot([-6, 0], fa));
  const fm: Pt = [lerp(elbow[0], cuffEnd[0], 0.5), lerp(elbow[1], cuffEnd[1], 0.5) - 1.5];

  drawHand(ctx, wrist, fa + 0.08 + hp.rot, hp, col, seed + 10);
  tubes(ctx, [{ pts: [shoulder, um, elbow], w: 54 }, { pts: [elbow, fm, cuffEnd], w: 45 }], col.sleeve);

  const E = frame(elbow, fa);
  curve(ctx, [E([10, -15]), E([20, -6]), E([22, 6])], { lw: 2.6, seed: seed + 1 });
  curve(ctx, [E([-18, 11]), E([-4, 17])], { lw: 2.6, seed: seed + 2 });
  ctx.save();
  ctx.strokeStyle = col.sleeveShade;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  const s0 = E([18, 16]);
  const s1 = add(cuffEnd, rot([-30, 16], fa));
  ctx.moveTo(s0[0], s0[1]);
  ctx.lineTo(s1[0], s1[1]);
  ctx.stroke();
  ctx.restore();

  const K = frame(cuffEnd, fa);
  const cuff = ([
    [-13, -23],
    [1, -22],
    [3, 0],
    [1, 22],
    [-13, 23],
    [-15, 0],
  ] as Pt[]).map(K);
  blob(ctx, cuff, { fill: ribbed ? col.sleeveShade : col.sleeve, seed: seed + 3, amp: 0.2 });
  if (ribbed) curve(ctx, [K([-6, -19]), K([-5, 19])], { lw: 2, seed: seed + 4, color: "rgba(42,32,28,0.5)" });
};

// ---------------------------------------------------------------------------
// Upper body
// ---------------------------------------------------------------------------

const TORSO: Pt[] = [
  [-60, 32],
  [-70, -40],
  [-72, -122],
  [-66, -196],
  [-46, -240],
  [-6, -260],
  [32, -256],
  [56, -226],
  [66, -160],
  [72, -90],
  [78, -10],
  [72, 26],
  [10, 40],
];

const clipTo = (ctx: Ctx, pts: Pt[], draw: () => void) => {
  ctx.save();
  ctx.beginPath();
  spline(ctx, pts, true, 0.9);
  ctx.clip();
  draw();
  ctx.restore();
};

const fillPts = (ctx: Ctx, pts: Pt[], color: string, tension = 0.8) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  spline(ctx, pts, true, tension);
  ctx.fill();
};

const drawTop = (ctx: Ctx, pose: Pose, R: Rig, L: GuyLook) => {
  const T = R.T;
  const torso = TORSO.map(T);
  blob(ctx, torso, { fill: L.main, seed: 401, amp: 0.5, stroke: null });
  clipTo(ctx, torso, () => {
    // back-side cel shade
    fillPts(ctx, ([[-95, 50], [-95, -275], [-42, -264], [-50, -190], [-54, -100], [-46, -20], [-30, 50]] as Pt[]).map(T), L.shade, 0.9);
    // open shirt / cardigan: the tee shows at the front
    if ((L.top === "overshirt" || L.top === "cardigan") && L.inner) {
      const v = L.top === "cardigan" ? -150 : -244;
      fillPts(ctx, ([[30, -262], [70, -250], [100, -120], [100, 50], [56, 50], [50, -60], [44, v + 30], [22, -250]] as Pt[]).map(T), L.inner, 0.5);
      fillPts(ctx, ([[60, -100], [100, -100], [100, 50], [56, 50]] as Pt[]).map(T), "rgba(0,0,0,0.06)", 0.5);
    }
    // hem band
    if (L.top !== "overshirt") fillPts(ctx, ([[-80, 8], [10, 14], [90, 2], [90, 50], [-80, 50]] as Pt[]).map(T), L.shade, 0.6);
  });
  blob(ctx, torso, { fill: null, seed: 401, amp: 0.5 });

  if (L.top !== "overshirt") curve(ctx, [T([-66, 6]), T([10, 14]), T([74, 2])], { lw: 3, seed: 402 });

  switch (L.top) {
    case "hoodie": {
      curve(ctx, [T([74, -104]), T([48, -92]), T([38, -52]), T([42, -6])], { lw: 3.2, seed: 403 });
      blob(ctx, ([[-66, -228], [-64, -264], [-38, -292], [0, -294], [22, -276], [14, -254], [-18, -242], [-48, -224]] as Pt[]).map(T), {
        fill: L.shade,
        seed: 404,
        amp: 0.4,
      });
      curve(ctx, [T([-52, -238]), T([-30, -264]), T([-2, -274])], { lw: 2.8, seed: 405 });
      const s0 = T([36, -250]);
      const sw = pose.stringSway * 60;
      const s2: Pt = [s0[0] + 9 + sw, s0[1] + 78];
      curve(ctx, [s0, [s0[0] + 6 + sw * 0.5, s0[1] + 38], s2], { lw: 3, seed: 407 });
      tubes(ctx, [{ pts: [s2, [s2[0] + sw * 0.12, s2[1] + 10]], w: 4 }], L.deep, 2);
      break;
    }
    case "crew":
    case "knit": {
      // ribbed crew neck
      tubes(ctx, [{ pts: [T([-10, -258]), T([14, -266]), T([40, -254])], w: 9 }], L.shade, 2.5);
      if (L.top === "knit") {
        for (const x of [24, 50]) {
          const pts: Pt[] = [];
          for (let y = -236; y <= 0; y += 18) pts.push(T([x + (y % 36 === 0 ? 3 : -3), y]));
          curve(ctx, pts, { lw: 2.2, seed: 420 + x, color: "rgba(60,40,25,0.45)" });
        }
      }
      break;
    }
    case "overshirt":
    case "cardigan": {
      // front edge of the open garment
      const edge = L.top === "cardigan"
        ? ([[24, -252], [38, -200], [46, -150], [50, -60], [54, 34]] as Pt[])
        : ([[26, -256], [40, -200], [48, -120], [52, -40], [56, 34]] as Pt[]);
      curve(ctx, edge.map(T), { lw: 3.2, seed: 430 });
      if (L.top === "overshirt") {
        // collar flap + chest pocket
        blob(ctx, ([[-8, -262], [30, -262], [44, -236], [18, -232]] as Pt[]).map(T), { fill: L.shade, seed: 431, amp: 0.3 });
        blob(ctx, ([[8, -190], [40, -192], [42, -158], [10, -156]] as Pt[]).map(T), { fill: L.main, seed: 432, amp: 0.3 });
        curve(ctx, [T([8, -182]), T([41, -184])], { lw: 2.2, seed: 433 });
      } else {
        tubes(ctx, [{ pts: [T([-10, -258]), T([12, -264]), T([24, -252])], w: 8 }], L.shade, 2.5);
        for (const y of [-150, -100, -50]) {
          ctx.fillStyle = L.deep;
          const b = T([44 + (y + 150) * 0.04, y]);
          ctx.beginPath();
          ctx.arc(b[0], b[1], 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // tee neckline
      curve(ctx, [T([30, -256]), T([46, -240]), T([60, -246])], { lw: 2.6, seed: 434 });
      break;
    }
  }
};

export const drawGuyUpper = (ctx: Ctx, pose: Pose, L: GuyLook) => {
  const R = rig(pose);
  const T = R.T;
  const shoulderNear: Pt = add(T([4, -210]), [0, -pose.shoulder * 0.6]);
  const shoulderFar: Pt = add(T([-6, -216]), [0, -pose.shoulder * 0.4]);
  const ribbed = L.top !== "overshirt";

  drawArm(ctx, shoulderFar, add(FAR_WRIST, [pose.far.dx, pose.far.dy]), pose.far, { sleeve: L.shade, sleeveShade: L.deep, skin: L.skinShade, skinFar: L.skinFar }, 500, ribbed);
  drawTop(ctx, pose, R, L);

  // neck (thicker than the girl's)
  const nb = T([20, -246]);
  const nt = R.head([6, -30]);
  tubes(ctx, [{ pts: [nb, nt], w: 42 }], L.skin);
  ctx.save();
  ctx.strokeStyle = L.skinShade;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  const a = R.head([-6, -26]);
  const b = T([10, -248]);
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();
  // collar over the neck base
  if (L.top === "hoodie") curve(ctx, [T([10, -260]), T([28, -248]), T([40, -252])], { lw: 3, seed: 406 });

  drawHead(ctx, pose, R, L);

  drawArm(ctx, shoulderNear, add(NEAR_WRIST, [pose.near.dx, pose.near.dy]), pose.near, { sleeve: L.main, sleeveShade: L.shade, skin: L.skin, skinFar: L.skinShade }, 600, ribbed);
};

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

// Head-local outline (relative to the head centre), facing right: a squarer
// jaw and a chin, compared with the girl's round face.
const FACE: Pt[] = [
  [-68, -32],
  [-54, -68],
  [-10, -86],
  [36, -80],
  [66, -50],
  [76, -12],
  [78, 16],
  [72, 42],
  [58, 64],
  [32, 80],
  [4, 82],
  [-26, 72],
  [-56, 44],
];
const SKULL_C: Pt = [2, -6];

/** Distance from the skull centre to the face outline along angle `a`. */
const skullR = (a: number) => {
  const d: Pt = [Math.cos(a), Math.sin(a)];
  let best = 80;
  for (let i = 0; i < FACE.length; i++) {
    const p = FACE[i];
    const q = FACE[(i + 1) % FACE.length];
    const e: Pt = [q[0] - p[0], q[1] - p[1]];
    const w: Pt = [p[0] - SKULL_C[0], p[1] - SKULL_C[1]];
    const den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) < 1e-6) continue;
    const t = (w[0] * e[1] - w[1] * e[0]) / den;
    const u = (w[0] * d[1] - w[1] * d[0]) / den;
    if (t > 0 && u >= 0 && u <= 1) best = t;
  }
  return best;
};

interface HairDef {
  from: number; // start angle (nape, back-lower), radians
  to: number; // end angle (forehead), radians, going over the top
  vol: (u: number) => number; // volume above the skull, u: 0 nape .. 1 forehead
  hairline: Pt[]; // forehead -> temple -> around the ear -> nape
  detail?: (ctx: Ctx, P: Xf, L: GuyLook) => void;
}

const deg = (d: number) => (d * Math.PI) / 180;

const HAIR: Record<HairStyle, HairDef> = {
  // 1. natural short cut with a soft, slightly textured fringe
  short: {
    from: deg(142),
    to: deg(322),
    vol: (u) => 6 + 8 * Math.sin(Math.PI * Math.min(1, u * 1.2)) + 2 * Math.abs(Math.sin(u * 40)),
    hairline: [
      [60, -50],
      [50, -40],
      [42, -48],
      [32, -36],
      [22, -42],
      [10, -30],
      [0, -12],
      [-2, 14],
      [-12, 14],
      [-14, -6],
      [-30, -12],
      [-46, -2],
      [-54, 30],
      [-60, 42],
    ],
  },
  // 2. centre part, fringe falling to the temples, ears half covered
  centre: {
    from: deg(138),
    to: deg(300),
    vol: (u) => 8 + 6 * Math.sin(Math.PI * u),
    hairline: [
      [42, -74],
      [56, -56],
      [60, -34],
      [50, -28],
      [38, -40],
      [22, -52],
      [10, -44],
      [2, -22],
      [-2, 8],
      [-6, 30],
      [-20, 22],
      [-38, 30],
      [-50, 52],
      [-62, 58],
    ],
    detail: (ctx, P) => {
      curve(ctx, [P([28, -84]), P([46, -64]), P([54, -40])], { lw: 2.4, seed: 851, color: "rgba(0,0,0,0.5)" });
      curve(ctx, [P([20, -86]), P([4, -60]), P([2, -30])], { lw: 2.4, seed: 852, color: "rgba(0,0,0,0.5)" });
    },
  },
  // 3. loose perm: wavy outline and curls
  perm: {
    from: deg(140),
    to: deg(326),
    vol: (u) => 11 + 7 * Math.sin(Math.PI * u) + 5 * Math.abs(Math.sin(u * Math.PI * 8)),
    hairline: [
      [64, -40],
      [54, -30],
      [46, -38],
      [36, -26],
      [24, -34],
      [12, -22],
      [4, -6],
      [0, 18],
      [-12, 18],
      [-16, -4],
      [-32, -8],
      [-46, 6],
      [-54, 40],
      [-62, 52],
    ],
    detail: (ctx, P) => {
      const c = "rgba(255,235,215,0.16)";
      for (const [x, y, s] of [[-40, -64, 1], [-6, -80, 2], [30, -70, 3], [-58, -20, 4], [-30, -30, 5], [8, -54, 6]]) {
        curve(ctx, [P([x - 8, y + 4]), P([x - 2, y - 6]), P([x + 8, y - 2]), P([x + 4, y + 6])], { lw: 2.4, seed: 860 + s, color: c });
      }
    },
  },
  // 4. neat side part (pairs with glasses)
  sidePart: {
    from: deg(142),
    to: deg(320),
    vol: (u) => 6 + 7 * Math.sin(Math.PI * u),
    hairline: [
      [58, -54],
      [48, -44],
      [34, -46],
      [20, -46],
      [8, -34],
      [0, -14],
      [-2, 12],
      [-12, 12],
      [-14, -8],
      [-30, -12],
      [-46, -4],
      [-54, 28],
      [-60, 40],
    ],
    detail: (ctx, P) => {
      curve(ctx, [P([-24, -86]), P([10, -88]), P([40, -78])], { lw: 2.4, seed: 871, color: "rgba(0,0,0,0.55)" });
      curve(ctx, [P([14, -80]), P([36, -66]), P([50, -50])], { lw: 2.2, seed: 872, color: "rgba(255,235,215,0.14)" });
    },
  },
  // 5. two-block: very short faded sides, textured top
  twoBlock: {
    from: deg(146),
    to: deg(318),
    vol: (u) => (u < 0.38 ? 2.5 : 2.5 + 13 * Math.min(1, (u - 0.38) / 0.25)) + (u > 0.5 ? 2 * Math.abs(Math.sin(u * 46)) : 0),
    hairline: [
      [62, -58],
      [54, -52],
      [46, -60],
      [36, -50],
      [22, -54],
      [10, -40],
      [0, -20],
      [-2, 6],
      [-10, 8],
      [-14, -10],
      [-30, -14],
      [-46, -6],
      [-54, 26],
      [-60, 38],
    ],
    detail: (ctx, P, L) => {
      // buzzed sides: let the skin show through under the top section
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = L.skinShade;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      spline(ctx, ([[-90, -40], [-40, -46], [0, -40], [10, 40], [-90, 60]] as Pt[]).map(P), true, 0.6);
      ctx.fill();
      ctx.restore();
    },
  },
};

const drawHair = (ctx: Ctx, P: Xf, L: GuyLook) => {
  const def = HAIR[L.hairStyle];
  const outer: Pt[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = lerp(def.from, def.to, u);
    const r = skullR(a) + def.vol(u);
    outer.push(P([SKULL_C[0] + Math.cos(a) * r, SKULL_C[1] + Math.sin(a) * r]));
  }
  const shape = [...outer, ...def.hairline.map(P)];

  // draw on a scratch layer so style details can use source-atop safely
  const prev = ctx.globalCompositeOperation;
  ctx.save();
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  spline(ctx, shape, true, 0.7);
  ctx.fill();
  ctx.clip();
  ctx.globalCompositeOperation = prev;
  // crown sheen
  ctx.filter = "blur(3px)";
  curve(ctx, [P([-50, -70]), P([-16, -94]), P([24, -96])], { lw: 10, color: "rgba(255,240,225,0.10)", seed: 811, amp: 0.2 });
  ctx.filter = "none";
  def.detail?.(ctx, P, L);
  ctx.restore();

  ctx.beginPath();
  spline(ctx, shape, true, 0.7);
  ctx.strokeStyle = ink();
  ctx.lineWidth = penStyle.lw;
  ctx.lineJoin = "round";
  ctx.stroke();
};

const drawHead = (ctx: Ctx, pose: Pose, R: Rig, L: GuyLook) => {
  const P: Xf = (p) => R.head([p[0] + HEAD_C[0], p[1] + HEAD_C[1]]);

  blob(ctx, FACE.map(P), { fill: L.skin, seed: 701, amp: 0.3 });

  if (L.stubble) {
    ctx.save();
    ctx.beginPath();
    spline(ctx, FACE.map(P), true, 0.9);
    ctx.clip();
    ctx.filter = "blur(4px)";
    ctx.fillStyle = "rgba(70,55,55,0.22)";
    ctx.beginPath();
    spline(ctx, ([[16, 44], [50, 34], [84, 30], [84, 90], [10, 90]] as Pt[]).map(P), true, 0.8);
    ctx.fill();
    ctx.restore();
  }

  // ear
  blob(ctx, ([[-30, -8], [-14, -14], [-6, 4], [-10, 24], [-24, 26], [-32, 10]] as Pt[]).map(P), { fill: L.skin, seed: 720, amp: 0.2 });
  curve(ctx, [P([-24, 0]), P([-14, 2]), P([-16, 16])], { lw: 2.4, seed: 721, color: "rgba(42,32,28,0.6)" });

  // eye
  const lidDrop = pose.blink * 7;
  const ec = P([47, 4]);
  if (pose.blink < 0.95) {
    ctx.save();
    ctx.translate(ec[0], ec[1]);
    ctx.rotate(R.headAngle);
    ctx.beginPath();
    ctx.rect(-20, lidDrop - 1, 40, 20);
    ctx.clip();
    ctx.fillStyle = ink();
    ctx.beginPath();
    ctx.ellipse(pose.gazeX, 1.5 + pose.gazeY, 5.4, 6.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  curve(ctx, [P([34, 3 + lidDrop * 0.8]), P([47, 2 + lidDrop * 1.1]), P([59, 3 + lidDrop * 0.7])], { lw: 4.4, seed: 702, amp: 0.2 });

  // heavier, straighter brow
  const by = -18 - pose.brow * 3.5;
  curve(ctx, [P([31, by + 1]), P([46, by - 1.5]), P([62, by + 1])], { lw: 5.6, seed: 704, amp: 0.2 });

  // hint of a nose on the front edge
  curve(ctx, [P([70, 14]), P([75, 27]), P([68, 30])], { lw: 3, seed: 706, amp: 0.1 });

  // mouth
  const s = pose.smile;
  curve(ctx, [P([50, 53.5 - s * 2]), P([56, 52 + s * 1.4]), P([62, 50.5 - s * 2])], { lw: 3.2, seed: 705, amp: 0.1 });

  drawHair(ctx, P, L);

  if (L.glasses) {
    ctx.save();
    ctx.strokeStyle = ink();
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.arc(ec[0], ec[1], 15.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();
    ctx.restore();
    // temple arm back to the ear, bridge towards the far lens
    curve(ctx, [P([31, 0]), P([0, -4]), P([-14, -8])], { lw: 3.2, seed: 740, amp: 0.1 });
    curve(ctx, [P([63, 0]), P([72, -2])], { lw: 3.2, seed: 741, amp: 0.1 });
  }
};
