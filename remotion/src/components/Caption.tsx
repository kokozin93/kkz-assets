import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

type Props = {
  text: string;
  inFrame: number;
  outFrame?: number;
  size?: number;
  color?: string;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  weight?: number;
  uppercase?: boolean;
  style?: React.CSSProperties;
};

export const Caption: React.FC<Props> = ({
  text,
  inFrame,
  outFrame,
  size = 36,
  color = COLORS.ink,
  align = "center",
  letterSpacing = 0,
  weight = 500,
  uppercase,
  style,
}) => {
  const frame = useCurrentFrame();
  const local = frame - inFrame;
  const opacityIn = interpolate(local, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translate = interpolate(local, [0, 14], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacityOut = outFrame
    ? interpolate(frame - outFrame, [0, 12], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <div
      style={{
        opacity: opacityIn * opacityOut,
        transform: `translateY(${translate}px)`,
        fontFamily: "Inter, sans-serif",
        color,
        fontSize: size,
        fontWeight: weight,
        letterSpacing,
        textAlign: align,
        textTransform: uppercase ? "uppercase" : "none",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
