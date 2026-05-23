import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { SearchCard } from "../components/SearchCard";
import { AIGlyph, GoogleGlyph, VoiceGlyph } from "../components/SearchGlyphs";
import { SageLogo } from "../components/SageLogo";
import { COLORS, FONT_DISPLAY } from "../theme";

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 04 — THE THREE SEARCHES (Brand-aligned redesign)
// VO: "Today, people search in three completely different ways.
//      Google. Siri. ChatGPT."
//
// Choreography (30 fps, 150 frames):
//   00–18   Backdrop + SAGE lockup fade in
//   18–48   Supertitle "— THREE WAYS PEOPLE SEARCH NOW" types in
//   30–48   Underline draws across; origin point pulses to life
//   48–62   Three connector beams fan out from origin to card targets
//   50–95   Card 01 GOOGLE — frame, stripe, glyph, label, badge
//   80–125  Card 02 VOICE  — same staged build
//   110–150 Card 03 AI     — same staged build
//   Throughout: cards float gently, glyphs animate internally
// ─────────────────────────────────────────────────────────────────────────────

const SUPERTITLE = "THREE WAYS PEOPLE SEARCH NOW";

const CARD_W = 420;
const CARD_GAP = 60;
const CARDS_TOTAL = CARD_W * 3 + CARD_GAP * 2; // 1380
const STAGE_W = 1920;
const STAGE_LEFT = (STAGE_W - CARDS_TOTAL) / 2; // 270

const cardCenterX = (i: number) =>
  STAGE_LEFT + i * (CARD_W + CARD_GAP) + CARD_W / 2;

const CARD_TOP = 540;
const CARD_CENTER_Y = CARD_TOP + 320 / 2; // 700

