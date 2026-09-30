import {Composition} from "remotion";
import {DURATION, FPS} from "./beats";
import {Showreel} from "./Showreel";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Showreel"
      component={Showreel}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
