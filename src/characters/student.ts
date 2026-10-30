// Character: 21-year-old university student (male).
// Centre-parted black hair that covers the ears, navy oversized sweatshirt,
// grey wide trousers. Body seen from the side (facing right), head turned
// three-quarters so the centre part and both eyes read clearly.
//
// The character is a pure function of a `StudentPose`: cuts only describe
// *where* things are (hip, wrists, gaze...), the rig handles the drawing.

import { Pt, add, clamp, ik2, lerp, rot } from "../kit/math";
import { Ctx, blob, curve, penStyle, spline, tubes } from "../kit/pen";

export const STUDENT = {
  skin: "#ecc6a6",
  skinShade: "#cfa184",
  skinFar: "#c0927a",
  hair: "#1a1c25",
  sweat: "#3a4870",
  sweatShade: "#2d385b",
  sweatDeep: "#252e4b",
  pants: "#7a7f8a",
  pantsShade: "#626672",
  sock: "#e6e7ec",
  mouth: "#8a4a48",
};

export interface ArmPose {
  wrist: Pt;
  /** hand direction (radians). Undefined = follow the forearm. */
  handAngle?: number;
  /** +1 palm down (typing), -1 palm towards the face (holding a phone). In-between squashes the hand like a 2D turn. */
  flip: number;
  /** 1 = fingertips on the keys, 0 = curled by `curl`. */
  typing: number;
  fingers: [number, number, number]; // key press offsets (+ = down)
  curl: number;
  thumb: number; // thumb slide along the hand (scrolling)
  /** Draw something held in the hand (e.g. phone) between palm and thumb. Receives the hand transform. */
  held?: (ctx: Ctx, hand: (p: Pt) => Pt, angle: number) => void;
}

export interface StudentPose {
  hip: Pt;
  lean: number; // torso angle, + = forward
  breath: number;
  shoulderLift: number; // px (sighs)
  headTilt: number; // + = looking down
  gazeX: number;
  gazeY: number;
  blink: number; // 0..1
  lidLow: number; // 0 wide awake .. 1 eyes half shut
  brow: number; // -1 knit .. +1 raised
  mouthOpen: number; // 0..1
  hairSway: number;
  keyY: number;
  knee: Pt;
  ankle: Pt;
  near: ArmPose;
  far: ArmPose;
}

type Xf = (p: Pt) => Pt;
const frame = (o: Pt, a: number, sx = 1, sy = sx): Xf => (p) => add(o, rot([p[0] * sx, p[1] * sy], a));

const HEAD_C: Pt = [16, -92];
const HAND_S = 1.25;

export const studentRig = (pose: StudentPose) => {
  const lift = pose.breath * 1.5;
  const T: Xf = (p) => {
    const k = clamp(-p[1] / 240);
    return frame(pose.hip, pose.lean)([p[0] + pose.breath * k, p[1] - lift * k - pose.shoulderLift * k * k]);
  };
  const neck = T([24, -246]);
  const headAngle = pose.lean + 0.06 + pose.headTilt;
  const head = frame(neck, headAngle);
  return {
    T,
    head,
    headAngle,
    shoulderNear: T([8, -214]),
    shoulderFar: T([-4, -220]),
    /** world position of a torso-local point (for placing hands relative to the body) */
    local: T,
  };
};

// ---------------------------------------------------------------------------
// Legs: seated on the floor, knees up under the table
// ---------------------------------------------------------------------------

