import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Caption } from "../components/Caption";
import { ChatGPTGlyph, GoogleGlyph, SiriGlyph } from "../components/SearchGlyphs";
import { COLORS, FPS } from "../theme";

// Scene 05 (A + B) — "Are You One of Them?"
// 11s = 330 frames at 30fps
// 5A VO: "Are you one of them? Invisible where your customers are actually looking?"
// 5B VO: "If yes — you're losing customers. Not to better products. To better visibility."

export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({
    fps,
    frame: frame - 30,
    config: { damping: 18, stiffness: 80 },
  });
  const phoneOpacity = interpolate(phoneIn, [0, 1], [0, 1]);
  const phoneScale = interpolate(phoneIn, [0, 1], [0.85, 1]);
  const phoneY = interpolate(phoneIn, [0, 1], [40, 0]);

  // Punch transition to second beat at frame 180
  const punchPhase = interpolate(frame, [180, 210], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const phoneFade = interpolate(frame, [180, 210], [1, 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Backdrop tint="rgba(74, 143, 231, 0.06)" />

      <SceneTag />

      {/* Headline (Beat A) */}
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
          text="ARE YOU ONE OF THEM?"
          inFrame={6}
          size={22}
          color={COLORS.gold}
          letterSpacing={6}
          weight={600}
          uppercase
        />
        <div style={{ height: 16 }} />
        <Caption
          text="Invisible where your customers are actually looking."
          inFrame={14}
          outFrame={180}
          size={52}
          weight={600}
          letterSpacing={-1}
          color={COLORS.ink}
        />
      </div>

      {/* Phone mockup */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: phoneOpacity * (1 - punchPhase * 0.5),
          transform: `translateY(${phoneY}px) scale(${phoneScale})`,
        }}
      >
        <Phone fade={phoneFade} />
      </div>

      {/* Beat B: payoff line */}
      <div
        style={{
          position: "absolute",
          top: 460,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: punchPhase,
        }}
      >
        <Caption
          text="You're losing customers."
          inFrame={195}
          size={68}
          weight={700}
          letterSpacing={-1.4}
          color={COLORS.ink}
        />
        <div style={{ height: 24 }} />
        <Caption
          text="Not to better products. To better visibility."
          inFrame={225}
          size={36}
          weight={400}
          color={COLORS.inkDim}
        />
      </div>

      {/* Punch chip */}
      <PunchChip showAt={270} />
    </AbsoluteFill>
  );
};

const Phone: React.FC<{ fade: number }> = ({ fade }) => {
  const frame = useCurrentFrame();

  // Google ON throughout; Siri off at frame 100; ChatGPT off at frame 130
  const siriDim = interpolate(frame - 100, [0, 20], [1, 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aiDim = interpolate(frame - 130, [0, 20], [1, 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Google highlight pulse
  const pulse = 0.5 + 0.5 * Math.sin(frame / 8);
  const googleGlow = interpolate(pulse, [0, 1], [0.25, 0.7]);

  return (
    <div
      style={{
        width: 460,
        height: 560,
        borderRadius: 56,
        background: "linear-gradient(180deg, #1B2030 0%, #11151E 100%)",
        border: `1px solid ${COLORS.cardEdge}`,
        boxShadow:
          "0 40px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        position: "relative",
        opacity: fade,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 28,
          borderRadius: 16,
          background: "#0B0E14",
        }}
      />
      <div style={{ height: 40 }} />
      <PhoneRow
        glyph={<GoogleGlyph size={36} />}
        label="Google"
        sub="Active"
        accent="#4285F4"
        active
        glowOpacity={googleGlow}
      />
      <PhoneRow
        glyph={<SiriGlyph size={36} animated={siriDim > 0.5} />}
        label="Siri"
        sub={siriDim > 0.5 ? "Voice search" : "Not visible"}
        accent="#A78BFA"
        dim={siriDim}
      />
      <PhoneRow
        glyph={<ChatGPTGlyph size={36} />}
        label="ChatGPT"
        sub={aiDim > 0.5 ? "AI assistant" : "Not visible"}
        accent="#10A37F"
        dim={aiDim}
      />
    </div>
  );
};

const PhoneRow: React.FC<{
  glyph: React.ReactNode;
  label: string;
  sub: string;
  accent: string;
  active?: boolean;
  dim?: number;
  glowOpacity?: number;
}> = ({ glyph, label, sub, accent, active, dim = 1, glowOpacity = 0 }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 18px",
        borderRadius: 18,
        background: active
          ? `linear-gradient(90deg, rgba(66,133,244,${0.18 + glowOpacity * 0.1}), rgba(66,133,244,0.04))`
          : "rgba(255,255,255,0.03)",
        border: active
          ? `1px solid rgba(66, 133, 244, ${0.5 + glowOpacity * 0.3})`
          : `1px solid ${COLORS.cardEdge}`,
        filter: dim < 1 ? `grayscale(${1 - dim})` : undefined,
        opacity: dim,
        boxShadow: active
          ? `0 0 ${24 + glowOpacity * 24}px rgba(66, 133, 244, ${0.25 + glowOpacity * 0.25})`
          : undefined,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {glyph}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: COLORS.ink,
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 22,
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: active ? accent : COLORS.inkDim,
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      </div>
      {active ? (
        <div
          style={{
            marginLeft: "auto",
            width: 10,
            height: 10,
            borderRadius: 5,
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
          }}
        />
      ) : null}
    </div>
  );
};

const PunchChip: React.FC<{ showAt: number }> = ({ showAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    fps,
    frame: frame - showAt,
    config: { damping: 14, stiffness: 120 },
  });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const scale = interpolate(s, [0, 1], [0.9, 1]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 130,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          padding: "16px 32px",
          borderRadius: 999,
          background: COLORS.gold,
          color: COLORS.bg,
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: 1,
          boxShadow: "0 20px 40px rgba(245, 194, 107, 0.25)",
        }}
      >
        Better visibility wins.
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
      05 · ARE YOU ONE OF THEM?
    </div>
  );
};
