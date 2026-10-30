// Set: a small Japanese one-room apartment (1K) at night.
// Side view: bed on the left, a floor chair (zaisu), a low table with a
// laptop, a balcony window with city lights on the right, a wall clock.
// Reusable by any cut: import the layout constants and draw functions.

import { Pt, hash, rng, springStep } from "../kit/math";
import { Ctx, blob, box, curve, handify, line, penStyle, poly } from "../kit/pen";

export const W = 1920;
export const H = 1080;

export const FLOOR_Y = 905;
export const TABLE = { x: 770, y: 742, w: 560, th: 22 };
export const LAPTOP = { x0: 880, x1: 1162, top: 726, th: 16, hinge: [1156, 734] as Pt, lidLen: 232, lidTh: 13, lidAngle: 0.2 };
export const KEY_Y = LAPTOP.top;
export const WINDOW = { x0: 1362, x1: 1960, y0: 112, y1: 900, mid: 1664 };
export const CLOCK = { x: 1052, y: 236, r: 52 };
export const DESK_LIGHT = { baseX: 1298, headX: 1206, headY: 508 };
export const ZAISU = { seatX0: 522, seatX1: 746, backBottom: [572, 872] as Pt, backTop: [503, 592] as Pt };

export const SET = {
  ink: "#1d2434",
  lw: 3.6,
  wall: "#b6bbc7",
  wallLow: "#b9bdc8",
  base: "#e4e5ea",
  floor: "#a28f7b",
  floorDark: "#8c7a67",
  rug: "#8e97a8",
  frame: "#a3abb7",
  sky0: "#0b1230",
  sky1: "#2a2c56",
  skyGlow: "#5a4a6e",
  city: "#161c35",
  city2: "#1f2645",
  litWarm: "#ffd287",
  litCool: "#dfe8ff",
  rail: "#2a3042",
  curtain: "#b3ada2",
  curtainShade: "#958f84",
  bedFrame: "#6e5a48",
  duvet: "#d8dce6",
  duvetShade: "#b9bfcc",
  pillow: "#eef0f5",
  zaisu: "#4a5060",
  zaisuShade: "#3a3f4d",
  oak: "#d4b58d",
  oakDark: "#b39572",
  laptop: "#9a9ea8",
  laptopDark: "#7d818b",
  book: "#5f7d8c",
  book2: "#c9c2b0",
  lamp: "#e6e7ec",
  lampDark: "#b6b8c0",
  clockFace: "#f1f1ee",
};

// ---------------------------------------------------------------------------

