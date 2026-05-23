import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { SearchCard } from "../components/SearchCard";
import { Caption } from "../components/Caption";
import { ChatGPTGlyph, GoogleGlyph, SiriGlyph } from "../components/SearchGlyphs";
import { COLORS, FPS } from "../theme";

// Scene 04 — "The Three Searches"
// VO: "Today, people search in three completely different ways. Google. Siri. ChatGPT."
// Beats (30fps):
//   0–24   eyebrow + first half of VO appears
//   24–54  GOOGLE card lands ("Google.")
//   54–84  SIRI card lands ("Siri.")
//   84–114 CHATGPT card lands ("ChatGPT.")
//   114–150 hold; underline connector draws under all three

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const connector = spring({
    fps,
    frame: frame - 110,
    config: { damping: 18, stiffness: 90 },
  });
  const connectorWidth = interpolate(connector, [0, 1], [0, 1100]);

  const eyebrowOpacity = interpolate(frame, [6, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Backdrop />

      {/* Eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: eyebrowOpacity,
        }}
      >
        <Caption
          text="THE WAY PEOPLE SEARCH HAS CHANGED"
          inFrame={6}
          size={22}
          color={COLORS.gold}
          letterSpacing={6}
          weight={600}
          uppercase
        />
      </div>

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Caption
          text="Three completely different ways."
          inFrame={14}
          size={64}
          color={COLORS.ink}
          weight={600}
          letterSpacing={-1.2}
        />
      </div>

      {/* Three cards row */}
      <div
        style={{
          position: "absolute",
          top: 360,
          left: 0,
          right: 0,
          display: "flex",
          gap: 48,
          justifyContent: "center",
        }}
      >
        <SearchCard
          label="Google"
          sublabel="Search Engine"
          inFrame={24}
          glyph={<GoogleGlyph size={64} />}
          accent="#4285F4"
        />
        <SearchCard
          label="Siri"
          sublabel="Voice"
          inFrame={54}
          glyph={<SiriGlyph size={64} animated />}
          accent="#A78BFA"
        />
        <SearchCard
          label="ChatGPT"
          sublabel="AI Assistant"
          inFrame={84}
          glyph={<ChatGPTGlyph size={64} />}
          accent="#10A37F"
        />
      </div>

      {/* Connector line */}
      <div
        style={{
          position: "absolute",
          top: 870,
          left: "50%",
          transform: `translateX(-${connectorWidth / 2}px)`,
          width: connectorWidth,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          opacity: 0.9,
        }}
      />

      {/* Tagline below connector */}
      <div
        style={{
          position: "absolute",
          top: 900,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Caption
          text="One customer. One search. Three places they could be looking."
          inFrame={120}
          size={26}
          color={COLORS.inkDim}
          weight={400}
        />
      </div>

      {/* Scene number marker (small, editorial) */}
      <SceneTag />
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
      04 · THE THREE SEARCHES
    </div>
  );
};
