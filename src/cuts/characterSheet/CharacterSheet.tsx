// One still image comparing the five male-student designs in the bedroom set
// (plus the current girl for scale). Rendered as a single still to keep the
// cost of a design review low.

import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { drawGuyLegs, drawGuyUpper } from "../../characters/guy";
import { GUY_LOOKS } from "../../characters/guyLooks";
import { offscreen } from "../../kit/texture";
import { H, W } from "../../scene/layout";
import { CharacterDrawer, drawFrame } from "../../TypingScene";

// crop of the rendered frame around the character (output pixels)
const CROP = { x: 420, y: 170, w: 680, h: 820 };
const COLS = 3;
const LABEL = 56;
export const SHEET_W = CROP.w * COLS;
export const SHEET_H = (CROP.h + LABEL) * 2;
const FRAME = 20; // mid-typing, eyes open

export const CharacterSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.fillStyle = "#1b1614";
    ctx.fillRect(0, 0, SHEET_W, SHEET_H);
    const panels: { id: string; draw?: CharacterDrawer }[] = [
      ...GUY_LOOKS.map(({ id, look }) => ({
        id,
        draw: ((c, pose) => {
          drawGuyLegs(c, pose, look);
          drawGuyUpper(c, pose, look);
        }) as CharacterDrawer,
      })),
      { id: "ref" },
    ];
    panels.forEach((p, i) => {
      const off = offscreen("sheet-frame", W, H);
      const octx = off.getContext("2d")!;
      drawFrame(octx, FRAME, 30, 120, p.draw);
      const x = (i % COLS) * CROP.w;
      const y = Math.floor(i / COLS) * (CROP.h + LABEL);
      ctx.drawImage(off, CROP.x, CROP.y, CROP.w, CROP.h, x, y + LABEL, CROP.w, CROP.h);
      ctx.fillStyle = "#f3ead9";
      ctx.font = "bold 40px sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(p.id === "ref" ? "REF" : p.id, x + 22, y + LABEL / 2 + 2);
      ctx.strokeStyle = "#1b1614";
      ctx.lineWidth = 6;
      ctx.strokeRect(x, y + LABEL, CROP.w, CROP.h);
    });
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={SHEET_W} height={SHEET_H} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
