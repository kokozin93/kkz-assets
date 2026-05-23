import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_DISPLAY } from "../theme";

type Props = {
  index: number; // 0, 1, 2 — for ordering and float phase
  label: string;
  inFrame: number;
  accent: string;
  glyph: React.ReactNode;
  // Optional small index badge ("01", "02", "03")
  ordinal: string;
};

// A floating "paper card" with:
//   1. SLAB (drops in, settles with subtle spring)
//   2. ACCENT STRIPE (sweeps across bottom edge)
//   3. GLYPH (reveals with its own internal motion — driven by inFrame + 12)
//   4. LABEL (rises with slight stagger)
//   5. ORDINAL BADGE (small "01" chip pops at the end)
// Then continuous gentle float + parallax tilt.
export const SearchCard: React.FC<Props> = ({
  index,
  label,
  inFrame,
  accent,
  glyph,
  ordinal,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - inFrame;

  // Card drop-in
  const drop = spring({
    fps,
    frame: local,
    config: { damping: 20, stiffness: 110, mass: 0.9 },
  });
  const cardOpacity = interpolate(local, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(drop, [0, 1], [60, 0]);
  const cardScale = interpolate(drop, [0, 1], [0.94, 1]);

  // Continuous gentle float (after settle)
  const settled = Math.max(0, local - 28);
  const floatY = Math.sin((settled + index * 25) / 40) * 6;
  const floatRot = Math.sin((settled + index * 30) / 55) * 0.5;

  // Bottom accent stripe wipe
  const stripeProg = interpolate(local, [10, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Label rise (after card lands)
  const labelOpacity = interpolate(local, [22, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelY = interpolate(local, [22, 38], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ordinal badge pop
  const badgeSpring = spring({
    fps,
    frame: local - 34,
    config: { damping: 16, stiffness: 160 },
  });
  const badgeOpacity = interpolate(local, [34, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.6, 1]);

  return (
    <div
      style={{
        position: "relative",
        transform: `translateY(${cardY + floatY}px) scale(${cardScale}) rotate(${floatRot}deg)`,
        opacity: cardOpacity,
        transformOrigin: "center center",
      }}
    >
      {/* Card shadow (separate so we can blur/offset independently) */}
      <div
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          bottom: -30,
          height: 50,
          borderRadius: 999,
          background: "rgba(60, 40, 18, 0.25)",
          filter: "blur(28px)",
          opacity: 0.8,
        }}
      />
      <div
        style={{
          width: 420,
          height: 320,
          borderRadius: 26,
          background: `linear-gradient(180deg, ${COLORS.cardLight} 0%, ${COLORS.card} 100%)`,
          border: `1px solid ${COLORS.cardEdge}`,
          boxShadow:
            "0 30px 60px rgba(78, 56, 30, 0.18), inset 0 1px 0 rgba(255,255,255,0.6)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 40px",
          gap: 28,
        }}
      >
        {/* Glyph */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {glyph}
        </div>
        {/* Label */}
        <div
          style={{
            opacity: labelOpacity,
            transform: `translateY(${labelY}px)`,
            fontFamily: FONT_DISPLAY,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.ink,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>

        {/* Bottom accent stripe */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 10,
            background: accent,
            transform: `scaleX(${stripeProg})`,
            transformOrigin: "left center",
          }}
        />

        {/* Ordinal badge */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 22,
            opacity: badgeOpacity,
            transform: `scale(${badgeScale})`,
            fontFamily: FONT_DISPLAY,
            fontSize: 13,
            letterSpacing: 3,
            color: COLORS.goldDeep,
            fontWeight: 700,
            background: "rgba(201, 168, 118, 0.14)",
            border: `1px solid ${COLORS.gold}55`,
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          {ordinal}
        </div>
      </div>
    </div>
  );
};
