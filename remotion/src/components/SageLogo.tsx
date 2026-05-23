import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT_DISPLAY } from "../theme";

type Props = {
  inFrame?: number;
  size?: number;
  variant?: "lockup" | "mark";
};

const hexPoints = (size: number) => {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
};

export const SageLogo: React.FC<Props> = ({ inFrame = 0, size = 56, variant = "lockup" }) => {
  const frame = useCurrentFrame();
  const local = frame - inFrame;
  const opacity = interpolate(local, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lift = interpolate(local, [0, 22], [4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity,
        transform: `translateY(${lift}px)`,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon
          points={hexPoints(size)}
          fill={COLORS.hexBlack}
          stroke={COLORS.goldDeep}
          strokeWidth={2}
        />
        {/* Inner sage S mark */}
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <path
            d="M-7 -8 C-7 -12, -1 -12, -1 -8 C-1 -4, -7 -4, -7 0 C-7 4, -1 4, -1 8 C-1 12, -7 12, -7 8"
            fill="none"
            stroke={COLORS.gold}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </g>
      </svg>
      {variant === "lockup" ? (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: size * 0.46,
              fontWeight: 700,
              letterSpacing: 2,
              color: COLORS.ink,
            }}
          >
            SAGE
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: size * 0.2,
              fontWeight: 400,
              color: COLORS.inkDim,
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            by Brandcore
          </div>
        </div>
      ) : null}
    </div>
  );
};
