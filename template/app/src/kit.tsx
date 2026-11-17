/* 动效组件库（底层零件）：出入场、文字、荧光笔、手绘圈画、计数器、照片、镜头、转场。颜色跟着 theme.ts 走。
   所有组件都按绝对时间（秒）驱动：at = 出现时刻，out = 离开时刻。坐标是 1920×1080 画面上的中心点。 */
import React, {useMemo} from 'react';
import {Img, OffthreadVideo, Sequence, useCurrentFrame} from 'remotion';
import rough from 'roughjs';
import {AnimatedText} from 'remotion-bits';
import {C, F, FPS, H, W, asset, back, clamp, ease, hash, kf, lin, mix, out, out5, sp, useT} from './base';

const gen = rough.generator();
const abs: React.CSSProperties = {position: 'absolute', left: 0, top: 0};

/* ---------- 出入场 ---------- */
type From = 'scale' | 'up' | 'down' | 'left' | 'right' | 'slam' | 'spin' | 'fade' | 'drop' | 'flip';
export type PopProps = {
  at?: number; out?: number; x?: number; y?: number; rot?: number; s?: number; z?: number; from?: From;
  float?: number; seed?: number; origin?: string; style?: React.CSSProperties; children?: React.ReactNode;
};
/** 一个带入场动画的定位容器。float>0 时入场后持续轻微晃动，画面里没有完全静止的东西。 */
export const Pop: React.FC<PopProps> = ({at = 0, out: o, x = W / 2, y = H / 2, rot = 0, s = 1, z, from = 'scale', float = 1, seed = 1, origin, style, children}) => {
  const t = useT();
  if (t < at - 0.001) return null;
  const k = from === 'slam' ? out5(lin(t, at, at + 0.16)) : from === 'fade' ? ease(lin(t, at, at + 0.35)) : sp(t, at);
  const ko = o === undefined ? 0 : ease(lin(t, o, o + 0.16));
  if (ko >= 1) return null;
  const kk = clamp(k, 0, 1.3);
  let tx = 0, ty = 0, sc = 1, r = 0, blur = 0, op = Math.min(1, lin(t, at, at + 0.08)), rx = 0;
  if (from === 'scale') { sc = mix(0.2, 1, kk); blur = 10 * (1 - Math.min(1, kk)); }
  if (from === 'up') { ty = 160 * (1 - kk); blur = 8 * (1 - Math.min(1, kk)); }
  if (from === 'down') { ty = -160 * (1 - kk); blur = 8 * (1 - Math.min(1, kk)); }
  if (from === 'left') { tx = -420 * (1 - kk); blur = 10 * (1 - Math.min(1, kk)); }
  if (from === 'right') { tx = 420 * (1 - kk); blur = 10 * (1 - Math.min(1, kk)); }
  if (from === 'slam') { sc = mix(3.2, 1, k); blur = 18 * (1 - k); }
  if (from === 'spin') { sc = mix(0.1, 1, kk); r = -200 * (1 - kk); }
  if (from === 'fade') { op = k; sc = mix(1.06, 1, k); blur = 14 * (1 - k); }
  if (from === 'drop') { ty = -700 * (1 - Math.min(1, kk * 1.0)) ; r = 14 * (1 - kk); }
  if (from === 'flip') { rx = 90 * (1 - kk); }
  if (from === 'scale' || from === 'up' || from === 'left' || from === 'right') r += (seed % 2 ? 1 : -1) * 9 * (1 - Math.min(1.15, kk));   // 入场带一点甩尾
  const ph = seed * 7.3;
  const fl = float * Math.min(1, lin(t, at + 0.2, at + 0.8));
  ty += Math.sin(t * 1.7 + ph) * 5 * fl; r += Math.sin(t * 1.1 + ph * 2) * 0.9 * fl;
  sc *= 1 - 0.75 * ko; op *= 1 - ko; blur += 12 * ko;
  return (
    <div style={{...abs, left: x, top: y, zIndex: z, transform: `translate(-50%,-50%) translate(${tx}px,${ty}px) perspective(900px) rotateX(${rx}deg) rotate(${rot + r}deg) scale(${s * sc})`, transformOrigin: origin, opacity: op, filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined, willChange: 'transform', ...style}}>
      {children}
    </div>
  );
};

/* ---------- 文字 ---------- */
type TxtProps = {size?: number; font?: keyof typeof F; col?: string; bg?: string; pad?: string; stroke?: string; sw?: number; ls?: number; lh?: number; w?: number; align?: 'left' | 'center' | 'right'; shadow?: string; style?: React.CSSProperties; children?: React.ReactNode};
/** 一块字。bg 给出时变成色块标签；stroke 给出时带描边（贴纸字）。 */
export const Txt: React.FC<TxtProps> = ({size = 64, font = 'hei', col = C.ink, bg, pad, stroke, sw = 10, ls = 0, lh = 1.12, w, align = 'center', shadow, style, children}) => (
  <div style={{fontFamily: F[font], fontSize: size, color: col, background: bg, padding: pad ?? (bg ? '0.12em 0.4em' : 0), letterSpacing: ls, lineHeight: lh, whiteSpace: w ? 'normal' : 'nowrap', width: w, textAlign: align,
    WebkitTextStroke: stroke ? `${sw}px ${stroke}` : undefined, paintOrder: 'stroke fill', textShadow: shadow, fontWeight: font === 'body' ? 600 : 400, ...style}}>{children}</div>
);

