import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { LayerHero } from "../components/LayerHero";
import { NodeChip } from "../components/NodeChip";
import { COLORS, FPS } from "../theme";

// Scene 06 — Layer 1, SEO. 8s = 240 frames.
// VO: "SAGE starts with SEO — Search Engine Optimisation.
//      So your website shows up on Google, and customers can find you."

export const Scene06: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop tint={`${COLORS.seo}22`} />
      <SceneTag />

      <LayerHero
        layerNumber="LAYER 01"
        acronym="SEO"
        fullName="Search Engine Optimisation"
        description="Your website shows up on Google, so customers can actually find you."
        accent={COLORS.seo}
        hexLabel="SEO"
      />

      <div
        style={{
          position: "absolute",
          top: 320,
          right: 140,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <NodeChip label="Technical audit" inFrame={48} accent={COLORS.seo} />
        <NodeChip label="Local citations" inFrame={72} accent={COLORS.seo} />
        <NodeChip label="Keyword mapping" inFrame={96} accent={COLORS.seo} />
      </div>

      <BottomBar percent={1 / 3} />
    </AbsoluteFill>
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
      06 · LAYER 1 — SEO
    </div>
  );
};

const BottomBar: React.FC<{ percent: number }> = ({ percent }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [10, 60], [0, percent], {
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
        SAGE PROGRAM · 1 / 3 LAYERS
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
            background: COLORS.seo,
            boxShadow: `0 0 12px ${COLORS.seo}`,
          }}
        />
      </div>
    </div>
  );
};
