// The bedroom set: wall, door frame, window, poster, floor, chair, desk and
// everything on it. Props that the character interacts with are split out so
// the character can be layered in between.

import { Pt, deg, hash, noise1 } from "../kit/math";
import { Ctx, INK, LINE, blob, box, curve, handify, line, poly, spline } from "../kit/pen";
import { letter } from "./letters";
import { C, CHAIR, DESK, FLOOR_Y, H, LAMP, LAPTOP, MUG, POSTER, W, WINDOW } from "./layout";

export const drawWall = (ctx: Ctx) => {
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, 0, W, H);

  // soft vertical variation, like a painted wall in a hand-made background
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "rgba(90,70,55,0.18)");
  g.addColorStop(0.45, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(255,230,190,0.08)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // door frame on the far left (double lines like the reference)
  ctx.fillStyle = C.wallDark;
  ctx.fillRect(0, 0, 66, FLOOR_Y);
  box(ctx, 66, -10, 30, FLOOR_Y + 10, { fill: C.frame, r: 2, seed: 4 });
  line(ctx, [140, -10], [140, FLOOR_Y - 14], { seed: 6, lw: 4 });
  line(ctx, [154, -10], [154, FLOOR_Y - 14], { seed: 7, lw: 4 });

  // floor + skirting board
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  ctx.fillStyle = C.floorDark;
  ctx.fillRect(0, FLOOR_Y + 40, W, H - FLOOR_Y - 40);
  line(ctx, [-10, FLOOR_Y + 40], [W + 10, FLOOR_Y + 40], { seed: 13, lw: 3, color: "rgba(42,32,28,0.6)" });
  box(ctx, 96, FLOOR_Y - 16, W, 18, { fill: C.base, r: 2, seed: 15 });
};