/** 逐字弹出的动态文字（remotion-bits 的 AnimatedText）。mode 决定每个字怎么进来。 */
export const Kin: React.FC<{at: number; text: string; stagger?: number; dur?: number; mode?: 'rise' | 'slam' | 'blur' | 'drop' | 'spin'; style?: React.CSSProperties}> = ({at, text, stagger = 1.4, dur = 9, mode = 'rise', style}) => {
  const tr: any = {split: 'character', splitStagger: stagger, duration: dur, opacity: [0, 1], easing: 'easeOutBack'};
  if (mode === 'rise') Object.assign(tr, {y: [70, 0], blur: [10, 0], scale: [0.6, 1]});
  if (mode === 'slam') Object.assign(tr, {scale: [3, 1], blur: [16, 0], easing: 'easeOutCubic'});
  if (mode === 'blur') Object.assign(tr, {blur: [24, 0], x: [30, 0], easing: 'easeOutCubic'});
  if (mode === 'drop') Object.assign(tr, {y: [-120, 0], rotate: [-20, 0]});
  if (mode === 'spin') Object.assign(tr, {rotate: [90, 0], scale: [0.2, 1]});
  return <Sequence from={Math.round(at * FPS)} layout="none"><AnimatedText transition={tr} style={{display: 'inline-block', ...style}}>{text}</AnimatedText></Sequence>;
};

/** 荧光笔：包住一段行内文字，at 时刻一笔刷过去（rough.js 的手绘笔触）。 */
export const Mark: React.FC<{at: number; col?: string; dur?: number; seed?: number; ink?: string; thick?: number; children?: React.ReactNode}> = ({at, col = C.green, dur = 0.28, seed = 3, ink, thick = 0.82, children}) => {
  const t = useT();
  const k = out(lin(t, at, at + dur));
  const paths = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 6; i++) pts.push([2 + i * 16, i % 2 ? 62 : 38]);
    return gen.toPaths(gen.linearPath(pts, {roughness: 1.6, bowing: 2, strokeWidth: 44, seed, disableMultiStroke: true, stroke: '#000'}));
  }, [seed]);
  return (
    <span style={{position: 'relative', display: 'inline-block', color: ink && k > 0.5 ? ink : undefined}}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', left: '-4%', top: `${(1 - thick) * 60}%`, width: '108%', height: `${thick * 100}%`, clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`, zIndex: 0, overflow: 'visible'}}>
        {paths.map((p, i) => <path key={i} d={p.d} stroke={col} strokeWidth={46} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      <span style={{position: 'relative', zIndex: 1}}>{children}</span>
    </span>
  );
};

/** 手绘圈 / 下划线 / 叉，画在 (x,y) 为中心、w×h 的范围上。 */
export const Scribble: React.FC<{at: number; kind?: 'ring' | 'under' | 'cross' | 'box'; x: number; y: number; w: number; h: number; col?: string; sw?: number; dur?: number; seed?: number; z?: number}> = ({at, kind = 'ring', x, y, w, h, col = C.red, sw = 9, dur = 0.35, seed = 5, z}) => {
  const t = useT();
  const k = out(lin(t, at, at + dur));
  const ds = useMemo(() => {
    const o = {roughness: 1.8, strokeWidth: sw, seed, stroke: col, bowing: 1.5};
    const dr = kind === 'ring' ? [gen.ellipse(w / 2, h / 2, w, h, o)] : kind === 'under' ? [gen.line(0, h / 2, w, h / 2, o)] : kind === 'box' ? [gen.rectangle(0, 0, w, h, o)] : [gen.line(0, 0, w, h, o), gen.line(w, 0, 0, h, o)];
    return dr.flatMap((d) => gen.toPaths(d));
  }, [kind, w, h, col, sw, seed]);
  if (t < at) return null;
  return (
    <svg width={w} height={h} style={{...abs, left: x - w / 2, top: y - h / 2, overflow: 'visible', zIndex: z}}>
      {ds.map((p, i) => <path key={i} d={p.d} stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp(k * ds.length - i)} />)}
    </svg>
  );
};

/** 手绘箭头，从 (x1,y1) 弯到 (x2,y2)。 */
export const Arrow: React.FC<{at: number; x1: number; y1: number; x2: number; y2: number; bend?: number; col?: string; sw?: number; dur?: number; seed?: number}> = ({at, x1, y1, x2, y2, bend = 0.25, col = C.ink, sw = 8, dur = 0.35, seed = 2}) => {
  const t = useT();
  const k = out(lin(t, at, at + dur));
  const {body, head} = useMemo(() => {
    const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
    const o = {roughness: 1.2, strokeWidth: sw, seed, stroke: col};
    const a = Math.atan2(y2 - my, x2 - mx), L = 38;
    return {body: gen.toPaths(gen.curve([[x1, y1], [mx, my], [x2, y2]], o)), head: gen.toPaths(gen.linearPath([[x2 - L * Math.cos(a - 0.5), y2 - L * Math.sin(a - 0.5)], [x2, y2], [x2 - L * Math.cos(a + 0.5), y2 - L * Math.sin(a + 0.5)]], o))};
  }, [x1, y1, x2, y2, bend, col, sw, seed]);
  if (t < at) return null;
  return (
    <svg width={W} height={H} style={{...abs, overflow: 'visible', pointerEvents: 'none'}}>
      {body.map((p, i) => <path key={i} d={p.d} stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - lin(k, 0, 0.75)} />)}
      {head.map((p, i) => <path key={'h' + i} d={p.d} stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={k > 0.7 ? 1 : 0} />)}
    </svg>
  );
};

