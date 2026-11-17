/* 三张封面：CoverA 16:9（1920×1080）、CoverB 4:3（1440×1080）、CoverV 3:4（1080×1440）。静帧取第 60 帧。
   每一集改这里的 COVER 文字就能出图；想要更有设计感的封面，直接重写下面的排版（三张的构图最好不一样）。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F, loadFonts} from './base';
import {THEME} from './theme';
import {Grain} from './kit';
loadFonts();

export const COVER = {
  top: '小标签',            // 左上角的小标签
  big: ['大标题第一行', '第二行'],
  hi: '第二行',              // 大标题里要换成亮色的词
  sub: '一句补充说明',
};

const TF = F[THEME.titleFont];
const Card: React.FC<{w: number; h: number; size: number}> = ({w, h, size}) => (
  <AbsoluteFill style={{background: C.dark, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, ${THEME.glow}, rgba(0,0,0,0) 70%)`}} />
    {[0, 1, 2].map((i) => <div key={i} style={{position: 'absolute', left: 40 + i * 44, top: 40 + i * 44, width: w - 80 - i * 88, height: h - 80 - i * 88, borderRadius: THEME.radius + 40 - i * 10, border: `${THEME.border + 2}px solid ${[C.acc, C.hi, C.paper][i]}`, opacity: 0.9 - i * 0.25}} />)}
    <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: size * 0.16}}>
      <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: size * 0.26, color: C.ink, background: C.hi, padding: '6px 26px', borderRadius: 999, border: `5px solid ${C.ink}`}}>{COVER.top}</div>
      {COVER.big.map((l, i) => <div key={i} style={{fontFamily: TF, fontSize: size, lineHeight: 1.08, color: l.includes(COVER.hi) ? C.hi : '#fff', whiteSpace: 'nowrap', textShadow: '0 10px 0 rgba(0,0,0,.4)'}}>{l}</div>)}
      <div style={{fontFamily: TF, fontSize: size * 0.4, color: '#fff', background: C.acc, padding: '8px 34px', borderRadius: 20, border: `5px solid ${C.ink}`, marginTop: size * 0.1}}>{COVER.sub}</div>
    </div>
    <Grain op={0.1} blend="soft-light" />
  </AbsoluteFill>
);
export const CoverA: React.FC = () => <Card w={1920} h={1080} size={190} />;
export const CoverB: React.FC = () => <Card w={1440} h={1080} size={150} />;
export const CoverV: React.FC = () => <Card w={1080} h={1440} size={130} />;
