// The girl in the white hoodie, seen from the side, typing.
//
// The rig: hip -> torso (rotates with lean + breathing) -> neck -> head.
// Arms are solved with 2-bone IK from the shoulder to the wrist, and every
// fingertip is placed in world space on the key surface so the fingers
// really touch (and press) the keys instead of floating or clipping.

import { Pt, add, clamp, ik2, lerp, rot } from "../kit/math";
import { Ctx, INK, LINE, blob, curve, spline, tubes } from "../kit/pen";
import { BASE_LEAN, C, FAR_WRIST, FLOOR_Y, HIP, KEY_Y, NEAR_WRIST } from "./layout";
import { HandPose, Pose } from "./motion";

type Xf = (p: Pt) => Pt;
const frame = (origin: Pt, angle: number, s = 1): Xf => (p) => add(origin, rot([p[0] * s, p[1] * s], angle));

// the head is drawn big, like the reference style
const HEAD_SCALE = 1.13;
const HEAD_C: Pt = [14, -96];

interface Rig {
  torso: Xf;
  torsoAngle: number;
  head: Xf;
  headAngle: number;
  headCenter: Pt;
}

const rig = (pose: Pose): Rig => {
  const torsoAngle = BASE_LEAN + pose.lean;
  const lift = pose.breath * 1.6;
  const torso: Xf = (p) => {
    // breathing: chest rises a little more than the belly
    const k = clamp(-p[1] / 250);
    return frame(HIP, torsoAngle)([p[0] + pose.breath * 1.2 * k, p[1] - lift * k]);
  };
  const neck = torso([26, -250]);
  const headAngle = torsoAngle + 0.07 + pose.headTilt;
  const head = frame(neck, headAngle, HEAD_SCALE);
  return { torso, torsoAngle, head, headAngle, headCenter: head(HEAD_C) };
};

// ---------------------------------------------------------------------------
// Legs (drawn before the desk so the desk sits in front of the knees)
// ---------------------------------------------------------------------------

const shoe = (ctx: Ctx, ankle: Pt, fill: string, seed: number) => {
  const [x, y] = ankle;
  const bottom = FLOOR_Y - 2;
  blob(
    ctx,
    [
      [x - 30, y - 6],
      [x + 6, y - 14],
      [x + 40, y + 4],
      [x + 78, bottom - 22],
      [x + 92, bottom - 8],
      [x + 84, bottom],
      [x - 20, bottom],
      [x - 34, bottom - 14],
    ],
    { fill, seed, amp: 0.4 },
  );
  // sole
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 33, bottom - 9);
  ctx.lineTo(x + 90, bottom - 9);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  curve(ctx, [[x + 8, y + 2], [x + 22, y + 14]], { lw: 2.5, seed: seed + 1 });
  curve(ctx, [[x + 18, y + 0], [x + 32, y + 10]], { lw: 2.5, seed: seed + 2 });
};

