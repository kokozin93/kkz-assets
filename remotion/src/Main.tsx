import { AbsoluteFill, Series } from "remotion";
import { Scene04 } from "./scenes/Scene04";
import { Scene05 } from "./scenes/Scene05";
import { Scene06 } from "./scenes/Scene06";
import { Scene07 } from "./scenes/Scene07";
import { Scene08 } from "./scenes/Scene08";
import { Scene09 } from "./scenes/Scene09";
import { Closing } from "./scenes/Closing";
import { COLORS, DUR } from "./theme";

export const Main = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Series>
        <Series.Sequence durationInFrames={DUR.scene04}>
          <Scene04 />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DUR.scene05}>
          <Scene05 />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DUR.scene06}>
          <Scene06 />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DUR.scene07}>
          <Scene07 />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DUR.scene08}>
          <Scene08 />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DUR.scene09}>
          <Scene09 />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DUR.closing}>
          <Closing />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
