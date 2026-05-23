import { Composition } from "remotion";
import { Main } from "./Main";
import { Scene04 } from "./scenes/Scene04";
import { Scene05 } from "./scenes/Scene05";
import { Scene06 } from "./scenes/Scene06";
import { Scene07 } from "./scenes/Scene07";
import { Scene08 } from "./scenes/Scene08";
import { Scene09 } from "./scenes/Scene09";
import { Closing } from "./scenes/Closing";
import { DUR, FPS, HEIGHT, TOTAL, WIDTH } from "./theme";

export const Root = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={TOTAL}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene04"
        component={Scene04}
        durationInFrames={DUR.scene04}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene05"
        component={Scene05}
        durationInFrames={DUR.scene05}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene06"
        component={Scene06}
        durationInFrames={DUR.scene06}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene07"
        component={Scene07}
        durationInFrames={DUR.scene07}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene08"
        component={Scene08}
        durationInFrames={DUR.scene08}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene09"
        component={Scene09}
        durationInFrames={DUR.scene09}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Closing"
        component={Closing}
        durationInFrames={DUR.closing}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
