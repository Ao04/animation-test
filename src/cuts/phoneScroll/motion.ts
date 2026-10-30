// "He wants to start, but doesn't": types a few hesitant keys, freezes,
// sighs, the phone buzzes, he grabs it and sinks back into the floor chair
// scrolling. Everything is a pure function of t, driven by timeline.json
// (which sfx/cut_phone_scroll.py also reads, so sound stays in sync).

import tl from "./timeline.json";
import { Pt, add, bump, blinkCurve, deg, easeInOut, easeOut, ik2, invLerp, lerp, noise1, pressCurve, rot, smooth, springStep } from "../../kit/math";
import { ArmPose, StudentPose, studentRig } from "../../characters/student";
import { drawPhone } from "../../props/phone";
import { KEY_Y } from "../../sets/nightApartment";

const HIP: Pt = [640, 850];
const KNEE: Pt = [830, 792];
const ANKLE: Pt = [930, 883];
const TYPE_NEAR: Pt = [905, 696];
const TYPE_FAR: Pt = [931, 689];
export const PHONE_REST: Pt = [822, 735.5];
const GRAB_ANGLE = 0.05;
const HOLD_ANGLE = -1.0;
const HOLD_NEAR_L: Pt = [168, -185]; // torso-local
const HOLD_FAR_L: Pt = [160, -176];
const GRIP: Pt = [40, 19]; // phone centre in hand-local units
const HAND_S = 1.25;

const [R0, R1] = tl.reach;
const [L0, L1] = tl.lift;
const [S0, S1, S2] = tl.sigh;
const GRAB = R1;

const leanAt = (t: number) => {
  let lean = deg(8) + Math.sin((t / 3.6) * Math.PI * 2) * deg(0.4);
  lean += deg(1.5) * bump(t, S1, S2 + 0.2); // slump on the exhale
  lean -= deg(1) * smooth(invLerp(tl.notice, tl.notice + 0.15, t)) * (1 - smooth(invLerp(R0, R0 + 0.2, t)));
  lean += deg(3) * smooth(invLerp(R0, R0 + 0.25, t));
  // sink back into the chair: a spring so the cushion gives a little bounce
  const back = springStep(t - tl.leanBack, 1.6, 0.55);
  return lerp(lean, deg(-7.5), back);
};

const headTiltAt = (t: number) => {
  let h = deg(3);
  h -= deg(3) * bump(t, S0, S1 + 0.1); // inhale: chin up
  h += deg(4) * smooth(invLerp(S1, S2, t)) * (1 - smooth(invLerp(tl.notice, tl.notice + 0.1, t)));
  h += deg(6) * smooth(invLerp(tl.notice + 0.06, tl.notice + 0.22, t)); // looks at the phone
  h += deg(10) * smooth(invLerp(L0, L1 + 0.1, t)); // keeps eyes on it while sinking back
  for (const k of tl.keys) {
    const d = t - k.t;
    if (d > 0 && d < 0.25) h += Math.sin((d / 0.25) * Math.PI) * deg(0.5);
  }
  return h + noise1(t * 0.7, 3) * deg(0.5);
};

const shoulderLiftAt = (t: number) => {
  if (t < S0 || t > S2 + 0.4) return 0;
  if (t < S1) return 7 * easeOut(invLerp(S0, S1, t));
  if (t < S2) return lerp(7, -2, easeInOut(invLerp(S1, S2, t)));
  return lerp(-2, 0, smooth(invLerp(S2, S2 + 0.4, t)));
};

const arcLerp = (a: Pt, b: Pt, k: number, lift: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * lift];

const typingFingers = (hand: "near" | "far", t: number): [number, number, number] => {
  const f: [number, number, number] = [0, 0, 0];
  for (const k of tl.keys) if (k.hand === hand) f[k.finger] += pressCurve(t - k.t, 9, 3.5);
  if (hand === "near") {
    // hesitation: one finger lifts to type... and slowly gives up
    const [h0, h1] = tl.hover;
    f[1] -= 9 * smooth(invLerp(h0, h0 + 0.12, t)) * (1 - smooth(invLerp(h1 - 0.15, h1 + 0.1, t)));
  }
  return f;
};