export const drawLegs = (ctx: Ctx, pose: Pose) => {
  // far leg (slightly offset & darker)
  const fh: Pt = [HIP[0] + 14, HIP[1] + 6];
  const fk: Pt = [834, 728];
  const fa: Pt = [830, 952];
  tubes(
    ctx,
    [
      { pts: [fh, [730, 730], fk], w: 72 },
      { pts: [fk, [836, 840], fa], w: 56 },
    ],
    C.pantsShade,
  );
  shoe(ctx, fa, C.sole, 301);

  // near leg
  const h: Pt = [HIP[0], HIP[1] + 12];
  const k: Pt = [814, 738];
  const a: Pt = [800, 956];
  tubes(
    ctx,
    [
      { pts: [h, [712, 740], k], w: 78 },
      { pts: [k, [810, 846], a], w: 60 },
    ],
    C.pants,
  );
  // knee crease
  curve(ctx, [[782, 760], [800, 775], [808, 796]], { lw: 3, seed: 311, color: "rgba(10,8,12,0.9)" });
  shoe(ctx, a, C.shoe, 321);
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

const HAND_SCALE = 1.2;
const FINGER_REACH = [0, 9, 4]; // middle finger reaches furthest, fanning the fingers apart

const drawHand = (ctx: Ctx, wrist: Pt, angle: number, hp: HandPose, col: ArmColors, seed: number) => {
  const H = frame(wrist, angle, HAND_SCALE);

  // fingers: knuckle follows the hand, fingertip lands on the keys
  const finger = (i: number, w: number, fill: string) => {
    const base = H([44, 8 - i * 7]);
    const tipRef = H([74 + FINGER_REACH[i], 0]);
    const lifted = Math.min(0, hp.dy) * 0.9;
    const tip: Pt = [tipRef[0], KEY_Y - 4 + hp.fingers[i] + lifted];
    // knuckle arch: the middle joint sits above the straight line
    const mid: Pt = [lerp(base[0], tip[0], 0.55), lerp(base[1], tip[1], 0.3) - 3.5];
    tubes(ctx, [{ pts: [base, mid, tip], w }], fill);
  };

  finger(2, 14, col.skinFar);
  finger(1, 14.5, col.skinFar);

  // thumb tucked under the palm, presses the space bar
  const tb = H([14, 10]);
  const tt: Pt = add(H([40, 15]), [0, hp.thumb]);
  tubes(ctx, [{ pts: [tb, tt], w: 15 }], col.skinFar);

  const palm: Pt[] = [
    [-6, -16],
    [18, -20],
    [40, -15],
    [52, -5],
    [52, 9],
    [38, 15],
    [14, 17],
    [-6, 14],
  ].map((p) => H(p as Pt));
  blob(ctx, palm, { fill: col.skin, seed, amp: 0.3 });

  finger(0, 15.5, col.skin);
};

const drawArm = (ctx: Ctx, shoulder: Pt, wrist: Pt, hp: HandPose, col: ArmColors, seed: number) => {
  const elbow = ik2(shoulder, wrist, 136, 140, 1);
  const um: Pt = [lerp(shoulder[0], elbow[0], 0.5) - 2, lerp(shoulder[1], elbow[1], 0.5) + 2];
  const fa = Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]);
  const cuffEnd = add(wrist, rot([-6, 0], fa));
  const fm: Pt = [lerp(elbow[0], cuffEnd[0], 0.5), lerp(elbow[1], cuffEnd[1], 0.5) - 1.5];

  // hand first, then the sleeve cuff overlaps its back
  drawHand(ctx, wrist, fa + 0.08 + hp.rot, hp, col, seed + 10);

  tubes(
    ctx,
    [
      { pts: [shoulder, um, elbow], w: 50 },
      { pts: [elbow, fm, cuffEnd], w: 42 },
    ],
    col.sleeve,
  );

  // sleeve folds near the elbow
  const E = frame(elbow, fa);
  curve(ctx, [E([10, -14]), E([20, -6]), E([22, 6])], { lw: 2.6, seed: seed + 1 });
  curve(ctx, [E([-18, 10]), E([-4, 16])], { lw: 2.6, seed: seed + 2 });
  // shade under the forearm
  ctx.save();
  ctx.strokeStyle = col.sleeveShade;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  const s0 = E([18, 15]);
  const s1 = add(cuffEnd, rot([-30, 15], fa));
  ctx.moveTo(s0[0], s0[1]);
  ctx.lineTo(s1[0], s1[1]);
  ctx.stroke();
  ctx.restore();

  // ribbed cuff
  const K = frame(cuffEnd, fa);
  const cuff: Pt[] = [
    [-13, -22],
    [1, -21],
    [3, 0],
    [1, 21],
    [-13, 22],
    [-15, 0],
  ].map((p) => K(p as Pt));
  blob(ctx, cuff, { fill: col.sleeveShade, seed: seed + 3, amp: 0.2 });
  curve(ctx, [K([-6, -18]), K([-5, 18])], { lw: 2, seed: seed + 4, color: "rgba(42,32,28,0.5)" });
};

// ---------------------------------------------------------------------------
// Upper body
// ---------------------------------------------------------------------------

const TORSO: Pt[] = [
  [-60, 32],
  [-72, -40],
  [-74, -122],
  [-66, -192],
  [-44, -238],
  [-6, -258],
  [32, -254],
  [58, -222],
  [70, -160],
  [78, -90],
  [84, -10],
  [76, 26],
  [10, 40],
];

