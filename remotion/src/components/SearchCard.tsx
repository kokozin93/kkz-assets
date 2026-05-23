import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

type Props = {
  label: string;
  sublabel?: string;
  glyph: React.ReactNode;
  inFrame: number;
  dimAfter?: number;
  accent?: string;
};

export const SearchCard: React.FC<Props> = ({
  label,
  sublabel,
  glyph,
  inFrame,
  dimAfter,
  accent = COLORS.gold,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - inFrame;

  const enter = spring({
    fps,
    frame: local,
    config: { damping: 14, stiffness: 110, mass: 0.7 },
  });

  const opacity = interpolate(local, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translate = interpolate(enter, [0, 1], [40, 0]);
  const scale = interpolate(enter, [0, 1], [0.92, 1]);

  let dim = 1;
  if (dimAfter !== undefined) {
    dim = interpolate(frame - dimAfter, [0, 20], [1, 0.18], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  return (
    <div
      style={{
        opacity: opacity * (dim === 1 ? 1 : 1),
        filter: dim < 1 ? `grayscale(${1 - dim}) brightness(${0.5 + dim * 0.5})` : undefined,
        transform: `translateY(${translate}px) scale(${scale})`,
        background: `linear-gradient(180deg, ${COLORS.card} 0%, #161B27 100%)`,
        border: `1px solid ${COLORS.cardEdge}`,
        borderRadius: 28,
        padding: "44px 48px",
        width: 380,
        height: 460,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: opacity * dim,
        }}
      />
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${COLORS.cardEdge}`,
        }}
      >
        {glyph}
      </div>
      <div>
        <div
          style={{
            fontSize: 20,
            color: COLORS.inkDim,
            fontFamily: "Inter, sans-serif",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {sublabel ?? "Search"}
        </div>
        <div
          style={{
            fontSize: 52,
            color: COLORS.ink,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};
