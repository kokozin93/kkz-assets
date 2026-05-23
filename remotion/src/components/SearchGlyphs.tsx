import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

type Props = {
  size: number;
  inFrame?: number;
  accent?: string;
};

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

// Stroke-draw helper based on dasharray + dashoffset.
const draw = (progress: number, length: number) => ({
  strokeDasharray: length,
  strokeDashoffset: length * (1 - progress),
});

// ─────────────────────────────────────────────────────────────────────────────
// Google — a rounded search bar with a magnifying glass and a typing cursor.
// Stroke draws in, then a cursor blinks while a tiny query bar fills.
// ─────────────────────────────────────────────────────────────────────────────
export const GoogleGlyph: React.FC<Props> = ({ size, inFrame = 0, accent = COLORS.ink }) => {
  const frame = useCurrentFrame();
  const local = frame - inFrame;
  const t = Math.min(1, Math.max(0, local / 22));
  const p = easeOutQuint(t);

  // Cursor blink starts after the bar is drawn
  const cursorOn = local > 24 && Math.floor((local - 24) / 7) % 2 === 0;
  const queryW = interpolate(local, [28, 58], [0, 52], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const barLen = 2 * (110 + 36); // rough perimeter
  const lensCirc = 2 * Math.PI * 11;

  return (
    <svg viewBox="0 0 200 80" width={size} height={size * 0.4} overflow="visible">
      {/* Search bar pill */}
      <rect
        x="6"
        y="14"
        width="188"
        height="52"
        rx="26"
        ry="26"
        fill="none"
        stroke={accent}
        strokeWidth="2.5"
        {...draw(p, barLen)}
      />
      {/* Magnifier */}
      <g style={{ opacity: interpolate(local, [10, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <circle
          cx="32"
          cy="40"
          r="11"
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          {...draw(p, lensCirc)}
        />
        <line
          x1="40"
          y1="48"
          x2="50"
          y2="58"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      {/* Cursor + query bar */}
      <g>
        <rect
          x={56}
          y={32}
          width={queryW}
          height={16}
          rx={4}
          fill={accent}
          opacity={0.18}
        />
        {cursorOn ? (
          <rect
            x={56 + queryW}
            y={28}
            width={2}
            height={24}
            fill={accent}
          />
        ) : null}
      </g>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Voice — a smooth sine wave that morphs in shape and amplitude.
// ─────────────────────────────────────────────────────────────────────────────
export const VoiceGlyph: React.FC<Props> = ({ size, inFrame = 0, accent = COLORS.ink }) => {
  const frame = useCurrentFrame();
  const local = frame - inFrame;

  const reveal = interpolate(local, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Build a sine wave path. Animate phase + amplitude envelope.
  const w = 200;
  const h = 80;
  const samples = 64;
  const phase = local / 7;
  const ampBase = 18;
  // Amplitude envelope (settles into smaller amplitude after entry)
  const ampScale = interpolate(local, [0, 28, 60], [0, 1.15, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let path = "";
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * w;
    // Layered sines for richer shape
    const y =
      h / 2 +
      Math.sin((i / samples) * Math.PI * 2.2 + phase) * ampBase * ampScale +
      Math.sin((i / samples) * Math.PI * 4.4 + phase * 1.3) * 6 * ampScale;
    path += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }

  const totalLen = w * 1.4; // approximate

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size} height={size * 0.4} overflow="visible">
      {/* Soft shadow line */}
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeOpacity={0.18}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0, 4)"
      />
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(reveal, totalLen)}
      />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AI — a hexagonal node network. Center hex with 6 surrounding nodes.
// Edges draw in; nodes pop with stagger; faint pulses propagate outward.
// ─────────────────────────────────────────────────────────────────────────────
export const AIGlyph: React.FC<Props> = ({ size, inFrame = 0, accent = COLORS.ink }) => {
  const frame = useCurrentFrame();
  const local = frame - inFrame;

  const cx = 100;
  const cy = 40;
  const r = 36;
  const hexR = 9;

  // Surrounding nodes
  const surrounding = Array.from({ length: 6 }).map((_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  // Edges draw in 0 → 22 frames
  const edgeDraw = interpolate(local, [4, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Center hex pop
  const centerScale = interpolate(local, [16, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulse propagation
  const pulsePhase = (local % 60) / 60;

  const edgeLen = r * 1.15;

  return (
    <svg viewBox="55 0 90 80" width={size * 0.65} height={size * 0.58} overflow="visible">
      {/* Edges */}
      {surrounding.map((p, i) => {
        const enterDelay = i * 2;
        const drawProgress = interpolate(local - enterDelay, [4, 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={accent}
            strokeWidth={1.4}
            strokeOpacity={0.55}
            {...draw(drawProgress, edgeLen)}
          />
        );
      })}

      {/* Pulse ring along edges */}
      {edgeDraw > 0.6
        ? surrounding.map((p, i) => {
            const t = (pulsePhase + i / 6) % 1;
            const px = cx + (p.x - cx) * t;
            const py = cy + (p.y - cy) * t;
            return (
              <circle
                key={`pulse-${i}`}
                cx={px}
                cy={py}
                r={1.6}
                fill={accent}
                opacity={1 - t}
              />
            );
          })
        : null}

      {/* Surrounding hex nodes */}
      {surrounding.map((p, i) => {
        const nodeScale = interpolate(local - i * 2, [10, 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <g key={`node-${i}`} transform={`translate(${p.x}, ${p.y}) scale(${nodeScale})`}>
            <polygon
              points={hexLocal(hexR)}
              fill={accent}
              opacity={0.92}
            />
          </g>
        );
      })}

      {/* Center hex */}
      <g transform={`translate(${cx}, ${cy}) scale(${centerScale})`}>
        <polygon
          points={hexLocal(hexR * 1.5)}
          fill={accent}
          stroke={accent}
          strokeWidth={1}
        />
      </g>
    </svg>
  );
};

const hexLocal = (r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
};