export interface CutState {
  pose: StudentPose;
  phone: { held: boolean; c: Pt; angle: number; screen: number; tint: string };
  laptop: number;
}

const TINTS = ["205,225,255", "255,228,205", "212,255,228", "240,215,255", "205,225,255"];

export const stateAt = (t: number): CutState => {
  const lean = leanAt(t);
  const headTilt = headTiltAt(t);
  const breath = Math.sin((t / 3.6) * Math.PI * 2 + 1);
  const shoulderLift = shoulderLiftAt(t);

  const base: StudentPose = {
    hip: HIP,
    lean,
    breath,
    shoulderLift,
    headTilt,
    gazeX: 0,
    gazeY: 0,
    blink: 0,
    lidLow: 0,
    brow: 0,
    mouthOpen: 0,
    hairSway: 0,
    keyY: KEY_Y,
    knee: KNEE,
    ankle: ANKLE,
    near: null as unknown as ArmPose,
    far: null as unknown as ArmPose,
  };
  const rig = studentRig(base);

  // ---- face ---------------------------------------------------------------
  const notice = smooth(invLerp(tl.notice, tl.notice + 0.07, t));
  const sacc = Math.floor(t / 0.5);
  const typingGaze: Pt = [0.6 + noise1(sacc, 31) * 0.8, 0.6];
  const phoneGaze: Pt = [1.2, 2.6];
  base.gazeX = lerp(typingGaze[0], phoneGaze[0], notice);
  base.gazeY = lerp(typingGaze[1], phoneGaze[1], notice);
  base.blink = Math.max(...tl.blinks.map((b) => blinkCurve(t - b)));
  const exhale = bump(t, S1, S2 + 0.05);
  base.lidLow =
    0.35 + 0.55 * exhale * (1 - notice) - 0.33 * notice * (1 - smooth(invLerp(tl.notice + 0.2, R1 + 0.2, t))) + 0.1 * smooth(invLerp(3.0, 3.6, t));
  base.brow =
    -0.55 * smooth(invLerp(0.3, 0.9, t)) * (1 - smooth(invLerp(S1, S2, t))) +
    0.65 * notice * (1 - smooth(invLerp(tl.notice + 0.3, R1 + 0.3, t)));
  base.mouthOpen = 0.8 * bump(t, S1 + 0.02, S2 - 0.04);
  base.hairSway = (headTiltAt(t - 0.12) + leanAt(t - 0.12) - headTilt - lean) * 1.4;

  // ---- phone --------------------------------------------------------------
  const buzzing = tl.buzz.some(([a, b]) => t >= a && t <= b);
  const frameParity = Math.round(t * 30) % 2 === 0 ? 1 : -1;
  const scrollIdx = tl.scrolls.filter((s) => t >= s).length;
  let screen = smooth(invLerp(tl.buzz[0][0], tl.buzz[0][0] + 0.05, t));
  for (const s of tl.scrolls) screen += 0.12 * Math.exp(-Math.max(0, t - s) / 0.12) * (t >= s ? 1 : 0);
  const tint = TINTS[scrollIdx % TINTS.length];

  // ---- near arm -----------------------------------------------------------
  const holdNear = add(rig.local(HOLD_NEAR_L), [0, breath * 1.2]);
  const grabWrist = add(PHONE_REST, rot([-GRIP[0] * HAND_S, -GRIP[1] * HAND_S], GRAB_ANGLE)) as Pt;
  const typeAngle = (shoulder: Pt, wrist: Pt) => {
    const e = ik2(shoulder, wrist, 128, 132, 1);
    return Math.atan2(wrist[1] - e[1], wrist[0] - e[0]) + 0.08;
  };

  let near: ArmPose;
  if (t < R0) {
    near = { wrist: TYPE_NEAR, flip: 1, typing: 1, fingers: typingFingers("near", t), curl: 0.2, thumb: 0 };
  } else if (t < GRAB) {
    const k = easeInOut(invLerp(R0, GRAB, t));
    near = {
      wrist: arcLerp(TYPE_NEAR, grabWrist, k, 22),
      handAngle: lerp(typeAngle(rig.shoulderNear, TYPE_NEAR), GRAB_ANGLE, k),
      flip: 1,
      typing: 1 - smooth(invLerp(R0, R0 + 0.16, t)),
      fingers: [0, 0, 0],
      curl: lerp(0.2, 0.75, k),
      thumb: 0,
    };
  } else {
    const k = easeInOut(invLerp(L0, L1, t));
    const flip = lerp(1, -1, smooth(invLerp(L0 + 0.1, L0 + 0.32, t)));
    const handAngle = lerp(GRAB_ANGLE, HOLD_ANGLE, easeInOut(invLerp(L0 + 0.02, L1 - 0.06, t)));
    // thumb flicks: quick slide up the screen, slower return
    let thumb = 0;
    for (const s of tl.scrolls) {
      const d = t - s;
      if (d >= -0.06 && d < 0) thumb += lerp(0, -4, (d + 0.06) / 0.06);
      else if (d >= 0 && d < 0.09) thumb += lerp(-4, 14, easeOut(d / 0.09));
      else if (d >= 0.09 && d < 0.3) thumb += lerp(14, 0, smooth((d - 0.09) / 0.21));
    }
    const angleRel = GRAB_ANGLE * (1 - smooth(invLerp(L0, L1, t)));
    near = {
      wrist: arcLerp(grabWrist, holdNear, k, 30),
      handAngle,
      flip,
      typing: 0,
      fingers: [0, 0, 0],
      curl: 0.85,
      thumb,
      held: (ctx, Hs) => drawPhone(ctx, Hs(GRIP), handAngle - angleRel, screen, tint),
    };
  }

  // ---- far arm ------------------------------------------------------------
  const holdFar = add(rig.local(HOLD_FAR_L), [0, breath * 1.2]);
  const F0 = L0 + 0.06;
  const F1 = L1 + 0.1;
  let far: ArmPose;
  if (t < F0) {
    far = { wrist: TYPE_FAR, flip: 1, typing: 1, fingers: typingFingers("far", t), curl: 0.2, thumb: 0 };
  } else {
    const k = easeInOut(invLerp(F0, F1, t));
    far = {
      wrist: arcLerp(TYPE_FAR, holdFar, k, 26),
      handAngle: lerp(typeAngle(rig.shoulderFar, TYPE_FAR), HOLD_ANGLE + 0.1, k),
      flip: lerp(1, -1, smooth(invLerp(F0 + 0.12, F0 + 0.36, t))),
      typing: 1 - smooth(invLerp(F0, F0 + 0.15, t)),
      fingers: [0, 0, 0],
      curl: lerp(0.2, 0.9, k),
      thumb: 0,
    };
  }

  base.near = near;
  base.far = far;

  // phone resting on the table (until grabbed), buzzing
  const restC: Pt = [PHONE_REST[0] + (buzzing ? frameParity * 1.4 : 0), PHONE_REST[1]];
  const restAngle = buzzing ? frameParity * 0.012 : 0;

  // where the held phone ends up (for the glow pass)
  let phoneC = restC;
  let phoneA = restAngle;
  if (t >= GRAB) {
    const flip = Math.abs(near.flip) < 0.12 ? Math.sign(near.flip || 1) * 0.12 : near.flip;
    const a = near.handAngle!;
    phoneC = add(near.wrist, rot([GRIP[0] * HAND_S, GRIP[1] * HAND_S * flip], a));
    phoneA = a - GRAB_ANGLE * (1 - smooth(invLerp(L0, L1, t)));
  }

  return {
    pose: base,
    phone: { held: t >= GRAB, c: phoneC, angle: phoneA, screen, tint },
    laptop: 1 + ((t % 1.06) < 0.53 ? 0.03 : 0),
  };
};
