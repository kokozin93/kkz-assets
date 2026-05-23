export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Brand-aligned palette (SAGE by Brandcore).
// Cream paper backdrop. Black hex mark. Warm gold supertitle.
// Sage / slate / mauve layer accents.
export const COLORS = {
  bg: "#EFE4CF",
  bgWarm: "#F4EBDA",
  bgDeep: "#E5D8BF",
  ink: "#1A1A1A",
  inkSoft: "#2F2A22",
  inkDim: "rgba(26, 26, 26, 0.55)",
  inkFaint: "rgba(26, 26, 26, 0.18)",
  inkGhost: "rgba(26, 26, 26, 0.08)",
  gold: "#C9A876",
  goldDeep: "#A88A5C",
  seo: "#A8B89E",
  aeo: "#9BB1C8",
  geo: "#BCA9C8",
  card: "#F7EFDC",
  cardLight: "#FBF5E6",
  cardEdge: "rgba(26, 26, 26, 0.10)",
  hexBlack: "#1A1A1A",
} as const;

export const FONT_DISPLAY = `"Inter Tight", "Inter", system-ui, sans-serif`;
export const FONT_BODY = `"Inter", system-ui, sans-serif`;

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
