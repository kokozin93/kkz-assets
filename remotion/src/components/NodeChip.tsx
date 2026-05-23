import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

export const NodeChip: React.FC<{
  label: string;
  inFrame: number;
  accent: string;
}> = ({ label, inFrame, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - inFrame;
  const s = spring({
    fps,
    frame: local,
    config: { damping: 14, stiffness: 110 },
  });
  const opacity = interpolate(local, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(s, [0, 1], [30, 0]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "18px 24px",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${COLORS.cardEdge}`,
        borderRadius: 14,
        opacity,
        transform: `translateX(${x}px)`,
        width: 460,
        boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: accent,
          boxShadow: `0 0 10px ${accent}`,
        }}
      />
      <div
        style={{
          color: COLORS.ink,
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          fontSize: 24,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
    </div>
  );
};
