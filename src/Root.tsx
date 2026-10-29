import React from "react";
import { Composition } from "remotion";
import timeline from "./timeline.json";
import { TypingScene } from "./TypingScene";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="TypingScene"
    component={TypingScene}
    durationInFrames={Math.round(timeline.duration * timeline.fps)}
    fps={timeline.fps}
    width={1920}
    height={1080}
  />
);
