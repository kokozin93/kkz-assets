import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

export const Backdrop: React.FC<{ tint?: string }> = ({ tint }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 30;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(1200px 800px at ${50 + drift / 6}% 30%, ${
            tint ?? "rgba(245, 194, 107, 0.10)"
          }, transparent 60%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(900px 600px at 20% 90%, rgba(74, 143, 231, 0.06), transparent 60%)",
        }}
      />
      <Grid />
      <Vignette />
    </AbsoluteFill>
  );
};

const Grid: React.FC = () => {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, opacity: 0.08 }}
    >
      <defs>
        <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
          <path
            d="M 80 0 L 0 0 0 80"
            fill="none"
            stroke={COLORS.ink}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
};

const Vignette: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(1400px 900px at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)",
      pointerEvents: "none",
    }}
  />
);