export const drawStudentLegs = (ctx: Ctx, pose: StudentPose) => {
  const S = STUDENT;
  const sock = (ankle: Pt, fill: string, seed: number) => {
    const [x, y] = ankle;
    blob(
      ctx,
      [
        [x - 26, y - 18],
        [x + 10, y - 16],
        [x + 52, y + 2],
        [x + 72, y + 12],
        [x + 70, y + 22],
        [x - 22, y + 22],
        [x - 32, y + 4],
      ],
      { fill, seed, amp: 0.3 },
    );
  };
  // far leg
  const fk = add(pose.knee, [8, -4]);
  const fa = add(pose.ankle, [14, -2]);
  sock(fa, "#c9cad2", 1301);
  tubes(
    ctx,
    [
      { pts: [add(pose.hip, [12, 4]), lerp2(pose.hip, fk, 0.5, -6), fk], w: 82 },
      { pts: [fk, lerp2(fk, fa, 0.5, 0), add(fa, [-4, -16])], w: 68 },
    ],
    S.pantsShade,
  );
  // near leg
  const k = pose.knee;
  const a = pose.ankle;
  sock(a, S.sock, 1311);
  tubes(
    ctx,
    [
      { pts: [add(pose.hip, [0, 10]), lerp2(pose.hip, k, 0.5, -4), k], w: 86 },
      { pts: [k, lerp2(k, a, 0.5, 0), add(a, [-4, -16])], w: 72 },
    ],
    S.pants,
  );
  // wide hem + a couple of folds
  curve(ctx, [add(a, [-40, -30]), add(a, [-6, -22]), add(a, [30, -32])], { lw: 2.6, seed: 1321 });
  curve(ctx, [add(k, [-36, 6]), add(k, [-14, 20]), add(k, [-2, 44])], { lw: 2.6, seed: 1322 });
  curve(ctx, [add(pose.hip, [70, 24]), add(pose.hip, [110, 16])], { lw: 2.4, seed: 1323 });
};

const lerp2 = (a: Pt, b: Pt, t: number, bend: number): Pt => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [a[0] + dx * t + (-dy / l) * bend, a[1] + dy * t + (dx / l) * bend];
};

// ---------------------------------------------------------------------------
// Arms & hands
// ---------------------------------------------------------------------------

interface ArmCol {
  sleeve: string;
  cuff: string;
  skin: string;
  skinFar: string;
}

const REACH = [0, 9, 4];

const drawHand = (ctx: Ctx, arm: ArmPose, angle: number, keyY: number, col: ArmCol, seed: number) => {
  const flip = Math.abs(arm.flip) < 0.12 ? Math.sign(arm.flip || 1) * 0.12 : arm.flip;
  const Hs = frame(arm.wrist, angle, HAND_S, HAND_S * flip);

  const finger = (i: number, w: number, fill: string) => {
    const base = Hs([46, 8 - i * 7]);
    const curlTip = Hs([lerp(78 + REACH[i], 50 - i * 2, arm.curl), lerp(6, 28 - i * 3, arm.curl)]);
    const keyRef = Hs([74 + REACH[i], 0]);
    const keyTip: Pt = [keyRef[0], keyY - 4 + arm.fingers[i]];
    const tip: Pt = [lerp(curlTip[0], keyTip[0], arm.typing), lerp(curlTip[1], keyTip[1], arm.typing)];
    const mid: Pt = add([lerp(base[0], tip[0], 0.55), lerp(base[1], tip[1], 0.4)], rot([0, -5 * flip], angle));
    tubes(ctx, [{ pts: [base, mid, tip], w }], fill);
  };

  finger(2, 15, col.skinFar);
  finger(1, 15.5, col.skinFar);
  if (!arm.held) {
    const tb = Hs([14, 10]);
    const tt = Hs([40 + arm.thumb, 15]);
    tubes(ctx, [{ pts: [tb, tt], w: 16 }], col.skinFar);
  }
  blob(
    ctx,
    (
      [
        [-6, -16],
        [18, -20],
        [42, -15],
        [54, -4],
        [54, 9],
        [40, 15],
        [14, 17],
        [-6, 14],
      ] as Pt[]
    ).map(Hs),
    { fill: col.skin, seed, amp: 0.3 },
  );
  finger(0, 16.5, col.skin);

  if (arm.held) {
    arm.held(ctx, Hs, angle);
    // thumb over the screen side, sliding to scroll
    const tb = Hs([16, 12]);
    const tm = Hs([36 + arm.thumb * 0.5, 30]);
    const tt = Hs([52 + arm.thumb, 32]);
    tubes(ctx, [{ pts: [tb, tm, tt], w: 16 }], col.skin);
  }
};

