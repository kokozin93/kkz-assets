import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Caption } from "../components/Caption";
import { COLORS } from "../theme";

// Closing — 4s = 120 frames. SAGE. By Brandcore.

export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 90 },
  });
  const scale = interpolate(s, [0, 1], [0.9, 1]);
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Backdrop tint="rgba(245, 194, 107, 0.10)" />

      {/* Logo wordmark */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 24,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: 160,
              fontWeight: 700,
              color: COLORS.ink,
              letterSpacing: -6,
              lineHeight: 1,
            }}
          >
            SAGE
          </div>
          <div
            style={{
              fontSize: 40,
              color: COLORS.inkDim,
              fontWeight: 300,
            }}
          >
            by Brandcore
          </div>
        </div>

        <div style={{ height: 50 }} />

        <Caption
          text="Find out where your business stands."
          inFrame={28}
          size={28}
          color={COLORS.inkDim}
          weight={400}
        />

        <div style={{ height: 28 }} />

        <CTAButton inFrame={50} />
      </div>

      {/* Bottom URL */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
          color: COLORS.gold,
          fontSize: 18,
          letterSpacing: 4,
          opacity,
        }}
      >
        BRANDCORE.SG
      </div>
    </AbsoluteFill>
  );
};

const CTAButton: React.FC<{ inFrame: number }> = ({ inFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    fps,
    frame: frame - inFrame,
    config: { damping: 14, stiffness: 130 },
  });
  const opacity = interpolate(frame - inFrame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(s, [0, 1], [0.9, 1]);

  return (
    <div
      style={{
        padding: "20px 40px",
        borderRadius: 999,
        background: COLORS.gold,
        color: COLORS.bg,
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: 1,
        opacity,
        transform: `scale(${scale})`,
        boxShadow: "0 20px 60px rgba(245, 194, 107, 0.35)",
      }}
    >
      Get your SAGE audit →
    </div>
  );
};