/** 数字滚动。 */
export const Counter: React.FC<{at: number; from?: number; to: number; dur?: number; fix?: number; pre?: string; post?: string; sep?: boolean}> = ({at, from = 0, to, dur = 0.8, fix = 0, pre = '', post = '', sep = true}) => {
  const t = useT();
  const v = mix(from, to, out5(lin(t, at, at + dur)));
  const s = v.toFixed(fix);
  const [a, b] = s.split('.');
  return <span style={{fontVariantNumeric: 'tabular-nums'}}>{pre}{sep ? a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : a}{b ? '.' + b : ''}{post}</span>;
};

/** 打字机（等宽小字标签用）。 */
export const Type: React.FC<{at: number; text: string; cps?: number; caret?: boolean}> = ({at, text, cps = 28, caret = true}) => {
  const t = useT();
  const n = Math.floor(clamp((t - at) * cps, 0, text.length));
  return <span>{text.slice(0, n)}{caret && t > at && (n < text.length || Math.floor(t * 3) % 2 === 0) ? '▌' : ''}</span>;
};

/* ---------- 图片 ---------- */
/** 矩形剪报照片：白纸边、胶带、可选绿色双色调和半调网点，内部缓慢推镜。 */
export const Photo: React.FC<{src: string; w: number; h: number; pos?: string; duo?: boolean | string; tape?: boolean; cap?: string; kb?: [number, number]; at?: number; border?: number; dots?: boolean; radius?: number}> = ({src, w, h, pos = 'center', duo = false, tape = true, cap, kb = [1.12, 1.0], at = 0, border = 14, dots = false, radius = 0}) => {
  const t = useT();
  const sc = mix(kb[0], kb[1], out(lin(t, at, at + 4)));
  return (
    <div style={{position: 'relative', width: w, background: '#FBF9F3', padding: border, paddingBottom: cap ? 0 : border, boxShadow: '0 18px 40px rgba(0,0,0,.28), 0 2px 0 rgba(0,0,0,.2)', borderRadius: radius}}>
      <div style={{width: w - border * 2, height: h, overflow: 'hidden', position: 'relative', background: '#222'}}>
        <Img src={asset(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${sc})`, filter: duo ? 'grayscale(1) contrast(1.25) brightness(1.05)' : 'contrast(1.06) saturate(1.05)'}} />
        {duo ? <div style={{position: 'absolute', inset: 0, background: typeof duo === 'string' ? duo : C.green, mixBlendMode: 'multiply'}} /> : null}
        {dots ? <div style={{position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(0,0,0,.55) 1.1px, transparent 1.4px)', backgroundSize: '6px 6px', mixBlendMode: 'multiply', opacity: 0.55}} /> : null}
      </div>
      {cap ? <div style={{fontFamily: F.mono, fontSize: 20, color: '#333', padding: '8px 2px 10px', letterSpacing: 0.5}}>{cap}</div> : null}
      {tape ? <div style={{position: 'absolute', left: '50%', top: -20, width: 150, height: 40, marginLeft: -75, background: 'rgba(118,185,0,.72)', transform: 'rotate(-3deg)', boxShadow: '0 2px 4px rgba(0,0,0,.15)'}} /> : null}
    </div>
  );
};

/** 抠好的透明图，加白色贴纸描边。 */
export const Cut: React.FC<{src: string; h?: number; w?: number; flip?: boolean; outline?: number; duo?: boolean; col?: string; style?: React.CSSProperties}> = ({src, h, w, flip, outline = 7, duo, col = '#fff', style}) => {
  const o = outline;
  const ds = o > 0 ? [[o, 0], [-o, 0], [0, o], [0, -o], [o * 0.7, o * 0.7], [-o * 0.7, o * 0.7], [o * 0.7, -o * 0.7], [-o * 0.7, -o * 0.7]].map(([a, b]) => `drop-shadow(${a}px ${b}px 0 ${col})`).join(' ') : '';
  return <Img src={asset(src)} style={{height: h, width: w, display: 'block', transform: flip ? 'scaleX(-1)' : undefined, filter: `${duo ? 'grayscale(1) contrast(1.2) ' : ''}${ds} drop-shadow(0 14px 18px rgba(0,0,0,.3))`, ...style}} />;
};

/** 画框里的真实视频片段（静音），从 at 秒开始播放。 */
export const Vid: React.FC<{src: string; at: number; w: number; h: number; from?: number; rate?: number; duo?: boolean}> = ({src, at, w, h, from = 0, rate = 1, duo}) => (
  <div style={{width: w, height: h, overflow: 'hidden', background: '#000', border: '12px solid #FBF9F3', boxShadow: '0 18px 40px rgba(0,0,0,.3)', boxSizing: 'content-box'}}>
    <Sequence from={Math.round(at * FPS)} layout="none">
      <OffthreadVideo src={asset(src)} muted trimBefore={Math.round(from * FPS)} playbackRate={rate} style={{width: '100%', height: '100%', objectFit: 'cover', filter: duo ? 'grayscale(1) contrast(1.2)' : undefined}} />
    </Sequence>
  </div>
);

/* ---------- 镜头类效果 ---------- */
/** 放大镜（带鱼眼畸变）。children 是要被放大的整层画面；x,y 是镜片中心，可以每帧变。k 0..1 控制镜片出现。
    鱼眼的做法：把镜片分成一圈圈同心圆，越靠中心放大倍数越高（不依赖滤镜贴图，渲染稳定）。 */
export const Lens: React.FC<{x: number; y: number; r?: number; zoom?: number; fish?: number; k?: number; ring?: string; rings?: number; children: React.ReactNode}> = ({x, y, r = 170, zoom = 2.1, fish = 0.8, k = 1, ring = C.ink, rings = 14, children}) => {
  const R = r * mix(0.3, 1, back(clamp(k)));
  const D = R * 2;
  return (
    <>
      <div style={{...abs, width: W, height: H}}>{children}</div>
      {k > 0.01 ? (
        <div style={{...abs, left: x - R, top: y - R, width: D, height: D, opacity: clamp(k * 3)}}>
          <div style={{position: 'absolute', left: R * 1.62, top: R * 1.62, width: R * 1.1, height: 34, background: C.green, border: `7px solid ${ring}`, borderRadius: 20, transform: 'rotate(45deg)', transformOrigin: '0 50%', boxShadow: '0 10px 18px rgba(0,0,0,.3)'}} />
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: C.paper}}>
            {Array.from({length: rings}).map((_, i) => {
              const q = 1 - i / rings, rr = R * q, z = zoom * (1 + fish * 0.42 * (1 - q * q) - fish * 0.12);
              return (
                <div key={i} style={{position: 'absolute', left: R - rr, top: R - rr, width: rr * 2, height: rr * 2, borderRadius: '50%', overflow: 'hidden'}}>
                  <div style={{position: 'absolute', left: -(x - rr), top: -(y - rr), width: W, height: H, transform: `scale(${z})`, transformOrigin: `${x}px ${y}px`}}>{children}</div>
                </div>
              );
            })}
          </div>
          <div style={{position: 'absolute', inset: -4, borderRadius: '50%', border: `12px solid ${ring}`, boxShadow: `0 18px 40px rgba(0,0,0,.38), inset 0 0 0 5px rgba(255,255,255,.75), inset 0 0 60px rgba(0,0,0,.35)`}} />
          <div style={{position: 'absolute', left: '14%', top: '10%', width: '46%', height: '30%', borderRadius: '50%', background: 'linear-gradient(160deg, rgba(255,255,255,.5), rgba(255,255,255,0) 70%)', transform: 'rotate(-24deg)'}} />
        </div>
      ) : null}
    </>
  );
};

/** 焦点模糊：amount 像素。用来做「虚化背景、突出前景」和失焦转场。 */
export const Blur: React.FC<{px: number; dim?: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({px, dim = 0, children, style}) => (
  <div style={{...abs, width: W, height: H, filter: px > 0.2 ? `blur(${px.toFixed(1)}px) brightness(${1 - dim})` : dim ? `brightness(${1 - dim})` : undefined, ...style}}>{children}</div>
);

/** 镜头：对整层做推拉摇移和震动。cam=[[t,scale,x,y],...]（x,y 是画面上要对准中心的点），shakes=震动发生的时刻。 */
export const Cam: React.FC<{cam?: [number, number, number, number][]; shakes?: number[]; amp?: number; children?: React.ReactNode}> = ({cam, shakes = [], amp = 22, children}) => {
  const t = useT();
  const f = useCurrentFrame();
  let s = 1, cx = W / 2, cy = H / 2;
  if (cam && cam.length) { s = kf(t, cam.map((c) => [c[0], c[1]])); cx = kf(t, cam.map((c) => [c[0], c[2]])); cy = kf(t, cam.map((c) => [c[0], c[3]])); }
  s *= 1.035 + 0.02 * Math.sin(t * 0.55);                                   // 没有静止的镜头：持续的呼吸感推拉
  let punch = 0, flash = 0;
  for (const st of shakes) { const d = t - st; if (d >= 0 && d < 0.32) punch = Math.max(punch, Math.pow(1 - d / 0.32, 2)); if (d >= 0 && d < 0.12) flash = Math.max(flash, 1 - d / 0.12); }
  s *= 1 + 0.07 * punch;                                                    // 砸字的瞬间镜头猛推一下
  cx = clamp(cx, W / (2 * s), W - W / (2 * s)); cy = clamp(cy, H / (2 * s), H - H / (2 * s));
  let sx = Math.sin(t * 0.9) * 7, sy = Math.cos(t * 0.7) * 5, sr = Math.sin(t * 0.5) * 0.25;
  for (const st of shakes) { const d = t - st; if (d >= 0 && d < 0.45) { const a = amp * Math.pow(1 - d / 0.45, 2); sx += (hash(f * 3.1 + st) - 0.5) * 2 * a; sy += (hash(f * 5.7 + st) - 0.5) * 2 * a; sr += (hash(f * 9.3 + st) - 0.5) * a * 0.06; } }
  return (
    <>
      <div style={{...abs, width: W, height: H, transformOrigin: `${cx}px ${cy}px`, transform: `translate(${W / 2 - cx + sx}px,${H / 2 - cy + sy}px) scale(${s}) rotate(${sr}deg)`, filter: punch > 0.5 ? `blur(${((punch - 0.5) * 6).toFixed(1)}px) contrast(${1 + punch * 0.25})` : undefined}}>{children}</div>
      {flash > 0 ? <div style={{...abs, width: W, height: H, background: '#fff', opacity: flash * 0.32, pointerEvents: 'none', zIndex: 60}} /> : null}
    </>
  );
};

/* ---------- 漫画 / 梗 ---------- */
/** 漫画集中线，对着 (x,y)。 */
export const SpeedLines: React.FC<{at: number; out?: number; x?: number; y?: number; col?: string; n?: number; inner?: number}> = ({at, out: o = 1e9, x = W / 2, y = H / 2, col = C.ink, n = 70, inner = 330}) => {
  const t = useT();
  const f = Math.floor(useCurrentFrame() / 2);
  if (t < at || t > o) return null;
  const k = out(lin(t, at, at + 0.15));
  const tri: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i + hash(i + f * 13) * 0.8) / n * Math.PI * 2, wv = 0.008 + hash(i * 3 + f) * 0.018, r0 = inner * (0.85 + hash(i * 7 + f * 5) * 0.6) / k, r1 = 1500;
    tri.push(`M${x + Math.cos(a) * r0},${y + Math.sin(a) * r0} L${x + Math.cos(a - wv) * r1},${y + Math.sin(a - wv) * r1} L${x + Math.cos(a + wv) * r1},${y + Math.sin(a + wv) * r1} Z`);
  }
  return <svg width={W} height={H} style={{...abs, pointerEvents: 'none'}}><path d={tri.join(' ')} fill={col} opacity={0.9 * k} /></svg>;
};

/** 爆炸对话框（尖刺），里面放字。 */
export const Burst: React.FC<{w?: number; h?: number; col?: string; edge?: string; spikes?: number; children?: React.ReactNode}> = ({w = 520, h = 300, col = C.yellow, edge = C.ink, spikes = 16, children}) => {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) { const a = i / (spikes * 2) * Math.PI * 2, r = i % 2 ? 0.78 + hash(i) * 0.06 : 1; pts.push(`${w / 2 + Math.cos(a) * w / 2 * r},${h / 2 + Math.sin(a) * h / 2 * r}`); }
  return (
    <div style={{position: 'relative', width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible', filter: 'drop-shadow(8px 10px 0 rgba(0,0,0,.85))'}}><polygon points={pts.join(' ')} fill={col} stroke={edge} strokeWidth={8} strokeLinejoin="round" /></svg>
      <div style={{position: 'relative'}}>{children}</div>
    </div>
  );
};

/** 对话气泡。tail: 尾巴朝向。 */
export const Bubble: React.FC<{col?: string; ink?: string; tail?: 'bl' | 'br' | 'tl' | 'tr' | 'none'; size?: number; w?: number; children?: React.ReactNode}> = ({col = '#fff', ink = C.ink, tail = 'bl', size = 44, w, children}) => (
  <div style={{position: 'relative', background: col, color: ink, border: `6px solid ${C.ink}`, borderRadius: 34, padding: '18px 30px', fontFamily: F.hei, fontSize: size, lineHeight: 1.25, boxShadow: '8px 9px 0 rgba(0,0,0,.85)', whiteSpace: w ? 'normal' : 'nowrap', width: w}}>
    {children}
    {tail !== 'none' ? <div style={{position: 'absolute', width: 34, height: 34, background: col, borderRight: `6px solid ${C.ink}`, borderBottom: `6px solid ${C.ink}`, [tail[0] === 'b' ? 'bottom' : 'top']: -22, [tail[1] === 'l' ? 'left' : 'right']: 60, transform: `rotate(${tail[0] === 'b' ? 45 : 225}deg) skew(12deg,12deg)`} as any} /> : null}
  </div>
);

/** B 站弹幕：一堆字从右往左飘。 */
export const Danmaku: React.FC<{at: number; items: string[]; dur?: number; top?: number; lanes?: number; size?: number; gap?: number}> = ({at, items, dur = 4.2, top = 90, lanes = 7, size = 46, gap = 0.16}) => {
  const t = useT();
  if (t < at) return null;
  const cols = ['#fff', '#fff', '#fff', C.lime, C.yellow, '#fff', '#FF7A7A', '#7AD7FF'];
  return (
    <div style={{...abs, width: W, height: H, pointerEvents: 'none'}}>
      {items.map((s, i) => {
        const st = at + i * gap + hash(i * 3.3) * 0.2, k = (t - st) / (dur * (0.8 + hash(i * 1.7) * 0.45));
        if (k < 0 || k > 1) return null;
        const lane = (i * 4) % lanes, w = s.length * size + 80;
        return <div key={i} style={{position: 'absolute', left: mix(W + 20, -w, k), top: top + lane * (size * 1.5), fontFamily: F.hei, fontSize: size, color: cols[Math.floor(hash(i * 9.1) * cols.length)], WebkitTextStroke: '7px #000', paintOrder: 'stroke fill', whiteSpace: 'nowrap'}}>{s}</div>;
      })}
    </div>
  );
};

/** 印章：歪着盖下去的大字框。配合 Pop from="slam" 和 Cam 的 shakes 用。 */
export const Stamp: React.FC<{text: string; col?: string; size?: number; sub?: string}> = ({text, col = C.red, size = 120, sub}) => (
  <div style={{border: `${Math.max(8, size * 0.09)}px solid ${col}`, borderRadius: size * 0.14, padding: `${size * 0.06}px ${size * 0.3}px ${size * 0.1}px`, color: col, fontFamily: F.hei, fontSize: size, lineHeight: 1.05, textAlign: 'center', whiteSpace: 'nowrap', mixBlendMode: 'multiply',
    WebkitMaskImage: 'radial-gradient(circle at 30% 40%, #000 55%, rgba(0,0,0,.72) 56%, #000 60%), repeating-linear-gradient(37deg, #000 0 9px, rgba(0,0,0,.8) 9px 11px)', background: 'rgba(255,255,255,.0)'}}>
    {text}{sub ? <div style={{fontFamily: F.mono, fontSize: size * 0.2, letterSpacing: 3, marginTop: 4}}>{sub}</div> : null}
  </div>
);

/** 小标签（等宽字，像档案袋上的贴条）。 */
export const Tag: React.FC<{col?: string; ink?: string; size?: number; children?: React.ReactNode}> = ({col = C.ink, ink = C.paper, size = 26, children}) => (
  <div style={{fontFamily: F.mono, fontSize: size, background: col, color: ink, padding: '6px 14px', letterSpacing: 1.5, whiteSpace: 'nowrap', fontWeight: 700}}>{children}</div>
);

/** 游戏血条。v 0..1。 */
export const HPBar: React.FC<{v: number; w?: number; label?: string; dark?: boolean}> = ({v, w = 420, label = 'NVIDIA', dark}) => {
  const f = useCurrentFrame();
  const low = v < 0.2, blink = low && Math.floor(f / 5) % 2 === 0;
  const col = v > 0.5 ? C.green : v > 0.2 ? C.yellow : C.red;
  const fg = dark ? C.paper : C.ink;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: fg}}>
      <span style={{letterSpacing: 2}}>{label}</span><span style={{color: low ? C.red : fg}}>HP</span>
      <div style={{width: w, height: 26, border: `4px solid ${fg}`, background: dark ? '#222' : '#fff', padding: 3, boxSizing: 'border-box', transform: low ? `translate(${(hash(f) - 0.5) * 5}px,0)` : undefined}}>
        <div style={{width: `${clamp(v) * 100}%`, height: '100%', background: blink ? '#fff' : col}} />
      </div>
      <span style={{width: 70, color: low ? C.red : fg}}>{Math.round(v * 100)}%</span>
    </div>
  );
};

/** 折线图（真实数据）：pts=[x,y][]，画到进度 k。log=true 用对数纵轴。 */
export const Chart: React.FC<{pts: [number, number][]; w: number; h: number; k: number; col?: string; sw?: number; log?: boolean; fill?: string; x0?: number; x1?: number; y0?: number; y1?: number; dot?: boolean}> = ({pts, w, h, k, col = C.green, sw = 8, log = true, fill, x0, x1, y0, y1, dot = true}) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const X0 = x0 ?? Math.min(...xs), X1 = x1 ?? Math.max(...xs), fy = (v: number) => (log ? Math.log(Math.max(v, 1e-6)) : v);
  const Y0 = fy(y0 ?? Math.min(...ys)), Y1 = fy(y1 ?? Math.max(...ys));
  const P = pts.map((p) => [(p[0] - X0) / (X1 - X0) * w, h - (fy(p[1]) - Y0) / (Y1 - Y0) * h] as [number, number]);
  const n = clamp(k) * (P.length - 1), i0 = Math.floor(n), fr = n - i0;
  const vis = P.slice(0, i0 + 1);
  if (i0 < P.length - 1) vis.push([mix(P[i0][0], P[i0 + 1][0], fr), mix(P[i0][1], P[i0 + 1][1], fr)]);
  const d = vis.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = vis[vis.length - 1];
  return (
    <svg width={w} height={h} style={{overflow: 'visible', display: 'block'}}>
      {fill ? <path d={`${d} L${last[0]},${h} L${vis[0][0]},${h} Z`} fill={fill} /> : null}
      <path d={d} stroke={col} strokeWidth={sw} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {dot && k > 0 ? <><circle cx={last[0]} cy={last[1]} r={sw * 2.6} fill={col} opacity={0.25} /><circle cx={last[0]} cy={last[1]} r={sw * 1.3} fill={col} stroke={C.ink} strokeWidth={4} /></> : null}
    </svg>
  );
};

/** 一堆东西从天上掉下来（钱、退货箱、表情）。 */
export const Rain: React.FC<{at: number; items: string[]; n?: number; dur?: number; size?: number; spread?: number; out?: number}> = ({at, items, n = 40, dur = 1.6, size = 90, spread = 2.2, out: o = 1e9}) => {
  const t = useT();
  if (t < at || t > o) return null;
  return (
    <div style={{...abs, width: W, height: H, pointerEvents: 'none'}}>
      {Array.from({length: n}).map((_, i) => {
        const st = at + hash(i * 2.1) * spread, k = (t - st) / (dur * (0.7 + hash(i * 4.3) * 0.6));
        if (k < 0 || k > 1.05) return null;
        const sz = size * (0.6 + hash(i * 6.1) * 0.9);
        return <div key={i} style={{position: 'absolute', left: hash(i * 8.7) * (W + 100) - 50, top: mix(-160, H + 60, k * k * 0.7 + k * 0.3), fontSize: sz, lineHeight: 1, transform: `rotate(${(hash(i) - 0.5) * 80 + k * 240 * (hash(i * 5) - 0.5)}deg)`}}>{items[i % items.length]}</div>;
      })}
    </div>
  );
};

/** 故障字（红蓝错位抖动）。 */
export const Glitch: React.FC<{children: string; size?: number; col?: string; font?: keyof typeof F; amt?: number}> = ({children, size = 160, col = '#fff', font = 'hei', amt = 1}) => {
  const f = useCurrentFrame();
  const j = (s: number) => (hash(f * 1.3 + s) - 0.5) * 2;
  const big = hash(Math.floor(f / 3) * 7.7) > 0.72 ? 3 : 1;
  const base: React.CSSProperties = {fontFamily: F[font], fontSize: size, lineHeight: 1.05, whiteSpace: 'nowrap', position: 'absolute', left: 0, top: 0};
  return (
    <div style={{position: 'relative', fontFamily: F[font], fontSize: size, lineHeight: 1.05, whiteSpace: 'nowrap', color: 'transparent'}}>
      {children}
      <div style={{...base, color: '#FF2A2A', transform: `translate(${j(1) * 7 * amt * big}px,${j(2) * 3 * amt}px)`, mixBlendMode: 'screen'}}>{children}</div>
      <div style={{...base, color: '#22E0FF', transform: `translate(${j(3) * 7 * amt * big}px,${j(4) * 3 * amt}px)`, mixBlendMode: 'screen'}}>{children}</div>
      <div style={{...base, color: col, clipPath: big > 1 ? `inset(${hash(f) * 60}% 0 ${hash(f + 9) * 30}% 0)` : undefined, transform: big > 1 ? `translateX(${j(5) * 30}px)` : undefined}}>{children}</div>
    </div>
  );
};

/* ---------- 背景 ---------- */
const grainUrl = (() => {
  let u: string | null = null;
  return () => {
    if (u || typeof document === 'undefined') return u ?? '';
    const N = 220, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d')!, im = g.createImageData(N, N);
    for (let i = 0; i < N * N; i++) { const v = 110 + hash(i * 1.37) * 145; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); u = c.toDataURL();
    return u;
  };
})();
export const Grain: React.FC<{op?: number; blend?: string}> = ({op = 0.22, blend = 'multiply'}) => {
  const f = Math.floor(useCurrentFrame() / 2);
  return <div style={{...abs, width: W, height: H, backgroundImage: `url(${grainUrl()})`, backgroundPosition: `${hash(f) * 220}px ${hash(f + 5) * 220}px`, mixBlendMode: blend as any, opacity: op, pointerEvents: 'none'}} />;
};
/** 纸面背景：米色纸、点阵、可选的大号水印字。 */
export const Paper: React.FC<{col?: string; dots?: boolean; ghost?: string; ghostCol?: string}> = ({col = C.paper, dots = true, ghost, ghostCol = 'rgba(0,0,0,.05)'}) => {
  const t = useT();
  return (
    <div style={{...abs, left: -90, top: -90, width: W + 180, height: H + 180, background: col, overflow: 'hidden'}}>
      {dots ? <div style={{position: 'absolute', inset: -40, backgroundImage: 'radial-gradient(rgba(0,0,0,.16) 1.6px, transparent 2px)', backgroundSize: '36px 36px', transform: `translate(${(t * 6) % 36}px,${(t * 3) % 36}px)`}} /> : null}
      {ghost ? <div style={{position: 'absolute', left: -40, top: 250, fontFamily: F.smiley, fontSize: 620, lineHeight: 1, color: ghostCol, whiteSpace: 'nowrap', transform: `translateX(${-t * 40}px)`}}>{ghost}</div> : null}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0) 55%, rgba(60,50,20,.22) 100%)'}} />
    </div>
  );
};
/** 暗场背景：黑底、扫描线、红或绿的光晕。 */
export const Dark: React.FC<{glow?: string; scan?: boolean; grid?: boolean}> = ({glow = 'rgba(118,185,0,.22)', scan = true, grid = true}) => {
  const t = useT();
  return (
    <div style={{...abs, left: -90, top: -90, width: W + 180, height: H + 180, background: C.dark, overflow: 'hidden'}}>
      {grid ? <div style={{position: 'absolute', inset: -60, backgroundImage: 'linear-gradient(rgba(255,255,255,.055) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,.055) 1.5px, transparent 1.5px)', backgroundSize: '60px 60px', transform: `translate(${(t * 10) % 60}px,${(t * 10) % 60}px)`}} /> : null}
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 55%, ${glow}, rgba(0,0,0,0) 62%)`}} />
      {scan ? <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 2px, transparent 2px 5px)'}} /> : null}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,.7) 100%)'}} />
    </div>
  );
};
/** 纯色铺底 + 斜条纹（用于强调镜头）。 */
export const Flat: React.FC<{col?: string; stripe?: string}> = ({col = C.green, stripe = 'rgba(0,0,0,.07)'}) => {
  const t = useT();
  return <div style={{...abs, left: -90, top: -90, width: W + 180, height: H + 180, background: col, overflow: 'hidden'}}><div style={{position: 'absolute', inset: -200, backgroundImage: `repeating-linear-gradient(-35deg, ${stripe} 0 40px, transparent 40px 80px)`, transform: `translateX(${(t * 50) % 98}px)`}} /></div>;
};

