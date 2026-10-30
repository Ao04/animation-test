// Single still for choosing between final variants: upper body on top,
// a 2.4x face close-up below, one column per variant.

import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { GuyLook, drawGuyLegs, drawGuyUpper } from "../../characters/guy";
import { MAIN_GUY, MAIN_GUY_GLASSES } from "../../characters/guyLooks";
import { offscreen } from "../../kit/texture";
import { H, W } from "../../scene/layout";
import { drawFrame } from "../../TypingScene";

const BODY = { x: 420, y: 170, w: 680, h: 820 };
const FACE = { x: 580, y: 230, w: 280, h: 280 };
const LABEL = 56;
const FACE_H = 680;
const VARIANTS: { id: string; look: GuyLook }[] = [
  { id: "A", look: MAIN_GUY },
  { id: "B", look: MAIN_GUY_GLASSES },
];
export const PICK_W = BODY.w * VARIANTS.length;
export const PICK_H = LABEL + BODY.h + FACE_H;

export const CharacterPick: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.fillStyle = "#1b1614";
    ctx.fillRect(0, 0, PICK_W, PICK_H);
    VARIANTS.forEach(({ id, look }, i) => {
      const off = offscreen("pick-frame", W, H);
      drawFrame(off.getContext("2d")!, 20, 30, 120, (c, pose) => {
        drawGuyLegs(c, pose, look);
        drawGuyUpper(c, pose, look);
      });
      const x = i * BODY.w;
      ctx.drawImage(off, BODY.x, BODY.y, BODY.w, BODY.h, x, LABEL, BODY.w, BODY.h);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(off, FACE.x, FACE.y, FACE.w, FACE.h, x, LABEL + BODY.h, BODY.w, FACE_H);
      ctx.strokeStyle = "#1b1614";
      ctx.lineWidth = 6;
      ctx.strokeRect(x, LABEL, BODY.w, BODY.h + FACE_H);
      ctx.fillStyle = "#f3ead9";
      ctx.font = "bold 40px sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(id, x + 22, LABEL / 2 + 2);
    });
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={PICK_W} height={PICK_H} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
