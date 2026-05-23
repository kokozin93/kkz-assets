import { COLORS } from "../theme";

type Props = {
  size: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  glow?: boolean;
};

const points = (size: number) => {
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

export const Hexagon: React.FC<Props> = ({
  size,
  fill = COLORS.card,
  stroke = COLORS.cardEdge,
  strokeWidth = 2,
  label,
  glow,
}) => {
  return (
    <svg
      width={size}
      height={size}
      style={{
        filter: glow
          ? `drop-shadow(0 0 40px ${stroke}) drop-shadow(0 0 18px ${stroke})`
          : undefined,
      }}
    >
      <polygon
        points={points(size)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {label ? (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill={COLORS.ink}
          fontSize={size * 0.18}
          fontWeight={700}
          letterSpacing={size * 0.01}
          fontFamily="Inter, sans-serif"
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
};
