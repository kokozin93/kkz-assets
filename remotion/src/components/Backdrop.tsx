import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

type Props = {
  tint?: string;
};

export const Backdrop: React.FC<Props> = ({ tint }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 140) * 14;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      {/* Warm radial glow drifting */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(1400px 1000px at ${50 + drift}% 35%, ${
            COLORS.bgWarm
          }, transparent 65%)`,
        }}
      />
      {/* Subtle directional warm light */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(900px 900px at 80% 110%, ${
            COLORS.bgDeep
          }, transparent 60%)`,
          opacity: 0.6,
        }}
      />
      {tint ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(800px 600px at 50% 50%, ${tint}, transparent 70%)`,
          }}
        />
      ) : null}
      <PaperGrain />
      <Vignette />
    </AbsoluteFill>
  );
};

// SVG-based subtle paper grain (cheap, no external assets).
const PaperGrain: React.FC = () => {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, opacity: 0.18, mixBlendMode: "multiply" }}
    >
      <defs>
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="7"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.4
                    0 0 0 0 0.32
                    0 0 0 0 0.2
                    0 0 0 0.35 0"
          />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
};

const Vignette: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(1600px 1000px at 50% 50%, transparent 60%, rgba(72, 56, 32, 0.18) 100%)",
      pointerEvents: "none",
    }}
  />
);
