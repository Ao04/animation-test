import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { drawStudentLegs, drawStudentUpper } from "../../characters/student";
import { easeInOut, lerp } from "../../kit/math";
import { Ctx, setPen } from "../../kit/pen";
import { post } from "../../kit/post";
import { offscreen } from "../../kit/texture";
import { drawPhone, phoneGlow } from "../../props/phone";
import {
  DESK_LIGHT,
  H,
  LAPTOP,
  SET,
  TABLE,
  W,
  drawDeskLightHead,
  drawLaptopScreenEdge,
  drawRoomBack,
  drawTableBack,
  drawTableFront,
} from "../../sets/nightApartment";
import { stateAt } from "./motion";

/** Night ambience: everything falls off into cool blue away from the desk light. */
const ambient = (ctx: Ctx) => {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const g = ctx.createRadialGradient(1120, 700, 30, 1120, 700, 1450);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.18, "#dfe3ee");
  g.addColorStop(0.45, "#8890ad");
  g.addColorStop(0.75, "#585f84");
  g.addColorStop(1, "#3c4166");
  ctx.fillStyle = g;
  ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.restore();
};

/** Character layer: gentler darkening, back side falls into shadow. */
const shadeCharacter = (ctx: Ctx) => {
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const back = ctx.createLinearGradient(540, 0, 820, 0);
  back.addColorStop(0, "rgba(12,16,38,0.38)");
  back.addColorStop(1, "rgba(12,16,38,0.04)");
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(60,80,140,0.07)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
};

export const drawPhoneScroll = (ctx: Ctx, frame: number, fps: number, total: number) => {
  const t = frame / fps;
  const s = stateAt(t);
  setPen(SET.ink, SET.lw);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.filter = "none";

  const zoom = lerp(1.17, 1.24, easeInOut(t / (total / fps)));
  const fx = 830;
  const fy = 640;
  const cam = new DOMMatrix([zoom, 0, 0, zoom, fx - fx * zoom, fy - fy * zoom]);
  ctx.setTransform(cam);

  // environment + legs (the legs are under the table, so they share the room light)
  drawRoomBack(ctx, t);
  drawTableBack(ctx);
  drawStudentLegs(ctx, s.pose);
  drawTableFront(ctx);
  if (!s.phone.held) drawPhone(ctx, s.phone.c, s.phone.angle, s.phone.screen, s.phone.tint);
  ambient(ctx);

  // upper body on its own layer
  const layer = offscreen("student", W, H);
  const lc = layer.getContext("2d")!;
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, W, H);
  lc.setTransform(cam);
  drawStudentUpper(lc, s.pose);
  shadeCharacter(lc);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();

  // light sources
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  // desk light: pool on the table + soft halo
  ctx.save();
  ctx.translate(DESK_LIGHT.headX - 40, TABLE.y);
  ctx.scale(2.3, 0.55);
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 170);
  pool.addColorStop(0, "rgba(255,250,240,0.5)");
  pool.addColorStop(1, "rgba(255,250,240,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(-180, -180, 360, 360);
  ctx.restore();
  const halo = ctx.createRadialGradient(DESK_LIGHT.headX, DESK_LIGHT.headY + 10, 0, DESK_LIGHT.headX, DESK_LIGHT.headY + 10, 420);
  halo.addColorStop(0, "rgba(235,240,255,0.34)");
  halo.addColorStop(0.3, "rgba(220,230,255,0.08)");
  halo.addColorStop(1, "rgba(220,230,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(DESK_LIGHT.headX - 420, DESK_LIGHT.headY - 410, 840, 840);
  // laptop screen light towards the face
  ctx.save();
  ctx.translate(LAPTOP.hinge[0] - 150, 560);
  ctx.scale(1.4, 0.95);
  const scr = ctx.createRadialGradient(0, 0, 0, 0, 0, 360);
  scr.addColorStop(0, `rgba(170,195,255,${0.22 * s.laptop})`);
  scr.addColorStop(0.55, `rgba(150,180,255,${0.08 * s.laptop})`);
  scr.addColorStop(1, "rgba(150,180,255,0)");
  ctx.fillStyle = scr;
  ctx.fillRect(-380, -380, 760, 760);
  ctx.restore();
  // phone light (the notification, then on his face)
  const tintGlow = s.phone.tint;
  phoneGlow(ctx, s.phone.c, s.phone.angle, s.phone.screen * (s.phone.held ? 0.95 : 0.7), s.phone.held ? 230 : 150, tintGlow);
  ctx.restore();

  drawDeskLightHead(ctx);
  drawLaptopScreenEdge(ctx, s.laptop);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // no fades: cuts are delivered clean for editing
  post(ctx, frame, 1, { bloom: 0.12, vignette: "6,10,24", vignetteAlpha: 0.6, vignetteCenter: [0.5, 0.52], paper: 0.35, grain: 0.05 });
};

export const PhoneScroll: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawPhoneScroll(ctx, frame, fps, durationInFrames);
  }, [frame, fps, durationInFrames]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />
      <Audio src={staticFile("cuts/phone_scroll.wav")} />
    </AbsoluteFill>
  );
};