const HOOD: Pt[] = [
  [-64, -226],
  [-62, -262],
  [-36, -290],
  [0, -292],
  [22, -274],
  [14, -252],
  [-18, -240],
  [-46, -222],
];

export const drawUpperBody = (ctx: Ctx, pose: Pose) => {
  const R = rig(pose);
  const T = R.torso;

  const shoulderNear: Pt = add(T([4, -210]), [0, -pose.shoulder * 0.6]);
  const shoulderFar: Pt = add(T([-6, -216]), [0, -pose.shoulder * 0.4]);

  // far arm, behind the body
  drawArm(
    ctx,
    shoulderFar,
    add(FAR_WRIST, [pose.far.dx, pose.far.dy]),
    pose.far,
    { sleeve: C.hoodieShade, sleeveShade: C.hoodieDeep, skin: C.skinShade, skinFar: "#b98667" },
    500,
  );

  // torso
  const torso = TORSO.map(T);
  blob(ctx, torso, { fill: C.hoodie, seed: 401, amp: 0.5, stroke: null });
  // cel shade along the back and under the chest, clipped to the torso
  ctx.save();
  ctx.beginPath();
  spline(ctx, torso, true, 0.9);
  ctx.clip();
  ctx.fillStyle = C.hoodieShade;
  ctx.beginPath();
  spline(
    ctx,
    [
      [-90, 50],
      [-90, -270],
      [-40, -262],
      [-50, -190],
      [-54, -100],
      [-46, -20],
      [-30, 50],
    ].map((p) => T(p as Pt)),
    true,
    0.9,
  );
  ctx.fill();
  // waistband
  ctx.fillStyle = C.hoodieShade;
  ctx.beginPath();
  spline(ctx, [[-80, 8], [10, 14], [90, 2], [90, 50], [-80, 50]].map((p) => T(p as Pt)), true, 0.6);
  ctx.fill();
  ctx.restore();
  blob(ctx, torso, { fill: null, seed: 401, amp: 0.5 });
  curve(ctx, [T([-66, 6]), T([10, 14]), T([80, 2])], { lw: 3, seed: 402 });
  // kangaroo pocket
  curve(ctx, [T([80, -104]), T([52, -92]), T([40, -52]), T([44, -6])], { lw: 3.2, seed: 403 });

  // neck
  const nb = T([22, -244]);
  const nt = R.head([6, -26]);
  tubes(ctx, [{ pts: [nb, nt], w: 34 }], C.skin);
  ctx.save();
  ctx.strokeStyle = C.skinShade;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  const ns0 = R.head([-4, -22]);
  const ns1 = T([12, -246]);
  ctx.moveTo(ns0[0], ns0[1]);
  ctx.lineTo(ns1[0], ns1[1]);
  ctx.stroke();
  ctx.restore();

  // hood bunched behind the neck
  const hood = HOOD.map(T);
  blob(ctx, hood, { fill: C.hoodieShade, seed: 404, amp: 0.4 });
  curve(ctx, [T([-50, -236]), T([-30, -262]), T([-2, -272])], { lw: 2.8, seed: 405 });
  // collar front
  curve(ctx, [T([12, -258]), T([28, -246]), T([40, -250])], { lw: 3, seed: 406 });

  // drawstring swinging a little
  const s0 = T([36, -248]);
  const sway = pose.stringSway * 60;
  const s1: Pt = [s0[0] + 6 + sway * 0.5, s0[1] + 36];
  const s2: Pt = [s0[0] + 9 + sway, s0[1] + 74];
  curve(ctx, [s0, s1, s2], { lw: 3, seed: 407 });
  tubes(ctx, [{ pts: [s2, [s2[0] + sway * 0.12, s2[1] + 10]], w: 4 }], "#9a948a", 2);

  drawHead(ctx, pose, R);

  // near arm, in front of everything
  drawArm(
    ctx,
    shoulderNear,
    add(NEAR_WRIST, [pose.near.dx, pose.near.dy]),
    pose.near,
    { sleeve: C.hoodie, sleeveShade: C.hoodieShade, skin: C.skin, skinFar: C.skinShade },
    600,
  );
};

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

