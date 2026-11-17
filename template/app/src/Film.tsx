import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, loadFonts} from './base';
import {Grain, Shots} from './kit';
import {AiNote, Hud, Subtitles} from './Layers';
import {DUR} from './time';
import {shots} from './board';
loadFonts();
export const Film: React.FC = () => (
  <AbsoluteFill style={{background: C.dark}}>
    <Shots shots={shots} end={DUR} />
    <Grain op={0.12} blend="soft-light" />
    <Hud />
    <AiNote />
    <Subtitles />
  </AbsoluteFill>
);
