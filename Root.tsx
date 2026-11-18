import {Composition} from 'remotion';
import {Video, DURATION} from './Video';
export const Root = () => (
  <Composition id="Reel" component={Video} width={1080} height={1920} fps={30} durationInFrames={DURATION} />
);
