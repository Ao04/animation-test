// Five design proposals for the male student (21). Same rig, different look.

import { GuyLook } from "./guy";

const skin = { skin: "#e3b393", skinShade: "#c99878", skinFar: "#b98a6c" };

export const GUY_LOOKS: { id: string; look: GuyLook }[] = [
  {
    id: "1",
    look: {
      ...skin,
      hair: "#24201f",
      hairStyle: "short",
      top: "hoodie",
      main: "#8e9198",
      shade: "#767980",
      deep: "#5f6168",
      pants: "#2a282d",
      pantsShade: "#1f1d22",
      shoe: "#efece6",
      sole: "#bdb6ab",
    },
  },
  {
    id: "2",
    look: {
      ...skin,
      hair: "#2a2320",
      hairStyle: "centre",
      top: "overshirt",
      main: "#b59b74",
      shade: "#9a8160",
      deep: "#7d684c",
      inner: "#f1eee8",
      pants: "#4a4c52",
      pantsShade: "#3a3c42",
      shoe: "#2c2a2c",
      sole: "#e6e1d8",
    },
  },
  {
    id: "3",
    look: {
      ...skin,
      hair: "#3a2a22",
      hairStyle: "perm",
      top: "knit",
      main: "#dccbb0",
      shade: "#c2af93",
      deep: "#a8957a",
      pants: "#4b3a30",
      pantsShade: "#3b2d25",
      shoe: "#efece6",
      sole: "#bdb6ab",
    },
  },
  {
    id: "4",
    look: {
      ...skin,
      hair: "#1f1d1e",
      hairStyle: "sidePart",
      top: "cardigan",
      main: "#34405f",
      shade: "#2a344f",
      deep: "#1f2740",
      inner: "#f1eee8",
      pants: "#c3b293",
      pantsShade: "#a8987b",
      shoe: "#5a3d2c",
      sole: "#3b2b22",
      glasses: true,
    },
  },
  {
    id: "5",
    look: {
      skin: "#cf9a78",
      skinShade: "#b48163",
      skinFar: "#a37458",
      hair: "#1d1b1b",
      hairStyle: "twoBlock",
      top: "crew",
      main: "#5a6449",
      shade: "#4a533c",
      deep: "#3a4230",
      pants: "#232226",
      pantsShade: "#1a191c",
      shoe: "#efece6",
      sole: "#bdb6ab",
      stubble: true,
    },
  },
];

// Chosen direction: short side part (flat, reference style) + design 1 clothing.
const base = GUY_LOOKS[0].look;
export const MAIN_GUY: GuyLook = { ...base, hair: "#1f1d1e", hairStyle: "sidePart", flatHair: true };
export const MAIN_GUY_GLASSES: GuyLook = { ...MAIN_GUY, glasses: true };
