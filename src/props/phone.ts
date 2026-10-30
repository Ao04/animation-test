// Smartphone prop, seen edge-on from the side. The screen is on the local -y side.

import { Pt } from "../kit/math";
import { Ctx, box } from "../kit/pen";

export const PHONE = { len: 108, th: 15 };

export const drawPhone = (ctx: Ctx, c: Pt, angle: number, screen: number, tint = "205,225,255") => {
  const { len, th } = PHONE;
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(angle);
  box(ctx, -len / 2, -th / 2, len, th, { fill: "#262a35", r: 5, seed: 2001, amp: 0.3 });
  // camera bump on the back
  ctx.fillStyle = "#3a3f4c";
  ctx.fillRect(len / 2 - 26, th / 2 - 1, 16, 4);
  if (screen > 0) {
    ctx.strokeStyle = `rgba(${tint},${Math.min(1, screen)})`;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-len / 2 + 7, -th / 2 + 1.5);
    ctx.lineTo(len / 2 - 7, -th / 2 + 1.5);
    ctx.stroke();
  }
  ctx.restore();
};

/** Soft light thrown by the screen (draw with "screen" compositing). */
export const phoneGlow = (ctx: Ctx, c: Pt, angle: number, a: number, radius: number, tint = "150,195,255") => {
  if (a <= 0) return;
  // centre of the glow sits in front of the screen
  const nx = Math.sin(angle);
  const ny = -Math.cos(angle);
  const gx = c[0] + nx * radius * 0.35;
  const gy = c[1] + ny * radius * 0.35;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
  g.addColorStop(0, `rgba(${tint},${0.55 * a})`);
  g.addColorStop(0.45, `rgba(${tint},${0.18 * a})`);
  g.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
};
