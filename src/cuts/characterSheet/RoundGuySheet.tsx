// One still to review the round-head character: five expressions as face
// close-ups, then the full body and the whole frame in the bedroom set.

import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { EXPR, Expr, drawGuyLegs, drawGuyUpper, roundHeadCenter } from "../../characters/guy";
import { ROUND_GUY } from "../../characters/guyLooks";
import { easeInOut, lerp } from "../../kit/math";
import { offscreen } from "../../kit/texture";
import { H, W } from "../../scene/layout";
import { poseAt } from "../../scene/motion";
import { drawFrame } from "../../TypingScene";

const FRAME = 20;
const FACE = 400; // output size of each close-up
const FACE_SRC = 290; // source crop size around the head
const BODY = { x: 420, y: 170, w: 680, h: 820 };
const LABEL = 56;
const ORDER: (keyof typeof EXPR)[] = ["deadpan", "grin", "smirk", "suspicious", "surprised"];
export const ROUND_W = FACE * ORDER.length;
export const ROUND_H = LABEL + FACE + LABEL + BODY.h;

const render = (expr: Expr) => {
  const off = offscreen("round-frame", W, H);
  const look = { ...ROUND_GUY, expr };
  drawFrame(off.getContext("2d")!, FRAME, 30, 120, (c, pose) => {
    drawGuyLegs(c, pose, look);
    drawGuyUpper(c, pose, look);
  });
  return off;
};

export const RoundGuySheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.fillStyle = "#1b1614";
    ctx.fillRect(0, 0, ROUND_W, ROUND_H);
    ctx.fillStyle = "#f3ead9";
    ctx.font = "bold 36px sans-serif";
    ctx.textBaseline = "middle";

    // head centre in output pixels (same camera as drawFrame)
    const t = FRAME / 30;
    const zoom = lerp(1.08, 1.13, easeInOut(t / 4));
    const [hx, hy] = roundHeadCenter(poseAt(t));
    const sx = 900 + (hx - 900) * zoom;
    const sy = 560 + (hy - 560) * zoom;

    ORDER.forEach((name, i) => {
      const img = render(EXPR[name]);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx - FACE_SRC / 2, sy - FACE_SRC / 2, FACE_SRC, FACE_SRC, i * FACE, LABEL, FACE, FACE);
      ctx.fillText(String(i + 1), i * FACE + 18, LABEL / 2 + 2);
      ctx.strokeStyle = "#1b1614";
      ctx.lineWidth = 6;
      ctx.strokeRect(i * FACE, LABEL, FACE, FACE);
    });

    const y2 = LABEL + FACE + LABEL;
    const img = render(EXPR.deadpan);
    ctx.drawImage(img, BODY.x, BODY.y, BODY.w, BODY.h, 0, y2, BODY.w, BODY.h);
    const fw = ROUND_W - BODY.w;
    const fh = (fw * H) / W;
    ctx.drawImage(img, 0, 0, W, H, BODY.w, y2 + (BODY.h - fh) / 2, fw, fh);
    ctx.fillStyle = "#f3ead9";
    ctx.fillText("6", 18, y2 - LABEL / 2 + 2);
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={ROUND_W} height={ROUND_H} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
