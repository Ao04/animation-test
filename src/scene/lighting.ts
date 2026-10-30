// Lighting & finishing passes: night ambience, warm lamp glow, cool screen
// light on the face, bloom, floating dust, vignette, paper texture, grain.

import { hash, noise1 } from "../kit/math";
import { Ctx } from "../kit/pen";
import { post } from "../kit/post";
import { H, LAMP, LAPTOP, W } from "./layout";
import { drawLampShade, drawScreenEdge } from "./room";

/** 1. Ambient for the set: the room falls off into darkness away from the lamp. */
export const lightAmbient = (ctx: Ctx) => {
  const lx = LAMP.x;
  const ly = LAMP.shadeBot;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const amb = ctx.createRadialGradient(lx, ly, 40, lx, ly, 1650);
  amb.addColorStop(0, "#fff6e6");
  amb.addColorStop(0.22, "#f2e0c8");
  amb.addColorStop(0.5, "#c4ad99");
  amb.addColorStop(0.78, "#8a7568");
  amb.addColorStop(1, "#5e4d46");
  ctx.fillStyle = amb;
  ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.restore();
};

/**
 * Character layer shading (drawn source-atop on the character's own layer).
 * The character gets gentler darkening than the set so the white hoodie
 * still reads as white, with the back side and legs falling into shadow.
 */
export const shadeCharacter = (ctx: Ctx) => {
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const back = ctx.createLinearGradient(520, 0, 800, 0);
  back.addColorStop(0, "rgba(64,44,40,0.34)");
  back.addColorStop(1, "rgba(64,44,40,0.04)");
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, W, H);
  const low = ctx.createLinearGradient(0, 690, 0, 1000);
  low.addColorStop(0, "rgba(30,20,20,0)");
  low.addColorStop(1, "rgba(30,20,20,0.42)");
  ctx.fillStyle = low;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,196,130,0.07)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
};

/** 2. Light sources over everything (additive). */
export const lightGlow = (ctx: Ctx, screen: number, t: number) => {
  const lx = LAMP.x;
  const ly = LAMP.shadeBot;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const glow = ctx.createRadialGradient(lx, ly - 10, 10, lx, ly - 10, 640);
  glow.addColorStop(0, "rgba(255,186,105,0.6)");
  glow.addColorStop(0.3, "rgba(255,150,70,0.17)");
  glow.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-200, -200, W + 400, H + 400);

  ctx.save();
  ctx.translate(lx, 640);
  ctx.scale(1.8, 0.5);
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
  pool.addColorStop(0, "rgba(255,200,130,0.45)");
  pool.addColorStop(1, "rgba(255,200,130,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(-220, -220, 440, 440);
  ctx.restore();

  // 3. cool laptop light thrown back onto her face and hoodie
  const sx = LAPTOP.hinge[0] - 110;
  const sy = 455;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(1.35, 0.9);
  const scr = ctx.createRadialGradient(0, 0, 0, 0, 0, 430);
  const a = 0.24 * screen;
  scr.addColorStop(0, `rgba(160,190,255,${a})`);
  scr.addColorStop(0.55, `rgba(140,170,255,${a * 0.45})`);
  scr.addColorStop(1, "rgba(140,170,255,0)");
  ctx.fillStyle = scr;
  ctx.fillRect(-460, -460, 920, 920);
  ctx.restore();
  ctx.restore();

  // 4. light sources stay bright: lamp shade and the screen edge
  drawLampShade(ctx);
  drawScreenEdge(ctx, screen);

  // light leaking under the shade
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  // elliptical falloff (scaled circular gradient, so it fades fully to zero)
  ctx.translate(lx, ly + 6);
  ctx.scale(1, 0.55);
  const bulb = ctx.createRadialGradient(0, 0, 0, 0, 0, 130);
  bulb.addColorStop(0, "rgba(255,230,170,0.8)");
  bulb.addColorStop(0.5, "rgba(255,215,150,0.25)");
  bulb.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = bulb;
  ctx.fillRect(-140, -140, 280, 280);
  ctx.restore();

  drawDust(ctx, t);
};

/** Dust motes drifting slowly through the lamp light. */
const drawDust = (ctx: Ctx, t: number) => {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 34; i++) {
    const bx = 1300 + hash(i, 900) * 620;
    const by = 160 + hash(i, 901) * 520;
    const x = bx + noise1(t * 0.35 + i * 3.1, 902) * 34 + t * 6;
    const y = by - t * (5 + hash(i, 903) * 8) + noise1(t * 0.4 + i, 904) * 18;
    const d = Math.hypot(x - LAMP.x, y - LAMP.shadeBot);
    const a = Math.max(0, 1 - d / 420) * (0.35 + 0.35 * hash(i, 905));
    if (a <= 0.01) continue;
    const r = 1.4 + hash(i, 906) * 1.8;
    ctx.fillStyle = `rgba(255,225,170,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/** Screen-space finishing for this cut's look. */
export const finish = (ctx: Ctx, frame: number, fade: number) =>
  post(ctx, frame, fade, { bloom: 0.1, vignette: "20,10,8", vignetteAlpha: 0.55, paper: 1, grain: 0.07 });