const drawHead = (ctx: Ctx, pose: Pose, R: Rig) => {
  const hc = HEAD_C;
  const P = (p: Pt) => R.head([p[0] + hc[0], p[1] + hc[1]]);

  // face
  const face: Pt[] = [
    [-66, -34],
    [-50, -70],
    [-6, -86],
    [42, -76],
    [70, -42],
    [79, 2],
    [70, 44],
    [46, 72],
    [12, 82],
    [-28, 72],
    [-58, 40],
  ];
  blob(ctx, face.map(P), { fill: C.skin, seed: 701, amp: 0.3 });

  // blush
  ctx.save();
  const bc = P([34, 30]);
  ctx.translate(bc[0], bc[1]);
  ctx.rotate(R.headAngle);
  ctx.fillStyle = C.blush;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // eye: sleepy half-lid looking down at the screen
  const lidDrop = pose.blink * 8;
  ctx.save();
  const ec = P([45, 4]);
  ctx.translate(ec[0], ec[1]);
  ctx.rotate(R.headAngle);
  if (pose.blink < 0.95) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, lidDrop - 1, 40, 20);
    ctx.clip();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(pose.gazeX, 1.5 + pose.gazeY, 6.2, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  const lid = (y: number) => P([45, 4 + y]);
  curve(ctx, [P([31, 3 + lidDrop * 0.8]), lid(-2 + lidDrop * 1.1), P([58, 4 + lidDrop * 0.7])], { lw: 4.4, seed: 702, amp: 0.2 });
  curve(ctx, [P([57.5, 4 + lidDrop * 0.7]), P([63, -1 + lidDrop * 0.6])], { lw: 3.4, seed: 703, amp: 0.1 });

  // eyebrow
  const by = -21 - pose.brow * 4;
  curve(ctx, [P([30, by + 1]), P([44, by - 1.5]), P([59, by + 2])], { lw: 4.2, seed: 704, amp: 0.2 });

  // mouth (a soft little smile appears after hitting Enter)
  const s = pose.smile;
  curve(ctx, [P([47.5, 51.5 - s * 2.5]), P([52.5, 49.9 + s * 1.6]), P([57.5, 48.3 - s * 2.5])], { lw: 3.4, seed: 705, amp: 0.1 });

  drawHair(ctx, pose, R, P);
};

const drawHair = (ctx: Ctx, pose: Pose, R: Rig, P: (p: Pt) => Pt) => {
  // top of the head follows the head; the long part hangs with gravity
  const top: Pt[] = ([
    [76, -36],
    [60, -31],
    [38, -36],
    [16, -30],
    [0, -16],
    [-10, 14],
    [-14, 48],
  ] as Pt[]).map(P);
  const back: Pt[] = ([
    [-104, 64],
    [-102, -6],
    [-86, -60],
    [-46, -96],
    [6, -106],
    [50, -92],
    [74, -62],
  ] as Pt[]).map(P);

  const a1 = top[top.length - 1];
  const a2 = back[0];
  const sway = pose.hairSway * 140;
  const hang: Pt[] = [
    [a1[0] - 8 + sway * 0.2, a1[1] + 50],
    [a1[0] - 18 + sway * 0.5, a1[1] + 112],
    [a1[0] - 30 + sway, a1[1] + 158],
    [lerp(a1[0], a2[0], 0.5) - 16 + sway, a1[1] + 170],
    [a2[0] - 4 + sway * 0.9, a2[1] + 140],
    [a2[0] - 6 + sway * 0.4, a2[1] + 70],
  ];

  const outline = [...top, ...hang, ...back];
  blob(ctx, outline, { fill: C.hair, seed: 801, amp: 0.4 });

  // soft sheen on the crown + a couple of ink strands for flow
  ctx.save();
  ctx.filter = "blur(3px)";
  curve(ctx, [P([-56, -66]), P([-20, -90]), P([22, -94])], { lw: 10, color: "rgba(255,240,225,0.10)", seed: 811, amp: 0.2 });
  ctx.restore();
  const strand = (pts: Pt[], seed: number) => curve(ctx, pts, { lw: 2.6, color: "rgba(10,6,5,0.55)", seed, amp: 0.3 });
  strand([P([-50, -40]), P([-74, 20]), P([-78, 70])], 812);
  strand([P([-20, -60]), P([-40, 10]), [a1[0] - 26 + sway * 0.5, a1[1] + 96]], 813);
};
