export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const COLORS = {
  bg: "#0E1116",
  bgWarm: "#141821",
  ink: "#F4F0E8",
  inkDim: "rgba(244, 240, 232, 0.55)",
  inkFaint: "rgba(244, 240, 232, 0.18)",
  gold: "#F5C26B",
  seo: "#3FB67A",
  aeo: "#4A8FE7",
  geo: "#9B7AE6",
  card: "#1B2030",
  cardEdge: "rgba(244, 240, 232, 0.10)",
} as const;

export const DUR = {
  scene04: 5 * FPS,
  scene05: 11 * FPS,
  scene06: 8 * FPS,
  scene07: 8 * FPS,
  scene08: 7 * FPS,
  scene09: 10 * FPS,
  closing: 4 * FPS,
};

export const TOTAL =
  DUR.scene04 +
  DUR.scene05 +
  DUR.scene06 +
  DUR.scene07 +
  DUR.scene08 +
  DUR.scene09 +
  DUR.closing;
