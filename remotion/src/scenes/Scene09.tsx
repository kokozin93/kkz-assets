import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Hexagon } from "../components/Hexagon";
import { Caption } from "../components/Caption";
import { COLORS, FPS } from "../theme";

// Scene 09 — The Result (Venn). 10s = 300 frames.
// VO: "Three layers. One program. Tracked monthly. Managed end to end.
//      So no matter how your next customer searches — they find you first."

export const Scene09: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase A: 3 separate circles (drift outward)
  // Phase B: converge to overlap (frame 90 → 180)
  // Phase C: SAGE hex emerges (frame 200+)
  const converge = spring({
    fps,
    frame: frame - 90,
    config: { damping: 22, stiffness: 50, mass: 1.4 },
  });

  // Outer positions (apart) → inner positions (Venn)
  const outerSpread = 320;
  const innerSpread = 110;
  const spread = interpolate(converge, [0, 1], [outerSpread, innerSpread]);

  const cx = 960;
  const cy = 480;
  // Triangle: SEO top, AEO bottom-left, GEO bottom-right
  const topY = cy - spread * 0.6;
  const blX = cx - spread * 0.7;
  const brX = cx + spread * 0.7;
  const botY = cy + spread * 0.4;

  const circleR = 220;

  const drawIn = (offset: number) =>
    interpolate(frame - offset, [0, 24], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const sageEmerge = spring({
    fps,
    frame: frame - 200,
    config: { damping: 16, stiffness: 90 },
  });
  const sageOpacity = interpolate(frame, [200, 230], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sageScale = interpolate(sageEmerge, [0, 1], [0.4, 1]);

  return (
    <AbsoluteFill>
      <Backdrop tint="rgba(245, 194, 107, 0.10)" />
      <SceneTag />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Caption
          text="THE RESULT"
          inFrame={6}
          size={22}
          color={COLORS.gold}
          letterSpacing={6}
          weight={600}
          uppercase
        />
        <div style={{ height: 12 }} />
        <Caption
          text="Three layers. One program."
          inFrame={14}
          size={56}
          color={COLORS.ink}
          weight={600}
          letterSpacing={-1}
        />
      </div>

      {/* Venn diagram */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
        </defs>

        {/* SEO — top */}
        <VennCircle
          cx={cx}
          cy={topY}
          r={circleR}
          color={COLORS.seo}
          inFrame={30}
          opacity={drawIn(30)}
          label="SEO"
        />
        {/* AEO — bottom-left */}
        <VennCircle
          cx={blX}
          cy={botY}
          r={circleR}
          color={COLORS.aeo}
          inFrame={60}
          opacity={drawIn(60)}
          label="AEO"
        />
        {/* GEO — bottom-right */}
        <VennCircle
          cx={brX}
          cy={botY}
          r={circleR}
          color={COLORS.geo}
          inFrame={90}
          opacity={drawIn(90)}
          label="GEO"
        />
      </svg>

      {/* SAGE hexagon at convergence center */}
      <div
        style={{
          position: "absolute",
          left: cx - 80,
          top: cy - 80,
          width: 160,
          height: 160,
          opacity: sageOpacity,
          transform: `scale(${sageScale})`,
          transformOrigin: "center",
        }}
      >
        <Hexagon
          size={160}
          fill={COLORS.gold}
          stroke="#FBD89B"
          strokeWidth={3}
          label="SAGE"
          glow
        />
      </div>

      {/* Tagline lockup */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Caption
          text="Tracked monthly. Managed end to end."
          inFrame={230}
          size={28}
          color={COLORS.inkDim}
          weight={400}
        />
        <div style={{ height: 16 }} />
        <Caption
          text="No matter how they search — they find you first."
          inFrame={250}
          size={36}
          color={COLORS.ink}
          weight={600}
          letterSpacing={-0.5}
        />
      </div>
    </AbsoluteFill>
  );
};

const VennCircle: React.FC<{
  cx: number;
  cy: number;
  r: number;
  color: string;
  inFrame: number;
  opacity: number;
  label: string;
}> = ({ cx, cy, r, color, opacity, label }) => {
  const frame = useCurrentFrame();
  // Label fades out as the SAGE hex emerges, since labels live near the center
  const labelOpacity = interpolate(frame, [180, 210], [1, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Position label OUTSIDE the venn area, along the radius from the venn center
  const vennCenter = { x: 960, y: 480 };
  const dx = cx - vennCenter.x;
  const dy = cy - vennCenter.y;
  const dist = Math.hypot(dx, dy) || 1;
  const labelX = cx + (dx / dist) * (r + 30);
  const labelY = cy + (dy / dist) * (r + 30);

  return (
    <g style={{ opacity }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeWidth={2.5}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={32}
        fontWeight={700}
        fontFamily="Inter, sans-serif"
        letterSpacing={3}
        opacity={labelOpacity}
      >
        {label}
      </text>
    </g>
  );
};

const SceneTag: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, FPS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 80,
        fontFamily: "Inter, sans-serif",
        fontSize: 16,
        color: COLORS.inkDim,
        letterSpacing: 4,
        opacity,
      }}
    >
      09 · THE RESULT
    </div>
  );
};