export const drawWindow = (ctx: Ctx, t: number) => {
  const { x0, x1, y0, y1 } = WINDOW;
  const inset = 20;
  const gx0 = x0 + inset;
  const gx1 = x1 - inset;
  const gy0 = y0 + inset;
  const gy1 = y1 - inset;

  // night sky
  const sky = ctx.createLinearGradient(0, gy0, 0, gy1);
  sky.addColorStop(0, C.sky0);
  sky.addColorStop(1, C.sky1);
  ctx.fillStyle = sky;
  ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0);
  ctx.clip();

  // twinkling stars
  for (let i = 0; i < 9; i++) {
    const sx = gx0 + 20 + hash(i, 71) * (gx1 - gx0 - 40);
    const sy = gy0 + 20 + hash(i, 72) * 210;
    const tw = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * (2 + hash(i, 73) * 3) + i * 2.1));
    ctx.fillStyle = `rgba(230,225,255,${tw})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.6 + hash(i, 74) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // crescent moon (clip out a second circle)
  const mx = 1352;
  const my = 168;
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0);
  ctx.arc(mx + 16, my - 9, 31, 0, Math.PI * 2, true);
  ctx.clip("evenodd");
  ctx.fillStyle = C.moon;
  ctx.beginPath();
  ctx.arc(mx, my, 33, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // distant hills and rooftops
  ctx.fillStyle = C.hills;
  ctx.beginPath();
  const hill: Pt[] = [
    [gx0 - 10, gy1 + 10],
    [gx0 - 10, 380],
    [1040, 352],
    [1150, 376],
    [1250, 338],
    [1350, 362],
    [gx1 + 10, 330],
    [gx1 + 10, gy1 + 10],
  ];
  spline(ctx, hill, true, 0.6);
  ctx.fill();
  ctx.fillStyle = C.roofs;
  ctx.beginPath();
  poly(
    ctx,
    handify(
      [
        [gx0 - 10, gy1 + 10],
        [gx0 - 10, 450],
        [1030, 450],
        [1075, 412],
        [1120, 450],
        [1170, 450],
        [1170, 428],
        [1260, 428],
        [1260, 455],
        [1330, 455],
        [1372, 418],
        [1414, 455],
        [gx1 + 10, 455],
        [gx1 + 10, gy1 + 10],
      ],
      { seed: 31, amp: 0.8, closed: true },
    ),
  );
  ctx.fill();
  // a couple of tiny lit windows far away
  ctx.fillStyle = "rgba(255,196,120,0.75)";
  ctx.fillRect(1196, 438, 9, 8);
  ctx.fillRect(1062, 432, 7, 7);

  // glass reflection streaks
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(gx0 + 40, gy1);
  ctx.lineTo(gx0 + 260, gy0);
  ctx.moveTo(gx0 + 300, gy1);
  ctx.lineTo(gx0 + 420, gy0 + 150);
  ctx.stroke();
  ctx.restore();

  // frame: outer ring, glass edge, mullion
  ctx.fillStyle = C.frame;
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.rect(gx1, gy0, gx0 - gx1, gy1 - gy0); // reversed winding -> hole
  ctx.fill("nonzero");
  box(ctx, x0, y0, x1 - x0, y1 - y0, { fill: null, r: 3, seed: 41 });
  box(ctx, gx0, gy0, gx1 - gx0, gy1 - gy0, { fill: null, r: 2, seed: 42 });
  const mid = (x0 + x1) / 2;
  box(ctx, mid - 8, gy0, 16, gy1 - gy0, { fill: C.frame, r: 2, seed: 43 });

  // sill
  box(ctx, x0 - 24, y1 - 2, x1 - x0 + 48, 24, { fill: C.frame, r: 3, seed: 44 });
};

export const drawPoster = (ctx: Ctx) => {
  const { x, y, w, h, rot: r } = POSTER;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(r);
  box(ctx, -w / 2, -h / 2, w, h, { fill: C.poster, r: 5, seed: 51, amp: 1.4 });
  // slight paper curl shading at the bottom
  ctx.fillStyle = "rgba(120,80,20,0.12)";
  ctx.fillRect(-w / 2 + 4, h / 2 - 22, w - 8, 18);
  letter(ctx, "EXAM:", -w / 2 + 52, -h / 2 + 34, 50, C.posterInk, 7.5, 3);
  letter(ctx, "3 DAYS", -w / 2 + 40, -h / 2 + 110, 50, C.posterInk, 7.5, 9);
  // tape
  ctx.fillStyle = "rgba(240,235,220,0.75)";
  ctx.save();
  ctx.translate(0, -h / 2);
  ctx.rotate(deg(-4));
  ctx.fillRect(-22, -9, 44, 18);
  ctx.restore();
  ctx.restore();
};

/** Small wall shelf on the left: a few books and a potted plant. */
export const drawShelf = (ctx: Ctx) => {
  const y = 372;
  // brackets
  box(ctx, 236, y + 14, 12, 34, { fill: C.woodDark, r: 3, seed: 121 });
  box(ctx, 388, y + 14, 12, 34, { fill: C.woodDark, r: 3, seed: 122 });
  // books (one leaning)
  box(ctx, 244, y - 92, 26, 92, { fill: "#6d7f6a", r: 3, seed: 123 });
  box(ctx, 272, y - 80, 22, 80, { fill: C.bookRed, r: 3, seed: 124 });
  box(ctx, 296, y - 98, 28, 98, { fill: C.bookBlue, r: 3, seed: 125 });
  ctx.save();
  ctx.translate(326, y);
  ctx.rotate(0.22);
  box(ctx, 0, -84, 22, 84, { fill: "#c9a24f", r: 3, seed: 126 });
  ctx.restore();
  // plant
  const px = 384;
  const leaf = (pts: Pt[], seed: number) => blob(ctx, pts, { fill: "#5d7a52", seed, amp: 0.3 });
  leaf([[px, y - 44], [px - 30, y - 92], [px - 8, y - 70]], 127);
  leaf([[px, y - 44], [px + 34, y - 96], [px + 12, y - 66]], 128);
  leaf([[px, y - 44], [px - 4, y - 112], [px + 8, y - 80]], 129);
  blob(ctx, [[px - 22, y - 48], [px + 22, y - 48], [px + 16, y], [px - 16, y]], { fill: "#b5654a", seed: 130, amp: 0.3 });
  // board
  box(ctx, 220, y, 196, 16, { fill: C.woodLight, r: 3, seed: 131 });
};

export const drawChair = (ctx: Ctx) => {
  const { x0, x1, seatY, seatTh, postX, postTop } = CHAIR;
  // back leg + post (one piece), front leg
  box(ctx, postX, postTop, 24, FLOOR_Y - postTop + 2, { fill: C.chair, r: 6, seed: 61 });
  box(ctx, x1 - 30, seatY + seatTh - 4, 22, FLOOR_Y - seatY - seatTh + 6, { fill: C.chairDark, r: 4, seed: 62 });
  box(ctx, x0 + 14, seatY + seatTh - 4, 22, FLOOR_Y - seatY - seatTh + 6, { fill: C.chair, r: 4, seed: 63 });
  // stretcher
  box(ctx, x0 + 30, 900, x1 - x0 - 56, 14, { fill: C.chairDark, r: 4, seed: 64 });
  // back rails
  box(ctx, postX - 4, postTop + 18, 34, 22, { fill: C.chairDark, r: 5, seed: 65 });
  // seat
  box(ctx, x0, seatY, x1 - x0, seatTh, { fill: C.chair, r: 6, seed: 66 });
  line(ctx, [x0 + 10, seatY + 6], [x1 - 12, seatY + 6], { lw: 2.5, color: "rgba(255,220,180,0.25)", seed: 67 });
};

/** Desk legs sit behind the character's legs (she sits between them). */
export const drawDeskLegs = (ctx: Ctx) => {
  const { x, y, w, th } = DESK;
  box(ctx, x + 22, y + th - 4, 26, FLOOR_Y - y - th + 6, { fill: C.woodDark, r: 4, seed: 71 });
  box(ctx, x + w - 46, y + th - 4, 26, FLOOR_Y - y - th + 6, { fill: C.woodDark, r: 4, seed: 72 });
};

export const drawDesk = (ctx: Ctx) => {
  const { x, y, w, th } = DESK;
  // drawer
  box(ctx, x + w - 330, y + th - 4, 284, 96, { fill: C.wood, r: 4, seed: 73 });
  box(ctx, x + w - 222, y + th + 38, 70, 12, { fill: C.ink, stroke: null, r: 5, seed: 74 });
  // top
  box(ctx, x, y, w, th, { fill: C.woodLight, r: 5, seed: 75 });
  line(ctx, [x + 14, y + 7], [x + w - 14, y + 7], { lw: 2.5, color: "rgba(255,230,190,0.35)", seed: 76 });
};

/** Laptop: base + lid. The screen faces the character (to the left). */
export const drawLaptop = (ctx: Ctx) => {
  const { x0, x1, top, th, hinge, lidLen, lidTh, lidAngle } = LAPTOP;
  // lid
  ctx.save();
  ctx.translate(hinge[0], hinge[1]);
  ctx.rotate(lidAngle);
  box(ctx, -lidTh, -lidLen, lidTh, lidLen, { fill: C.aluDark, r: 6, seed: 81 });
  ctx.restore();

  // base
  box(ctx, x0, top, x1 - x0, th, { fill: C.alu, r: 7, seed: 82 });
  // keyboard: subtle row of key tops
  ctx.fillStyle = "rgba(60,55,52,0.55)";
  for (let i = 0; i < 13; i++) {
    const kx = x0 + 34 + i * 16.5;
    ctx.fillRect(kx, top - 2.5, 11, 3);
  }
  line(ctx, [x0 + 10, top + th - 5], [x1 - 10, top + th - 5], { lw: 2, color: "rgba(42,32,28,0.35)", seed: 83 });
};

/** The screen faces her, so we only see its glowing edge (drawn after lighting). */
export const drawScreenEdge = (ctx: Ctx, screen: number) => {
  const { hinge, lidLen, lidTh, lidAngle } = LAPTOP;
  ctx.save();
  ctx.translate(hinge[0], hinge[1]);
  ctx.rotate(lidAngle);
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(190,215,255,${Math.min(1, 0.55 * screen)})`;
  ctx.lineWidth = 9;
  ctx.filter = "blur(5px)";
  ctx.beginPath();
  ctx.moveTo(-lidTh - 4, -lidLen + 16);
  ctx.lineTo(-lidTh - 4, -14);
  ctx.stroke();
  ctx.filter = "none";
  ctx.strokeStyle = `rgba(225,238,255,${Math.min(1, 0.85 * screen)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-lidTh - 1.5, -lidLen + 16);
  ctx.lineTo(-lidTh - 1.5, -14);
  ctx.stroke();
  ctx.restore();
};

export const drawDeskProps = (ctx: Ctx, t: number) => {
  // book stack
  box(ctx, 1206, 612, 178, 28, { fill: C.bookRed, r: 4, seed: 91 });
  ctx.fillStyle = C.page;
  ctx.fillRect(1214, 618, 160, 4);
  box(ctx, 1222, 588, 150, 25, { fill: C.bookBlue, r: 4, seed: 92 });
  ctx.fillStyle = C.page;
  ctx.fillRect(1230, 594, 134, 4);

  // mug with steam
  const { x, y } = MUG;
  ctx.save();
  ctx.translate(x, y);
  curve(ctx, [[40, -42], [60, -40], [62, -22], [40, -16]], { lw: 9, color: INK, seed: 93 });
  curve(ctx, [[40, -42], [58, -39], [59, -23], [40, -18]], { lw: 3.5, color: C.mug, seed: 93 });
  blob(
    ctx,
    [
      [0, -58],
      [22, -60],
      [44, -58],
      [44, -20],
      [40, -2],
      [22, 0],
      [4, -2],
      [0, -20],
    ],
    { fill: C.mug, seed: 94, amp: 0.4 },
  );
  ctx.fillStyle = "rgba(180,70,60,0.85)";
  ctx.fillRect(4, -40, 36, 8);
  ctx.restore();
  drawSteam(ctx, x + 22, y - 64, t);

  // lamp
  const { x: lx, baseY, shadeTop, shadeBot } = LAMP;
  blob(
    ctx,
    [
      [lx - 46, baseY],
      [lx - 40, baseY - 12],
      [lx, baseY - 16],
      [lx + 40, baseY - 12],
      [lx + 46, baseY],
    ],
    { fill: C.lampMetal, seed: 95 },
  );
  box(ctx, lx - 6, shadeBot - 8, 12, baseY - shadeBot - 4, { fill: C.lampMetal, r: 4, seed: 96 });
};

/** Lamp shade drawn after lighting so it stays bright (emissive). */
export const drawLampShade = (ctx: Ctx) => {
  const { x: lx, shadeTop, shadeBot } = LAMP;
  const g = ctx.createLinearGradient(0, shadeTop, 0, shadeBot);
  g.addColorStop(0, "#f7e3b6");
  g.addColorStop(1, "#ffd48a");
  ctx.beginPath();
  poly(
    ctx,
    handify(
      [
        [lx - 50, shadeTop],
        [lx + 50, shadeTop],
        [lx + 88, shadeBot],
        [lx - 88, shadeBot],
      ],
      { seed: 97, amp: 0.8, closed: true },
    ),
  );
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.lineJoin = "round";
  ctx.stroke();
};

const drawSteam = (ctx: Ctx, x: number, y: number, t: number) => {
  ctx.save();
  ctx.filter = "blur(2.5px)";
  ctx.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    // each wisp rises, sways, and fades in at the cup / out at the top
    const phase = (t * 0.45 + k / 3) % 1;
    const life = Math.sin(phase * Math.PI);
    const N = 16;
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const v = i / N;
      const yy = -v * 130 - phase * 36;
      const sway = noise1(v * 2.2 - t * 0.9 + k * 5, 200 + k) * 18 * (0.25 + v);
      pts.push([x + (k - 1) * 9 + sway, y + yy]);
    }
    ctx.lineWidth = 7 - k * 1.5;
    for (let i = 0; i < N; i++) {
      const v = (i + 0.5) / N;
      ctx.strokeStyle = `rgba(255,248,235,${0.22 * life * Math.sin(v * Math.PI)})`;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();
    }
  }
  ctx.restore();
};
