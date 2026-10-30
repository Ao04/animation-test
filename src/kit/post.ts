// Screen-space finishing shared by every cut: bloom, vignette, paper, grain, fade.

import { hash } from "./math";
import { Ctx } from "./pen";
import { grainTile, offscreen, paper } from "./texture";

export interface PostOpts {
  bloom: number; // alpha of the blurred screen copy
  vignette: string; // rgb triplet "r,g,b"
  vignetteAlpha: number;
  vignetteCenter?: [number, number]; // 0..1
  paper: number; // 0..1 strength of the paper texture
  grain: number; // overlay alpha
  fadeColor?: string; // rgb triplet
}

export const post = (ctx: Ctx, frame: number, fade: number, o: PostOpts) => {
  const canvas = ctx.canvas;
  const W = canvas.width;
  const H = canvas.height;

  if (o.bloom > 0) {
    const b = offscreen("bloom", W / 4, H / 4);
    const bctx = b.getContext("2d")!;
    bctx.globalCompositeOperation = "copy";
    bctx.filter = "blur(6px) brightness(1.1)";
    bctx.drawImage(canvas, 0, 0, W / 4, H / 4);
    bctx.filter = "none";
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = o.bloom;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(b, 0, 0, W, H);
    ctx.restore();
  }

  const [vx, vy] = o.vignetteCenter ?? [0.56, 0.48];
  ctx.save();
  const v = ctx.createRadialGradient(W * vx, H * vy, H * 0.35, W * vx, H * vy, H * 1.05);
  v.addColorStop(0, `rgba(${o.vignette},0)`);
  v.addColorStop(1, `rgba(${o.vignette},${o.vignetteAlpha})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (o.paper > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = o.paper;
    ctx.drawImage(paper(W, H), 0, 0);
    ctx.restore();
  }

  if (o.grain > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = o.grain;
    const tile = grainTile(frame);
    const ox = Math.floor(hash(frame, 1) * 256);
    const oy = Math.floor(hash(frame, 2) * 256);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = ctx.createPattern(tile, "repeat")!;
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }

  if (fade < 1) {
    ctx.save();
    ctx.fillStyle = `rgba(${o.fadeColor ?? "8,5,4"},${1 - fade})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
};
