import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import {DUR} from './time';
import {CoverA, CoverB, CoverV} from './Cover';
export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} width={1920} height={1080} fps={30} durationInFrames={Math.round(DUR * 30)} />
    <Composition id="CoverA" component={CoverA} width={1920} height={1080} fps={30} durationInFrames={90} />
    <Composition id="CoverB" component={CoverB} width={1440} height={1080} fps={30} durationInFrames={90} />
    <Composition id="CoverV" component={CoverV} width={1080} height={1440} fps={30} durationInFrames={90} />
  </>
);
