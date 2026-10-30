import React from "react";
import { Composition } from "remotion";
import phoneTl from "./cuts/phoneScroll/timeline.json";
import { PhoneScroll } from "./cuts/phoneScroll/PhoneScroll";
import timeline from "./timeline.json";
import { TypingScene } from "./TypingScene";
import { CharacterSheet, SHEET_H, SHEET_W } from "./cuts/characterSheet/CharacterSheet";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TypingScene"
      component={TypingScene}
      durationInFrames={Math.round(timeline.duration * timeline.fps)}
      fps={timeline.fps}
      width={1920}
      height={1080}
    />
    <Composition
      id="PhoneScroll"
      component={PhoneScroll}
      durationInFrames={Math.round(phoneTl.duration * phoneTl.fps)}
      fps={phoneTl.fps}
      width={1920}
      height={1080}
    />
    <Composition id="CharacterSheet" component={CharacterSheet} durationInFrames={1} fps={30} width={SHEET_W} height={SHEET_H} />
  </>
);