const drawArm = (ctx: Ctx, shoulder: Pt, arm: ArmPose, keyY: number, col: ArmCol, seed: number) => {
  const wrist = arm.wrist;
  const elbow = ik2(shoulder, wrist, 128, 132, 1);
  const fa = Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]);
  const handAngle = arm.handAngle ?? fa + 0.08;
  const cuffEnd = add(wrist, rot([-6, 0], fa));
  const um: Pt = [lerp(shoulder[0], elbow[0], 0.5) - 2, lerp(shoulder[1], elbow[1], 0.5) + 3];
  const fm: Pt = [lerp(elbow[0], cuffEnd[0], 0.5), lerp(elbow[1], cuffEnd[1], 0.5) - 1];

  const holding = !!arm.held;
  // when typing the sleeve covers the back of the hand; when holding, the hand is in front
  if (!holding) drawHand(ctx, arm, handAngle, keyY, col, seed + 10);

  tubes(
    ctx,
    [
      { pts: [shoulder, um, elbow], w: 54 },
      { pts: [elbow, fm, cuffEnd], w: 48 },
    ],
    col.sleeve,
  );
  const E = frame(elbow, fa);
  curve(ctx, [E([12, -16]), E([22, -6]), E([24, 6])], { lw: 2.4, seed: seed + 1 });
  curve(ctx, [E([-20, 12]), E([-6, 18])], { lw: 2.4, seed: seed + 2 });
  const K = frame(cuffEnd, fa);
  blob(
    ctx,
    (
      [
        [-14, -22],
        [1, -20],
        [3, 0],
        [1, 20],
        [-14, 22],
        [-16, 0],
      ] as Pt[]
    ).map(K),
    { fill: col.cuff, seed: seed + 3, amp: 0.2 },
  );
  for (const k of [-9, -4]) curve(ctx, [K([k, -18]), K([k, 18])], { lw: 1.6, seed: seed + 4 + k, color: "rgba(20,24,40,0.45)" });

  if (holding) drawHand(ctx, arm, handAngle, keyY, col, seed + 10);
};

// ---------------------------------------------------------------------------
// Upper body
// ---------------------------------------------------------------------------

const TORSO: Pt[] = [
  [-66, 24],
  [-80, -50],
  [-82, -140],
  [-72, -204],
  [-50, -236],
  [-14, -252],
  [26, -250],
  [60, -232],
  [76, -180],
  [80, -110],
  [82, -40],
  [80, 10],
  [50, 30],
  [-20, 32],
];

export const drawStudentUpper = (ctx: Ctx, pose: StudentPose) => {
  const S = STUDENT;
  const R = studentRig(pose);
  const T = R.T;

  drawArm(ctx, R.shoulderFar, pose.far, pose.keyY, { sleeve: S.sweatShade, cuff: S.sweatDeep, skin: S.skinShade, skinFar: S.skinFar }, 1500);

  // sweatshirt
  const torso = TORSO.map(T);
  blob(ctx, torso, { fill: S.sweat, stroke: null, seed: 1401, amp: 0.4 });
  ctx.save();
  ctx.beginPath();
  spline(ctx, torso, true, 0.9);
  ctx.clip();
  ctx.fillStyle = S.sweatShade;
  ctx.beginPath();
  spline(
    ctx,
    (
      [
        [-100, 40],
        [-100, -270],
        [-46, -256],
        [-56, -180],
        [-58, -90],
        [-48, -10],
        [-30, 40],
      ] as Pt[]
    ).map(T),
    true,
    0.9,
  );
  ctx.fill();
  // ribbed hem
  ctx.beginPath();
  spline(ctx, ([[-90, 4], [10, 10], [96, 0], [96, 50], [-90, 50]] as Pt[]).map(T), true, 0.6);
  ctx.fill();
  ctx.restore();
  blob(ctx, torso, { fill: null, seed: 1401, amp: 0.4 });
  curve(ctx, [T([-72, 2]), T([10, 10]), T([80, -2])], { lw: 2.6, seed: 1402 });
  // folds where the sweatshirt bunches over the lap
  curve(ctx, [T([74, -70]), T([54, -58]), T([40, -44])], { lw: 2.4, seed: 1403 });
  curve(ctx, [T([78, -36]), T([60, -24])], { lw: 2.4, seed: 1404 });

  // neck
  const nb = T([22, -240]);
  const nt = R.head([4, -24]);
  tubes(ctx, [{ pts: [nb, nt], w: 40 }], S.skin);

  // crew neck rib
  const collar: Pt[] = ([[-14, -250], [2, -262], [28, -256], [46, -248], [30, -240], [4, -244]] as Pt[]).map(T);
  blob(ctx, collar, { fill: S.sweatShade, seed: 1405, amp: 0.2 });

  drawHead(ctx, pose, R.head, R.headAngle);

  drawArm(ctx, R.shoulderNear, pose.near, pose.keyY, { sleeve: S.sweat, cuff: S.sweatShade, skin: S.skin, skinFar: S.skinShade }, 1600);
};

