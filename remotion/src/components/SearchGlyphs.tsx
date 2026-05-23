import { useCurrentFrame, interpolate } from "remotion";

export const GoogleGlyph: React.FC<{ size: number }> = ({ size }) => {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4285F4" />
          <stop offset="0.33" stopColor="#34A853" />
          <stop offset="0.66" stopColor="#FBBC05" />
          <stop offset="1" stopColor="#EA4335" />
        </linearGradient>
      </defs>
      <path
        d="M50 14a36 36 0 1 0 34 47H52V47h44a40 40 0 0 1-46 53A40 40 0 1 1 50 14z"
        fill="url(#gg)"
      />
    </svg>
  );
};

export const SiriGlyph: React.FC<{ size: number; animated?: boolean }> = ({
  size,
  animated,
}) => {
  const frame = useCurrentFrame();
  const bars = 7;
  const heights = Array.from({ length: bars }).map((_, i) => {
    const phase = (frame / 6) + i * 0.7;
    const h = animated ? 0.3 + 0.65 * Math.abs(Math.sin(phase)) : 0.5;
    return h;
  });
  const stroke = "#A78BFA";

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F471B5" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      {heights.map((h, i) => {
        const w = 6;
        const gap = 4;
        const totalW = bars * w + (bars - 1) * gap;
        const x = (100 - totalW) / 2 + i * (w + gap);
        const barH = h * 70;
        const y = (100 - barH) / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={barH}
            rx={3}
            fill="url(#sg)"
            stroke={stroke}
            strokeOpacity={0.2}
          />
        );
      })}
    </svg>
  );
};

export const ChatGPTGlyph: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const spin = interpolate(frame, [0, 240], [0, 360]);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10A37F" />
          <stop offset="1" stopColor="#4ADE80" />
        </linearGradient>
      </defs>
      <g transform={`rotate(${spin} 50 50)`}>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse
            key={deg}
            cx="50"
            cy="50"
            rx="36"
            ry="14"
            fill="none"
            stroke="url(#cg)"
            strokeWidth="3.5"
            transform={`rotate(${deg} 50 50)`}
            opacity={0.85}
          />
        ))}
        <circle cx="50" cy="50" r="8" fill="#0E1116" />
        <circle cx="50" cy="50" r="6" fill="url(#cg)" />
      </g>
    </svg>
  );
};
