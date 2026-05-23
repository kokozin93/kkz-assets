import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { LayerHero } from "../components/LayerHero";
import { COLORS, FPS } from "../theme";

// Scene 08 — Layer 3, GEO. 7s = 210 frames.
// VO: "And GEO — Generative Engine Optimisation.
//      So ChatGPT, Perplexity, and Gemini recommend your brand by name."

export const Scene08: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop tint={`${COLORS.geo}1F`} />
      <SceneTag />

      <LayerHero
        layerNumber="LAYER 03"
        acronym="GEO"
        fullName="Generative Engine Optimisation"
        description="ChatGPT, Perplexity, and Gemini recommend your brand by name."
        accent={COLORS.geo}
        hexLabel="GEO"
      />

      <PlatformConstellation centerX={1340} centerY={500} />

      <BottomBar percent={1} />
    </AbsoluteFill>
  );
};

const PlatformConstellation: React.FC<{
  centerX: number;
  centerY: number;
}> = ({ centerX, centerY }) => {
  const platforms = [
    { name: "ChatGPT", angle: -90, color: "#10A37F" },
    { name: "Perplexity", angle: 0, color: "#6FA8DC" },
    { name: "Gemini", angle: 90, color: "#F5C26B" },
    { name: "Copilot", angle: 180, color: "#9B7AE6" },
  ];

  return (
    <>
      {/* Connector lines */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {platforms.map((p, i) => {
          const r = 200;
          const a = (p.angle * Math.PI) / 180;
          const x2 = centerX + r * Math.cos(a);
          const y2 = centerY + r * Math.sin(a);
          return (
            <ConnectorLine
              key={p.name}
              x1={centerX}
              y1={centerY}
              x2={x2}
              y2={y2}
              inFrame={36 + i * 12}
              color={p.color}
            />
          );
        })}
      </svg>

      {/* Center node */}
      <div
        style={{
          position: "absolute",
          left: centerX - 36,
          top: centerY - 36,
          width: 72,
          height: 72,
          borderRadius: 36,
          background: COLORS.geo,
          boxShadow: `0 0 40px ${COLORS.geo}, inset 0 0 12px rgba(255,255,255,0.4)`,
        }}
      />

      {/* Platform nodes */}
      {platforms.map((p, i) => {
        const r = 200;
        const a = (p.angle * Math.PI) / 180;
        const x = centerX + r * Math.cos(a);
        const y = centerY + r * Math.sin(a);
        return (
          <PlatformNode
            key={p.name}
            name={p.name}
            color={p.color}
            x={x}
            y={y}
            inFrame={48 + i * 12}
          />
        );
      })}
    </>
  );
};

const ConnectorLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  inFrame: number;
  color: string;
}> = ({ x1, y1, x2, y2, inFrame, color }) => {
  const frame = useCurrentFrame();
  const len = Math.hypot(x2 - x1, y2 - y1);
  const draw = interpolate(frame - inFrame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeOpacity={0.55}
      strokeWidth={1.5}
      strokeDasharray={len}
      strokeDashoffset={len * (1 - draw)}
    />
  );
};

const PlatformNode: React.FC<{
  name: string;
  color: string;
  x: number;
  y: number;
  inFrame: number;
}> = ({ name, color, x, y, inFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    fps,
    frame: frame - inFrame,
    config: { damping: 14, stiffness: 130 },
  });
  const opacity = interpolate(frame - inFrame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(s, [0, 1], [0.6, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: color,
          boxShadow: `0 0 14px ${color}`,
          border: "2px solid rgba(255,255,255,0.2)",
        }}
      />
      <div
        style={{
          padding: "8px 16px",
          borderRadius: 999,
          background: COLORS.card,
          border: `1px solid ${color}55`,
          color: COLORS.ink,
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: 0.3,
        }}
      >
        {name}
      </div>
    </div>
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
      08 · LAYER 3 — GEO
    </div>
  );
};

const BottomBar: React.FC<{ percent: number }> = ({ percent }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [10, 60], [2 / 3, percent], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 80,
        right: 80,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          color: COLORS.inkDim,
          fontSize: 14,
          letterSpacing: 3,
          marginBottom: 10,
        }}
      >
        SAGE PROGRAM · 3 / 3 LAYERS
      </div>
      <div
        style={{
          height: 3,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${w * 100}%`,
            background: `linear-gradient(90deg, ${COLORS.seo}, ${COLORS.aeo}, ${COLORS.geo})`,
            boxShadow: `0 0 12px ${COLORS.geo}`,
          }}
        />
      </div>
    </div>
  );
};