// ---------------------------------------------------------------------------
// Head (three-quarter view)
// ---------------------------------------------------------------------------

const drawHead = (ctx: Ctx, pose: StudentPose, head: Xf, headAngle: number) => {
  const S = STUDENT;
  const P = (p: Pt) => head([p[0] + HEAD_C[0], p[1] + HEAD_C[1]]);

  // ear (mostly hidden by hair, lobe peeks out)
  blob(
    ctx,
    ([[-30, -4], [-14, -8], [-10, 12], [-14, 32], [-26, 34], [-32, 16]] as Pt[]).map(P),
    { fill: S.skinShade, seed: 1701, amp: 0.2, lw: penStyle.lw * 0.85 },
  );

  // face: a slightly angular jaw for a grown-up look
  const face: Pt[] = [
    [-60, -34],
    [-44, -70],
    [-6, -86],
    [36, -78],
    [60, -52],
    [70, -20],
    [71, 6],
    [67, 30],
    [57, 52],
    [41, 69],
    [24, 75],
    [4, 71],
    [-14, 58],
    [-26, 34],
    [-34, 6],
  ];
  blob(ctx, face.map(P), { fill: S.skin, seed: 1702, amp: 0.25 });
  // soft jaw shade
  ctx.save();
  ctx.beginPath();
  spline(ctx, face.map(P), true, 0.9);
  ctx.clip();
  ctx.fillStyle = "rgba(170,110,90,0.18)";
  ctx.beginPath();
  spline(ctx, ([[-40, 20], [0, 50], [30, 74], [-30, 90], [-70, 40]] as Pt[]).map(P), true, 0.9);
  ctx.fill();
  ctx.restore();

  // eyes
  const lidDrop = Math.max(pose.blink, pose.lidLow * 0.55) * 7.5;
  const eye = (c: Pt, rx: number, ry: number, lidW: number, lw: number, seed: number, lash: boolean) => {
    const ec = P(c);
    ctx.save();
    ctx.translate(ec[0], ec[1]);
    ctx.rotate(headAngle);
    if (pose.blink < 0.95) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-20, lidDrop - 2, 40, 20);
      ctx.clip();
      ctx.fillStyle = penStyle.ink;
      ctx.beginPath();
      ctx.ellipse(pose.gazeX * (rx / 4.5), 1 + pose.gazeY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // catchlight from the screen
      ctx.fillStyle = "rgba(230,240,255,0.85)";
      ctx.beginPath();
      ctx.arc(pose.gazeX * (rx / 4.5) + rx * 0.35, -1.5 + pose.gazeY + lidDrop * 0.6, rx * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    const L = (x: number, y: number) => P([c[0] + x, c[1] + y]);
    curve(ctx, [L(-lidW, -1 + lidDrop * 0.8), L(0, -3.5 + lidDrop), L(lidW, -1 + lidDrop * 0.8)], { lw, seed, amp: 0.1 });
    if (lash) curve(ctx, [L(lidW - 1, -1 + lidDrop * 0.8), L(lidW + 4, -3 + lidDrop * 0.7)], { lw: lw * 0.8, seed: seed + 1, amp: 0.1 });
  };
  eye([28, 2], 4.6, 5.8, 11, 3.6, 1710, true);
  eye([60, 1], 3.2, 5.2, 6, 3.2, 1712, false);

  // brows: straight, a little thick
  const b = pose.brow * 3.5;
  const knit = Math.min(0, pose.brow) * -3;
  curve(ctx, [P([14, -16 - b]), P([26, -19 - b - knit * 0.3]), P([39, -18 - b + knit])], { lw: 4.6, seed: 1720, amp: 0.15 });
  curve(ctx, [P([52, -19 - b + knit]), P([64, -17 - b])], { lw: 4.2, seed: 1721, amp: 0.1 });

  // nose (three-quarter)
  curve(ctx, [P([53, 6]), P([58, 24]), P([51, 28])], { lw: 3, seed: 1730, amp: 0.1 });

  // mouth: neutral line, opens into a small oval for the sigh
  if (pose.mouthOpen > 0.05) {
    const mc = P([44, 46]);
    ctx.save();
    ctx.translate(mc[0], mc[1]);
    ctx.rotate(headAngle);
    ctx.fillStyle = STUDENT.mouth;
    ctx.strokeStyle = penStyle.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 1, 5 + pose.mouthOpen * 1.5, 2 + pose.mouthOpen * 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
    curve(ctx, [P([37, 46]), P([45, 46.6]), P([52, 46.8])], { lw: 3.2, seed: 1731, amp: 0.1 });
  }

  drawHair(ctx, pose, P);
};

const drawHair = (ctx: Ctx, pose: StudentPose, P: (p: Pt) => Pt) => {
  const s = pose.hairSway * 120; // fringe/nape lag behind head motion
  const sw = (p: Pt, k: number): Pt => [p[0] + s * k, p[1]];
  // one closed outline: part -> near fringe -> over the ear -> nape -> back -> crown -> far fringe -> back to part.
  // The forehead between the two fringes stays open, which is what reads as a centre part.
  const outline: Pt[] = [
    [42, -93],
    [35, -80],
    [25, -64],
    [16, -48],
    [10, -36],
    sw([7, -20], 0.6), // near fringe tip
    [4, -27],
    [-2, -18],
    [-4, -4],
    sw([-6, 12], 0.6), // sideburn tip in front of the ear
    [-12, 4],
    [-22, 2],
    [-34, 8],
    sw([-44, 26], 0.8), // nape tip
    [-50, 14],
    [-62, 2],
    [-70, -26],
    [-68, -58],
    [-50, -86],
    [-16, -104],
    [22, -106],
    [50, -98],
    [68, -84],
    [78, -62],
    sw([80, -38], 0.6),
    sw([75, -24], 0.7), // far fringe tip
    [70, -40],
    [62, -60],
    [52, -78],
  ];
  blob(ctx, outline.map(P), { fill: STUDENT.hair, seed: 1801, amp: 0.25 });

  // sheen + flow lines
  ctx.save();
  ctx.filter = "blur(3px)";
  curve(ctx, [P([-50, -72]), P([-14, -96]), P([24, -100])], { lw: 9, color: "rgba(150,170,225,0.22)", seed: 1810, amp: 0.1 });
  ctx.restore();
  const strand = (pts: Pt[], seed: number) => curve(ctx, pts.map(P), { lw: 2, color: "rgba(120,140,190,0.35)", seed, amp: 0.2 });
  strand([[38, -92], [22, -66], [12, -40]], 1811);
  strand([[30, -100], [-10, -78], [-36, -40]], 1812);
  strand([[0, -102], [-40, -76], [-56, -30]], 1814);
  strand([[48, -94], [66, -68], [74, -42]], 1813);
};
