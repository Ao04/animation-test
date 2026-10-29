// World layout (1920x1080 design space) and colour palette.

import { Pt } from "../kit/math";

export const W = 1920;
export const H = 1080;

export const FLOOR_Y = 1002;
export const DESK = { x: 790, y: 640, w: 985, th: 28 };
export const LAPTOP = { x0: 836, x1: 1150, top: 621, th: 18, hinge: [1143, 630] as Pt, lidLen: 262, lidTh: 16, lidAngle: 0.17 };
export const KEY_Y = LAPTOP.top; // the key surface the fingertips land on
export const CHAIR = { x0: 487, x1: 694, seatY: 742, seatTh: 22, postX: 494, postTop: 452 };
export const LAMP = { x: 1612, baseY: 637, shadeTop: 395, shadeBot: 478 };
export const WINDOW = { x0: 950, x1: 1472, y0: 58, y1: 556 };
export const POSTER = { x: 610, y: 96, w: 300, h: 196, rot: -0.025 };
export const MUG = { x: 1408, y: 640 };

export const HIP: Pt = [608, 712];
export const BASE_LEAN = 0.2; // radians, torso leaning towards the laptop
export const NEAR_WRIST: Pt = [866, 592];
export const FAR_WRIST: Pt = [896, 585];

export const C = {
  ink: "#2a201c",
  wall: "#b9aa95",
  wallDark: "#a6967f",
  frame: "#e6dfd2",
  floor: "#6a4f3e",
  floorDark: "#57402f",
  base: "#d9d0c0",
  sky0: "#10183a",
  sky1: "#26315c",
  hills: "#1a2244",
  roofs: "#151c3a",
  moon: "#f6e2ae",
  poster: "#e1b85a",
  posterInk: "#2e2b4d",
  wood: "#a06f47",
  woodDark: "#835736",
  woodLight: "#b88457",
  chair: "#7a5135",
  chairDark: "#5f3e28",
  alu: "#cfccc7",
  aluDark: "#a9a5a0",
  screen: "#d6e6ff",
  lampShade: "#f0dcb0",
  lampMetal: "#8a7a66",
  bookRed: "#b4473a",
  bookBlue: "#4e6277",
  page: "#efe6d4",
  mug: "#e9e3d8",
  // character
  skin: "#e3b08f",
  skinShade: "#c99676",
  blush: "rgba(222,120,110,0.28)",
  hair: "#2c221e",
  hairHi: "#3d302a",
  hoodie: "#f3f0ea",
  hoodieShade: "#d8d2c8",
  hoodieDeep: "#c3bcb1",
  pants: "#27242b",
  pantsShade: "#1d1a20",
  shoe: "#f1eee8",
  sole: "#bdb6ab",
};
