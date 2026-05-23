import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Hexagon } from "./Hexagon";
import { COLORS } from "../theme";

type Props = {
  layerNumber: string;
  acronym: string;
  fullName: string;
  description: string;
  accent: string;
  hexLabel: string;
  inFrame?: number;
};

export const LayerHero: React.FC<Props> = ({
  layerNumber,
  acronym,
  fullName,
  description,
  accent,
  hexLabel,
  inFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - inFrame;

  const enter = spring({
    fps,
    frame: local,
    config: { damping: 16, stiffness: 90 },
  });
  const opacity = interpolate(local, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hexY = interpolate(enter, [0, 1], [30, 0]);
  const hexScale = interpolate(enter, [0, 1], [0.85, 1]);

  // Slow rotation halo
  const rot = interpolate(frame, [0, 240], [0, 12]);

  return (
    <div
      style={{
        position: "absolute",
        top: 240,
        left: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 28,
        opacity,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 320,
          height: 320,
          transform: `translateY(${hexY}px) scale(${hexScale})`,
        }}
      >
        {/* Halo ring */}
        <div
          style={{
            position: "absolute",
            inset: -30,
            transform: `rotate(${rot}deg)`,
          }}
        >
          <Hexagon
            size={380}
            fill="transparent"
            stroke={`${accent}55`}
            strokeWidth={1}
          />
        </div>
        {/* Outer ring */}
        <Hexagon
          size={320}
          fill={`${accent}15`}
          stroke={accent}
          strokeWidth={2}
          glow
        />
        {/* Inner label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: COLORS.ink,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: accent,
              letterSpacing: 4,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {layerNumber}
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>
            {hexLabel}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 360 }}>
        <div
          style={{
            color: accent,
            fontFamily: "Inter, sans-serif",
            fontSize: 16,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {acronym}
        </div>
        <div
          style={{
            color: COLORS.ink,
            fontFamily: "Inter, sans-serif",
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: -0.5,
            marginTop: 6,
            lineHeight: 1.1,
          }}
        >
          {fullName}
        </div>
        <div
          style={{
            color: COLORS.inkDim,
            fontFamily: "Inter, sans-serif",
            fontSize: 20,
            marginTop: 14,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