/* ---------- 分镜和转场 ---------- */
export type Trans = 'cut' | 'whip' | 'whipL' | 'zoom' | 'drop' | 'flash' | 'blur' | 'up';
export type ShotDef = {a: number; b?: number; tr?: Trans; el: React.ReactNode};
const TD = 0.2;
/** 把一串分镜排起来：每个分镜从自己的 a 开始，到下一个分镜的 a 结束；tr 是它进来时用的转场。 */
export const Shots: React.FC<{shots: ShotDef[]; end: number}> = ({shots, end}) => {
  const t = useT();
  const els: React.ReactNode[] = [];
  shots.forEach((s, i) => {
    const b = s.b ?? (i + 1 < shots.length ? shots[i + 1].a : end);
    const trIn = s.tr ?? 'cut', trOut = i + 1 < shots.length ? shots[i + 1].tr ?? 'cut' : 'cut';
    const tail = trOut === 'cut' || trOut === 'flash' ? 0 : TD;
    if (t < s.a || t >= b + tail) return;
    const ki = trIn === 'cut' ? 1 : out5(lin(t, s.a, s.a + TD)), ko = tail ? ease(lin(t, b, b + TD)) : 0;
    let tf = '', fl = '', op = 1;
    const dirBlur = (px: number) => (px > 1 ? `url(#mbx)` : '');
    if (ki < 1) {
      if (trIn === 'whip') { tf += `translateX(${(1 - ki) * W}px) skewX(${-(1 - ki) * 8}deg)`; fl = dirBlur((1 - ki) * 60); }
      if (trIn === 'whipL') { tf += `translateX(${-(1 - ki) * W}px) skewX(${(1 - ki) * 8}deg)`; fl = dirBlur((1 - ki) * 60); }
      if (trIn === 'zoom') { tf += `scale(${mix(0.55, 1, ki)})`; fl = `blur(${(1 - ki) * 22}px)`; op = lin(ki, 0, 0.4); }
      if (trIn === 'drop') { tf += `translateY(${-(1 - ki) * H}px)`; }
      if (trIn === 'up') { tf += `translateY(${(1 - ki) * H}px)`; }
      if (trIn === 'blur') { fl = `blur(${(1 - ki) * 40}px)`; op = ki; }
    }
    if (ko > 0) {
      if (trOut === 'whip') { tf += `translateX(${-ko * W}px) skewX(${-ko * 8}deg)`; fl = dirBlur(ko * 60); }
      if (trOut === 'whipL') { tf += `translateX(${ko * W}px) skewX(${ko * 8}deg)`; fl = dirBlur(ko * 60); }
      if (trOut === 'zoom') { tf += `scale(${mix(1, 2.4, ko)})`; fl = `blur(${ko * 26}px)`; op = 1 - lin(ko, 0.5, 1); }
      if (trOut === 'drop') { tf += `scale(${1 - ko * 0.08})`; fl = `brightness(${1 - ko * 0.5})`; }
      if (trOut === 'up') { tf += `translateY(${-ko * H * 0.3}px)`; fl = `brightness(${1 - ko * 0.5})`; }
      if (trOut === 'blur') { fl = `blur(${ko * 40}px)`; op = 1 - ko; }
    }
    els.push(
      <div key={i} style={{...abs, width: W, height: H, overflow: 'hidden', transform: tf || undefined, filter: fl || undefined, opacity: op, zIndex: i}}>
        {s.el}
        {trIn === 'flash' ? <div style={{...abs, width: W, height: H, background: '#fff', opacity: 1 - out(lin(t, s.a, s.a + 0.22)), pointerEvents: 'none'}} /> : null}
      </div>,
    );
  });
  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}><filter id="mbx" x="-20%" y="0" width="140%" height="100%"><feGaussianBlur stdDeviation="46 0" /></filter></svg>
      {els}
    </>
  );
};
