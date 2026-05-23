import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { LayerHero } from "../components/LayerHero";
import { COLORS, FPS } from "../theme";

// Scene 07 — Layer 2, AEO. 8s = 240 frames.
// VO: "Then AEO — Answer Engine Optimisation.
//      So your content lands the answer spot on voice search, chatbots, and AI assistants."
// Visual: quote box with AI Overview pull-quote.

export const Scene07: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop tint={`${COLORS.aeo}1F`} />
      <SceneTag />

      <LayerHero
        layerNumber="LAYER 02"
        acronym="AEO"
        fullName="Answer Engine Optimisation"
        description="You land the answer spot on voice search, chatbots, and AI assistants."
        accent={COLORS.aeo}
        hexLabel="AEO"
      />

      <QuoteCard inFrame={60} />

      <BottomBar percent={2 / 3} />
    </AbsoluteFill>
  );
};

const QuoteCard: React.FC<{ inFrame: number }> = ({ inFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    fps,
    frame: frame - inFrame,
    config: { damping: 16, stiffness: 90 },
  });
  const opacity = interpolate(frame - inFrame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(s, [0, 1], [30, 0]);

  // Typewriter on the quote
  const txt = `"Sunny's Lemonade Stand on Oak St. serves the best lemonade in town."`;
  const charsTo = Math.max(0, Math.floor((frame - inFrame - 14) * 1.6));
  const shown = txt.slice(0, Math.min(txt.length, charsTo));
  const cursorOn = Math.floor(frame / 8) % 2 === 0 && charsTo < txt.length;

  return (
    <div
      style={{
        position: "absolute",
        top: 360,
        right: 140,
        width: 600,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          color: COLORS.aeo,
          fontSize: 14,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginBottom: 12,
          fontWeight: 600,
        }}
      >
        ▣ AI Overview · Answer Spot
      </div>
      <div
        style={{
          padding: "32px 36px",
          borderRadius: 22,
          background: `linear-gradient(180deg, ${COLORS.card} 0%, #141A28 100%)`,
          border: `1px solid ${COLORS.aeo}55`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 60px ${COLORS.aeo}25`,
          fontFamily: "Inter, sans-serif",
          color: COLORS.ink,
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.4,
          letterSpacing: -0.3,
          minHeight: 200,
        }}
      >
        {shown}
        {cursorOn ? (
          <span style={{ color: COLORS.aeo }}>|</span>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 14,
          fontFamily: "Inter, sans-serif",
          color: COLORS.inkDim,
          fontSize: 14,
          letterSpacing: 2,
        }}
      >
        <Pill text="VOICE" />
        <Pill text="CHATBOTS" />
        <Pill text="AI ASSISTANTS" />
      </div>
    </div>
  );
};

const Pill: React.FC<{ text: string }> = ({ text }) => (
  <span
    style={{
      padding: "6px 12px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${COLORS.cardEdge}`,
    }}
  >
    {text}
  </span>
);

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
      07 · LAYER 2 — AEO
    </div>
  );
};

const BottomBar: React.FC<{ percent: number }> = ({ percent }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [10, 60], [1 / 3, percent], {
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
        SAGE PROGRAM · 2 / 3 LAYERS
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
            background: `linear-gradient(90deg, ${COLORS.seo}, ${COLORS.aeo})`,
            boxShadow: `0 0 12px ${COLORS.aeo}`,
          }}
        />
      </div>
    </div>
  );
};