const ORIGIN_X = STAGE_W / 2;
const ORIGIN_Y = 460;

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Supertitle typewriter ──
  const titleStart = 18;
  const titleEnd = 48;
  const titleChars = Math.max(
    0,
    Math.min(SUPERTITLE.length, Math.floor((frame - titleStart) * 1.4)),
  );
  const titleVisible = SUPERTITLE.slice(0, titleChars);
  const cursorOn = frame > titleStart && frame < titleEnd + 20 && Math.floor(frame / 7) % 2 === 0;

  // ── Underline draw ──
  const underlineProg = interpolate(frame, [38, 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Origin pulse (the "search beam" emitting outward) ──
  const originIntro = spring({
    fps,
    frame: frame - 40,
    config: { damping: 18, stiffness: 110 },
  });
  const originAppear = interpolate(originIntro, [0, 1], [0, 1]);
  const pulsePhase = (frame % 50) / 50;

  // ── Connector beams to card targets ──
  const beamProgress = (i: number) => {
    const delay = 48 + i * 6;
    return interpolate(frame - delay, [0, 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  return (
    <AbsoluteFill>
      <Backdrop tint="rgba(201, 168, 118, 0.10)" />

      {/* SAGE lockup */}
      <div style={{ position: "absolute", top: 64, left: 80 }}>
        <SageLogo inFrame={4} size={56} />
      </div>

      {/* Scene index — bottom right */}
      <SceneIndex />

      {/* Supertitle */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT_DISPLAY,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.gold,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 38, height: 3, background: COLORS.gold }} />
          <span>
            {titleVisible}
            {cursorOn && titleChars < SUPERTITLE.length ? (
              <span
                style={{
                  display: "inline-block",
                  width: 3,
                  height: 28,
                  background: COLORS.gold,
                  marginLeft: 4,
                  verticalAlign: "middle",
                }}
              />
            ) : null}
          </span>
        </div>
        {/* Underline draw */}
        <div
          style={{
            margin: "22px auto 0",
            width: 760,
            height: 1,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${underlineProg * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, transparent, ${COLORS.gold} 30%, ${COLORS.gold} 70%, transparent)`,
            }}
          />
        </div>
      </div>

      {/* Origin point + connector beams (drawn behind cards) */}
      <svg
        width={STAGE_W}
        height={1080}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {/* Origin pulse rings */}
        <g opacity={originAppear}>
          {[0, 0.33, 0.66].map((offset) => {
            const p = (pulsePhase + offset) % 1;
            return (
              <circle
                key={offset}
                cx={ORIGIN_X}
                cy={ORIGIN_Y}
                r={6 + p * 60}
                fill="none"
                stroke={COLORS.gold}
                strokeWidth={1.5}
                opacity={(1 - p) * 0.4}
              />
            );
          })}
          <circle cx={ORIGIN_X} cy={ORIGIN_Y} r={5} fill={COLORS.gold} />
          <circle cx={ORIGIN_X} cy={ORIGIN_Y} r={2} fill={COLORS.cardLight} />
        </g>

        {/* Connector beams */}
        {[0, 1, 2].map((i) => {
          const targetX = cardCenterX(i);
          const targetY = CARD_TOP - 18;
          const progress = beamProgress(i);
          const dx = targetX - ORIGIN_X;
          const dy = targetY - ORIGIN_Y;
          const x2 = ORIGIN_X + dx * progress;
          const y2 = ORIGIN_Y + dy * progress;
          return (
            <g key={i}>
              <line
                x1={ORIGIN_X}
                y1={ORIGIN_Y}
                x2={x2}
                y2={y2}
                stroke={COLORS.gold}
                strokeOpacity={0.45}
                strokeWidth={1.4}
                strokeDasharray="4 6"
              />
              {/* Landing dot */}
              {progress > 0.95 ? (
                <circle cx={targetX} cy={targetY} r={3} fill={COLORS.gold} opacity={0.7} />
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* The three cards */}
      <div
        style={{
          position: "absolute",
          top: CARD_TOP,
          left: STAGE_LEFT,
          width: CARDS_TOTAL,
          display: "flex",
          gap: CARD_GAP,
        }}
      >
        <SearchCard
          index={0}
          label="Google"
          ordinal="01"
          inFrame={50}
          accent={COLORS.seo}
          glyph={
            <GoogleGlyph
              size={280}
              inFrame={50 + 14}
              accent={COLORS.hexBlack}
            />
          }
        />
        <SearchCard
          index={1}
          label="Voice"
          ordinal="02"
          inFrame={80}
          accent={COLORS.aeo}
          glyph={
            <VoiceGlyph
              size={280}
              inFrame={80 + 14}
              accent={COLORS.hexBlack}
            />
          }
        />
        <SearchCard
          index={2}
          label="AI"
          ordinal="03"
          inFrame={110}
          accent={COLORS.geo}
          glyph={
            <AIGlyph size={280} inFrame={110 + 14} accent={COLORS.hexBlack} />
          }
        />
      </div>

      {/* Bottom whisper line — only after all three have landed */}
      <BottomWhisper />
    </AbsoluteFill>
  );
};

const BottomWhisper: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [128, 148], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lift = interpolate(frame, [128, 148], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity,
        transform: `translateY(${lift}px)`,
        fontFamily: FONT_DISPLAY,
        color: COLORS.inkDim,
        fontSize: 18,
        letterSpacing: 4,
        textTransform: "uppercase",
        fontWeight: 500,
      }}
    >
      Google · Siri · ChatGPT
    </div>
  );
};

const SceneIndex: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [6, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 78,
        right: 80,
        fontFamily: FONT_DISPLAY,
        color: COLORS.inkDim,
        fontSize: 13,
        letterSpacing: 4,
        opacity,
        textAlign: "right",
      }}
    >
      <div style={{ color: COLORS.goldDeep, fontWeight: 700 }}>SCENE 04 / 10</div>
      <div style={{ marginTop: 6, color: COLORS.inkDim }}>THE THREE SEARCHES</div>
    </div>
  );
};
