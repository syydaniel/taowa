/* 常驻界面：字幕、片头的 AI 标注、左上角章节条、底部进度条（按章节分段）。 */
import React from 'react';
import {C, F, H, W, clamp, ease, lin, out5, sp, useT} from './base';
import {THEME} from './theme';
import {TL} from './time';

/** 字幕。数字和英文单词自动换成亮色。 */
export const Subtitles: React.FC = () => {
  const t = useT();
  const s = (TL.subs as any[]).find((x) => t >= x.start && t < x.end);
  if (!s) return null;
  const k = out5(lin(t, s.start, s.start + 0.1));
  const parts = String(s.text).split(/(\d[\d.,:]*\s?(?:万|%|秒|分钟|分|句|遍|帧|行|步|次|个|条|天|小时|MB)?|[A-Za-z][A-Za-z0-9_.-]*(?: [A-Z][A-Za-z0-9_.-]*)*)/g);
  return (
    <div style={{position: 'absolute', left: 0, width: W, top: 930, display: 'flex', justifyContent: 'center', zIndex: 90}}>
      <div style={{background: 'rgba(14,13,28,.93)', color: '#fff', fontFamily: F.body, fontWeight: 600, fontSize: 46, lineHeight: 1.2, padding: '10px 32px 12px', borderRadius: Math.max(10, THEME.radius / 2), borderBottom: `5px solid ${C.acc}`, transform: `translateY(${(1 - k) * 12}px) scale(${0.96 + 0.04 * k})`, whiteSpace: 'nowrap', letterSpacing: 1}}>
        {parts.map((p, i) => (i % 2 ? <span key={i} style={{color: C.hi}}>{p}</span> : <span key={i}>{p}</span>))}
      </div>
    </div>
  );
};

/** 片头的 AI 内容标注（平台要求）。 */
export const AiNote: React.FC<{text?: string}> = ({text = '本视频含 AI 生成内容 · 旁白为 AI 合成'}) => {
  const t = useT();
  if (t > 6) return null;
  return <div style={{position: 'absolute', right: 36, top: 30, zIndex: 95, fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: '#fff', background: 'rgba(0,0,0,.6)', padding: '6px 14px', borderRadius: 8, opacity: Math.min(lin(t, 0.2, 0.5), 1 - lin(t, 5.5, 6))}}>{text}</div>;
};

/** 章节条 + 底部进度条。没有名字的章节（开头的钩子）不显示章节条。 */
export const Hud: React.FC = () => {
  const t = useT();
  const chs = TL.chapters as any[];
  const named = chs.filter((c) => c.name);
  if (!named.length) return null;
  const on = sp(t, named[0].start + 0.1), off = ease(lin(t, TL.end_card - 0.3, TL.end_card));
  if (on <= 0 || off >= 1) return null;
  const ch = [...chs].reverse().find((c) => t >= c.start && c.name);
  const x0 = 60, ww = W - 120, t0 = named[0].start, t1 = TL.end_card;
  const px = (x: number) => x0 + clamp((x - t0) / (t1 - t0)) * ww;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, zIndex: 80, pointerEvents: 'none', opacity: 1 - off}}>
      {ch ? (
        <div style={{position: 'absolute', left: 36, top: 30, display: 'flex', alignItems: 'stretch', transform: `translateX(${(1 - Math.min(1, sp(t, ch.start + 1.2))) * -520}px)`, borderRadius: 999, overflow: 'hidden', border: `4px solid ${C.ink}`, boxShadow: '0 10px 24px rgba(0,0,0,.35)'}}>
          {ch.num ? <div style={{background: C.acc, color: '#fff', fontFamily: F.mono, fontWeight: 700, fontSize: 32, padding: '6px 18px 6px 22px'}}>{ch.num}</div> : null}
          <div style={{background: C.paper, color: C.ink, fontFamily: F[THEME.titleFont], fontSize: 32, padding: '6px 24px 6px 18px'}}>{ch.name}<span style={{fontFamily: F.mono, fontSize: 18, marginLeft: 12, color: C.grey, fontWeight: 700}}>{ch.en}</span></div>
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 0, top: H - 22 + (1 - Math.min(1, on)) * 30, width: W, height: 22}}>
        <div style={{position: 'absolute', left: x0, top: 7, width: ww, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)'}} />
        <div style={{position: 'absolute', left: x0, top: 7, width: px(t) - x0, height: 8, borderRadius: 4, background: C.hi}} />
        {named.map((c, i) => <div key={i} style={{position: 'absolute', left: px(c.start) - 7, top: 4, width: 14, height: 14, borderRadius: 7, background: t >= c.start ? C.acc : '#666', border: '2px solid #fff', boxSizing: 'border-box'}} />)}
      </div>
    </div>
  );
};
