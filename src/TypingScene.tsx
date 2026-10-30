import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOut, invLerp, lerp, smooth } from "./kit/math";
import { INK, LINE, setPen } from "./kit/pen";
import { offscreen } from "./kit/texture";
import { drawLegs, drawUpperBody } from "./scene/character";
import { H, W } from "./scene/layout";
import { finish, lightAmbient, lightGlow, shadeCharacter } from "./scene/lighting";
import { poseAt } from "./scene/motion";
import { drawChair, drawDesk, drawDeskLegs, drawDeskProps, drawLaptop, drawPoster, drawShelf, drawWall, drawWindow } from "./scene/room";

export type CharacterDrawer = (ctx: CanvasRenderingContext2D, pose: ReturnType<typeof poseAt>) => void;

const drawGirl: CharacterDrawer = (cc, pose) => {
  drawLegs(cc, pose);
  drawUpperBody(cc, pose);
};

export const drawFrame = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  fps: number,
  total: number,
  drawCharacter: CharacterDrawer = drawGirl,
) => {
  const t = frame / fps;
  const pose = poseAt(t);
  setPen(INK, LINE);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  // slow camera push-in towards the character
  const zoom = lerp(1.08, 1.13, easeInOut(t / (total / fps)));
  const fx = 900;
  const fy = 560;
  const cam = new DOMMatrix([zoom, 0, 0, zoom, fx - fx * zoom, fy - fy * zoom]);
  ctx.setTransform(cam);

  // set (environment), lit with the room's ambient light
  drawWall(ctx);
  drawWindow(ctx, t);
  drawPoster(ctx);
  drawShelf(ctx);
  drawChair(ctx);
  drawDeskLegs(ctx);
  drawDesk(ctx);
  drawDeskProps(ctx, t);
  drawLaptop(ctx);
  lightAmbient(ctx);

  // character on its own layer with its own shading
  const char = offscreen("character", W, H);
  const cc = char.getContext("2d")!;
  cc.setTransform(1, 0, 0, 1, 0, 0);
  cc.clearRect(0, 0, W, H);
  cc.setTransform(cam);
  drawCharacter(cc, pose);
  shadeCharacter(cc);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // soft cast shadow on the wall (the lamp is to her right)
  ctx.filter = "blur(16px) brightness(0)";
  ctx.globalAlpha = 0.2;
  ctx.drawImage(char, -52, -16);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.drawImage(char, 0, 0);
  ctx.restore();

  lightGlow(ctx, pose.screen, t);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fade = Math.min(smooth(invLerp(0, 7, frame)), 1 - smooth(invLerp(total - 7, total - 1, frame)));
  finish(ctx, frame, fade);
};

export const TypingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawFrame(ctx, frame, fps, durationInFrames);
  }, [frame, fps, durationInFrames]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />
      <Audio src={staticFile("sfx.wav")} />
    </AbsoluteFill>
  );
};