export const drawRoomBack = (ctx: Ctx, t: number) => {
  // wall
  ctx.fillStyle = SET.wall;
  ctx.fillRect(-100, -100, W + 200, FLOOR_Y + 100);
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(60,70,95,0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(-100, -100, W + 200, FLOOR_Y + 100);

  // floor + rug
  ctx.fillStyle = SET.floor;
  ctx.fillRect(-100, FLOOR_Y, W + 200, H - FLOOR_Y + 100);
  for (let i = 0; i < 4; i++) {
    const y = FLOOR_Y + 22 + i * 44 + i * i * 6;
    line(ctx, [-100, y], [W + 100, y], { lw: 1.6, color: "rgba(60,48,40,0.35)", seed: 900 + i, amp: 0.6 });
  }
  // flat rug under the table (seen at a grazing angle: a thin band)
  box(ctx, 600, FLOOR_Y + 2, 960, 40, { fill: SET.rug, r: 6, seed: 901, lw: 2.2 });
  for (let x = 612; x < 1550; x += 14) line(ctx, [x, FLOOR_Y + 42], [x - 2, FLOOR_Y + 50], { lw: 1.6, seed: 903 + x, amp: 0.2 });
  box(ctx, -100, FLOOR_Y - 14, W + 200, 15, { fill: SET.base, r: 2, seed: 902 });

  drawWindow(ctx, t);
  drawCurtains(ctx);
  drawClock(ctx, t);
  drawPrint(ctx);
  drawBed(ctx);
  drawZaisu(ctx);
};

const drawWindow = (ctx: Ctx, t: number) => {
  const { x0, x1, y0, y1, mid } = WINDOW;
  const sky = ctx.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, SET.sky0);
  sky.addColorStop(0.62, SET.sky1);
  sky.addColorStop(0.8, SET.skyGlow);
  sky.addColorStop(1, SET.sky1);
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();

  // city skyline: far layer, near layer, with lit windows
  const r = rng(77);
  const layerDraw = (color: string, baseY: number, minH: number, maxH: number, seed: number, litChance: number) => {
    let x = x0 - 20;
    let i = 0;
    while (x < x1 + 20) {
      const w = 50 + r() * 90;
      const h = minH + r() * (maxH - minH);
      const top = baseY - h;
      ctx.fillStyle = color;
      ctx.fillRect(x, top, w + 1, y1 - top);
      // windows
      for (let wy = top + 14; wy < baseY - 10; wy += 22) {
        for (let wx = x + 8; wx < x + w - 12; wx += 18) {
          const k = Math.floor(wx * 7 + wy * 13 + seed);
          if (hash(k, seed) < litChance) {
            // one window switches off mid-shot: a tiny sign of life outside
            if (k % 97 === 3 && t > 2.1) continue;
            ctx.fillStyle = hash(k, seed + 1) < 0.7 ? SET.litWarm : SET.litCool;
            ctx.globalAlpha = 0.55 + hash(k, seed + 2) * 0.45;
            ctx.fillRect(wx, wy, 8, 10);
            ctx.globalAlpha = 1;
          }
        }
      }
      x += w + 6 + r() * 10;
      i++;
    }
  };
  layerDraw(SET.city2, 690, 120, 300, 5, 0.18);
  layerDraw(SET.city, 760, 60, 220, 9, 0.24);

  // aircraft warning light on a tall building
  const blink = (t % 1.6) < 0.5 ? 1 : 0.15;
  ctx.fillStyle = `rgba(255,70,60,${blink})`;
  ctx.beginPath();
  ctx.arc(1792, 380, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SET.city2;
  ctx.fillRect(1786, 384, 12, 330);

  // balcony railing
  ctx.fillStyle = SET.rail;
  ctx.fillRect(x0, 662, x1 - x0, 12);
  ctx.fillRect(x0, 860, x1 - x0, 40);
  for (let x = x0 + 20; x < x1; x += 34) ctx.fillRect(x, 674, 5, 186);

  // glass reflections
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 46;
  ctx.beginPath();
  ctx.moveTo(x0 + 40, y1);
  ctx.lineTo(x0 + 300, y0);
  ctx.moveTo(mid + 60, y1);
  ctx.lineTo(mid + 260, y0 + 200);
  ctx.stroke();
  ctx.restore();

  // aluminium frame
  const fw = 20;
  ctx.fillStyle = SET.frame;
  ctx.fillRect(x0 - fw, y0 - fw, x1 - x0 + fw * 2, fw);
  ctx.fillRect(x0 - fw, y0 - fw, fw, y1 - y0 + fw);
  box(ctx, mid - 12, y0, 24, y1 - y0, { fill: SET.frame, r: 2, seed: 911 });
  box(ctx, x0 - fw, y0 - fw, x1 - x0 + fw * 2, y1 - y0 + fw, { fill: null, r: 2, seed: 912 });
  box(ctx, x0, y0, x1 - x0, y1 - y0, { fill: null, r: 2, seed: 913 });
  // sill rail
  box(ctx, x0 - fw, y1 - 6, x1 - x0 + fw * 2, 12, { fill: SET.frame, r: 2, seed: 914 });
};

const drawCurtains = (ctx: Ctx) => {
  // rail
  box(ctx, 1270, 86, 700, 12, { fill: SET.lampDark, r: 5, seed: 920 });
  const curtain = (x0: number, x1: number, seed: number) => {
    const top = 98;
    const bot = 892;
    const folds = 5;
    const pts: Pt[] = [[x0, top]];
    for (let i = 0; i <= folds; i++) pts.push([x0 + ((x1 - x0) * i) / folds + (i % 2 ? 5 : -5), top + 6]);
    const right: Pt[] = [
      [x1, top + 10],
      [x1 + 8, (top + bot) / 2],
      [x1 + 4, bot],
    ];
    const bottom: Pt[] = [];
    for (let i = folds; i >= 0; i--) bottom.push([x0 + ((x1 - x0) * i) / folds, bot + (i % 2 ? 6 : 0)]);
    const left: Pt[] = [[x0 - 6, (top + bot) / 2]];
    ctx.beginPath();
    poly(ctx, handify([[x0, top], [x1, top], ...right, ...bottom, ...left], { seed, amp: 0.8, closed: true }));
    ctx.fillStyle = SET.curtain;
    ctx.fill();
    // fold shading
    for (let i = 0; i < folds; i++) {
      const fx = x0 + ((x1 - x0) * (i + 0.5)) / folds;
      ctx.fillStyle = SET.curtainShade;
      ctx.fillRect(fx - 4, top + 8, 9, bot - top - 8);
    }
    ctx.strokeStyle = penStyle.ink;
    ctx.lineWidth = penStyle.lw;
    ctx.lineJoin = "round";
    ctx.stroke();
    for (let i = 1; i < folds; i++) {
      const fx = x0 + ((x1 - x0) * i) / folds;
      curve(ctx, [[fx, top + 14], [fx + 3, (top + bot) / 2], [fx - 2, bot - 4]], { lw: 2, seed: seed + i, amp: 0.8 });
    }
  };
  curtain(1300, 1418, 921);
  curtain(1862, 1960, 922);
};

const drawClock = (ctx: Ctx, t: number) => {
  const { x, y, r } = CLOCK;
  ctx.save();
  ctx.translate(x, y);
  blob(
    ctx,
    Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return [Math.cos(a) * (r + 7), Math.sin(a) * (r + 7)] as Pt;
    }),
    { fill: SET.ink, seed: 930, amp: 0.2 },
  );
  blob(
    ctx,
    Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
    }),
    { fill: SET.clockFace, stroke: null, seed: 931, amp: 0.2 },
  );
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const l = i % 3 === 0 ? 10 : 5;
    ctx.strokeStyle = SET.ink;
    ctx.lineWidth = i % 3 === 0 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * (r - 6), -Math.cos(a) * (r - 6));
    ctx.lineTo(Math.sin(a) * (r - 6 - l), -Math.cos(a) * (r - 6 - l));
    ctx.stroke();
  }
  // 1:48 a.m.
  const hand = (a: number, len: number, w: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-Math.sin(a) * 6, Math.cos(a) * 6);
    ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
    ctx.stroke();
  };
  hand(((1 + 48 / 60) / 12) * Math.PI * 2, r * 0.5, 4.5, SET.ink);
  hand((48 / 60) * Math.PI * 2, r * 0.78, 3.2, SET.ink);
  // ticking second hand, one tick per second with a tiny spring
  const ticks = Math.floor(t - 0.4) + 1;
  const since = t - 0.4 - Math.floor(t - 0.4);
  const sec = 21 + Math.max(0, ticks - 1) + (t >= 0.4 ? springStep(since, 9, 0.35) : 0);
  hand((sec / 60) * Math.PI * 2, r * 0.82, 1.6, "#c0453b");
  ctx.fillStyle = SET.ink;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawPrint = (ctx: Ctx) => {
  // simple framed art print above the bed
  box(ctx, 96, 246, 196, 170, { fill: "#efece5", r: 3, seed: 940 });
  box(ctx, 116, 266, 156, 130, { fill: "#d9d4c8", stroke: null, r: 2, seed: 941 });
  ctx.fillStyle = "#c97b5a";
  ctx.beginPath();
  ctx.arc(170, 318, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6e8ea2";
  ctx.fillRect(116, 340, 156, 56);
  line(ctx, [116, 340], [272, 340], { lw: 2, seed: 942 });
};

const drawBed = (ctx: Ctx) => {
  // low bed: frame, legs, mattress, duvet hanging over the edge, pillow
  box(ctx, 26, 790, 22, FLOOR_Y - 790, { fill: SET.bedFrame, r: 3, seed: 950 });
  box(ctx, 404, 790, 22, FLOOR_Y - 790, { fill: SET.bedFrame, r: 3, seed: 951 });
  box(ctx, -60, 752, 500, 44, { fill: SET.bedFrame, r: 4, seed: 952 });
  box(ctx, -60, 690, 492, 66, { fill: SET.pillow, r: 10, seed: 953 });
  blob(
    ctx,
    [
      [-40, 650],
      [60, 640],
      [130, 664],
      [120, 694],
      [-40, 696],
    ],
    { fill: SET.pillow, seed: 954, amp: 0.4 },
  );
  blob(
    ctx,
    [
      [110, 676],
      [220, 660],
      [330, 668],
      [430, 680],
      [452, 720],
      [446, 790],
      [400, 800],
      [380, 760],
      [300, 742],
      [160, 742],
      [100, 720],
    ],
    { fill: SET.duvet, seed: 955, amp: 0.5 },
  );
  curve(ctx, [[260, 670], [300, 700], [340, 740]], { lw: 2.4, seed: 956 });
  curve(ctx, [[420, 700], [430, 750], [418, 790]], { lw: 2.4, seed: 957 });
};

const drawZaisu = (ctx: Ctx) => {
  const { seatX0, seatX1, backBottom, backTop } = ZAISU;
  // backrest: a thick cushion slab leaning back
  const dx = backTop[0] - backBottom[0];
  const dy = backTop[1] - backBottom[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const th = 52;
  blob(
    ctx,
    [
      backBottom,
      [backTop[0], backTop[1] + 4],
      [backTop[0] + 14, backTop[1] - 8],
      [backTop[0] - nx * th + 10, backTop[1] - ny * th - 2],
      [backBottom[0] - nx * th, backBottom[1] - ny * th],
    ],
    { fill: SET.zaisu, seed: 960, amp: 0.4 },
  );
  // seat cushion
  box(ctx, seatX0, 868, seatX1 - seatX0, FLOOR_Y - 866, { fill: SET.zaisuShade, r: 14, seed: 961 });
};

/** Table legs on the far/left side: behind the character's legs. */
export const drawTableBack = (ctx: Ctx) => {
  const { x, y, th } = TABLE;
  box(ctx, x + 28, y + th - 4, 22, FLOOR_Y - y - th + 6, { fill: SET.oakDark, r: 3, seed: 970 });
};

/** Table top, near legs and everything standing on it (not the phone). */
export const drawTableFront = (ctx: Ctx) => {
  const { x, y, w, th } = TABLE;
  box(ctx, x + w - 50, y + th - 4, 22, FLOOR_Y - y - th + 6, { fill: SET.oakDark, r: 3, seed: 971 });
  box(ctx, x, y, w, th, { fill: SET.oak, r: 5, seed: 972 });
  line(ctx, [x + 12, y + 6], [x + w - 12, y + 6], { lw: 2, color: "rgba(255,240,215,0.45)", seed: 973 });

  // textbook + notebook (the thing he should be doing)
  box(ctx, 1176, y - 30, 98, 30, { fill: SET.book, r: 3, seed: 974 });
  ctx.fillStyle = "#e9e4d6";
  ctx.fillRect(1182, y - 24, 86, 4);
  box(ctx, 1186, y - 40, 82, 10, { fill: SET.book2, r: 2, seed: 975 });

  // laptop
  const L = LAPTOP;
  ctx.save();
  ctx.translate(L.hinge[0], L.hinge[1]);
  ctx.rotate(L.lidAngle);
  box(ctx, -L.lidTh, -L.lidLen, L.lidTh, L.lidLen, { fill: SET.laptopDark, r: 5, seed: 976 });
  ctx.restore();
  box(ctx, L.x0, L.top, L.x1 - L.x0, L.th, { fill: SET.laptop, r: 6, seed: 977 });
  ctx.fillStyle = "rgba(30,34,48,0.6)";
  for (let i = 0; i < 13; i++) ctx.fillRect(L.x0 + 30 + i * 17, L.top - 2.5, 11, 3);

  // desk light: weighted base, stem, arm reaching over the table
  const { baseX, headX, headY } = DESK_LIGHT;
  blob(
    ctx,
    [
      [baseX - 30, y],
      [baseX - 26, y - 10],
      [baseX + 26, y - 10],
      [baseX + 30, y],
    ],
    { fill: SET.lamp, seed: 978, amp: 0.3 },
  );
  curve(ctx, [[baseX, y - 8], [baseX + 6, 640], [baseX - 2, 540], [headX + 40, headY - 26], [headX, headY]], {
    lw: 11,
    color: SET.ink,
    seed: 979,
    amp: 0.2,
  });
  curve(ctx, [[baseX, y - 8], [baseX + 6, 640], [baseX - 2, 540], [headX + 40, headY - 26], [headX, headY]], {
    lw: 4.5,
    color: SET.lamp,
    seed: 979,
    amp: 0.2,
  });
};

/** Emissive parts (drawn after lighting). */
export const drawDeskLightHead = (ctx: Ctx) => {
  const { headX, headY } = DESK_LIGHT;
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(-0.25);
  box(ctx, -34, -8, 52, 16, { fill: SET.lamp, r: 7, seed: 980 });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-28, 6, 40, 4);
  ctx.restore();
};

export const drawLaptopScreenEdge = (ctx: Ctx, a: number) => {
  const L = LAPTOP;
  ctx.save();
  ctx.translate(L.hinge[0], L.hinge[1]);
  ctx.rotate(L.lidAngle);
  ctx.lineCap = "round";
  ctx.filter = "blur(5px)";
  ctx.strokeStyle = `rgba(200,220,255,${0.5 * a})`;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-L.lidTh - 4, -L.lidLen + 14);
  ctx.lineTo(-L.lidTh - 4, -12);
  ctx.stroke();
  ctx.filter = "none";
  ctx.strokeStyle = `rgba(232,240,255,${0.9 * a})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-L.lidTh - 1.5, -L.lidLen + 14);
  ctx.lineTo(-L.lidTh - 1.5, -12);
  ctx.stroke();
  ctx.restore();
};

