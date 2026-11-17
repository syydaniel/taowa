/* 积木块：讲 skill 的视频里反复出现的那几种画面。写分镜表（board.tsx）时直接拿来用，参数里的时间都是绝对秒数，
   用 T('a01') / K('a01', '关键词') 取。底层零件在 kit.tsx，颜色和圆角在 theme.ts。
   Bg 底 · Win 窗口 · Nest 层层嵌套 · BigLines 大字钩子 · Say 一句话 · Chips 标签串 · Steps 流程 · Term 终端回放 · FileView 文件圈画
   · Compare 左右对比 · Stats 数字 · Bars 条形对比 · StrikeList 划掉的句子 · Chat 对话 · Quote 引文 · Checklist 检查单
   · Media 截图 / 录屏 · Triple 三连 · CommentBox 评论区口令 · Chapter 章节横幅 · EndCard 片尾卡 */
import React from 'react';
import {Img, OffthreadVideo, Sequence} from 'remotion';
import {C, F, FPS, H, W, asset, clamp, ease, hash, kf, lin, mix, out5, sp, useT} from './base';
import {THEME} from './theme';
import {Counter, Mark, Pop, ShotDef, Trans, Txt} from './kit';

const abs: React.CSSProperties = {position: 'absolute', left: 0, top: 0};
const TF = F[THEME.titleFont];
/** 分镜表里的一行：从 a 秒开始显示 el，tr 是进来时的转场。 */
export const S = (a: number, el: React.ReactNode, tr?: Trans): ShotDef => ({a, el, tr});

/* ---------- 底 ---------- */
export const Bg: React.FC<{v?: 'dark' | 'paper' | 'acc'; motif?: boolean}> = ({v = 'dark', motif = true}) => {
  const t = useT();
  const base = v === 'dark' ? C.dark : v === 'paper' ? C.paper : C.acc;
  const line = v === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)';
  return (
    <div style={{...abs, width: W, height: H, background: base, overflow: 'hidden'}}>
      {v === 'dark' ? <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 42%, ${THEME.glow} 0%, rgba(0,0,0,0) 64%)`}} /> : null}
      {motif && THEME.motif === 'rings' ? [0, 1, 2, 3, 4, 5].map((i) => {
        const k = (t * 0.04 + i / 6) % 1;
        return <div key={i} style={{position: 'absolute', left: W * 0.05, top: H * 0.05, width: W * 0.9, height: H * 0.9, border: `3px solid ${line}`, borderRadius: 70, transform: `scale(${0.2 + k * 1.5})`, opacity: Math.sin(k * Math.PI)}} />;
      }) : null}
      {motif && THEME.motif === 'dots' ? <div style={{position: 'absolute', inset: -40, backgroundImage: `radial-gradient(${line} 2.5px, transparent 3px)`, backgroundSize: '34px 34px', transform: `translate(${(t * 6) % 34}px, ${(t * 4) % 34}px)`}} /> : null}
      {motif && THEME.motif === 'grid' ? <div style={{position: 'absolute', inset: -60, backgroundImage: `linear-gradient(${line} 2px, transparent 2px), linear-gradient(90deg, ${line} 2px, transparent 2px)`, backgroundSize: '60px 60px', transform: `translateY(${(t * 10) % 60}px)`}} /> : null}
    </div>
  );
};

/* ---------- 窗口 ---------- */
export const Win: React.FC<{w: number; h: number; title?: string; dark?: boolean; pad?: number; bar?: string; children?: React.ReactNode}> = ({w, h, title = '', dark, pad = 0, bar, children}) => (
  <div style={{width: w, height: h, borderRadius: THEME.radius, border: `${THEME.border}px solid ${C.ink}`, boxShadow: THEME.shadow, overflow: 'hidden', background: dark ? '#0E0D1C' : C.paper, position: 'relative'}}>
    <div style={{height: 56, background: bar ?? C.ink, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 22}}>
      {[C.acc, C.hi, C.blue].map((c, i) => <div key={i} style={{width: 17, height: 17, borderRadius: 9, background: c}} />)}
      <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,.82)', marginLeft: 14, whiteSpace: 'nowrap'}}>{title}</div>
    </div>
    <div style={{position: 'absolute', left: 0, top: 56, width: w - THEME.border * 2, height: h - 56 - THEME.border * 2, padding: pad, boxSizing: 'border-box', overflow: 'hidden'}}>{children}</div>
  </div>
);

/** 层层嵌套：labels 从外到内，每层在自己的时刻套进来；children 放在最里面（里面的 Pop 写 x={0} y={0}）。 */
export const Nest: React.FC<{layers: {at: number; label: string; col?: string}[]; w?: number; h?: number; x?: number; y?: number; step?: number; children?: React.ReactNode}> = ({layers, w = 1560, h = 800, x = W / 2, y = H / 2 - 20, step = 84, children}) => {
  const t = useT();
  const cols = [C.acc, C.hi, C.blue, C.paper];
  return (
    <div style={{...abs, width: W, height: H}}>
      {layers.map((l, i) => {
        const k = sp(t, l.at, 12, 150, 0.7); if (k <= 0) return null;
        const ww = w - i * step * 2.1, hh = h - i * step * 1.5, col = l.col ?? cols[i % cols.length];
        return (
          <div key={i} style={{position: 'absolute', left: x - ww / 2, top: y - hh / 2, width: ww, height: hh, borderRadius: THEME.radius + 26 - i * 6, border: `${THEME.border + 2}px solid ${C.ink}`, background: col, boxShadow: THEME.shadow, transform: `scale(${mix(1.5, 1, Math.min(1.06, k))})`, opacity: Math.min(1, k * 2)}}>
            <div style={{position: 'absolute', left: 36, top: 8, fontFamily: TF, fontSize: 44, color: col === C.paper || col === C.hi ? C.ink : '#fff', whiteSpace: 'nowrap'}}>{l.label}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: x, top: y + layers.length * step * 0.3, width: 0, height: 0}}>{children}</div>   {/* children 里的 Pop 用 x={0} y={0} */}
    </div>
  );
};

/* ---------- 文字 ---------- */
const hiText = (text: string, hi: string | undefined, at: number, col: string) => {
  const i = hi ? text.indexOf(hi) : -1;
  if (i < 0) return text;
  const a = text.slice(0, i), b = text.slice(i + hi!.length);
  return <>{a}<Mark at={at} col={col} ink={col === C.hi ? C.ink : '#fff'}>{hi}</Mark>{b}</>;
};
/** 大字钩子：一行一行砸进来。hi 是这一行里要划重点的词。 */
export const BigLines: React.FC<{lines: {at: number; text: string; hi?: string; size?: number; col?: string}[]; y?: number; gap?: number; col?: string; x?: number}> = ({lines, y = H / 2, gap = 1.28, col = '#fff', x = W / 2}) => {
  const hs = lines.map((l) => (l.size ?? 120) * gap); const tot = hs.reduce((a, b) => a + b, 0);
  let yy = y - tot / 2;
  return (
    <>
      {lines.map((l, i) => {
        const cy = yy + hs[i] / 2; yy += hs[i];
        return (
          <Pop key={i} at={l.at} x={x} y={cy} from="slam" float={0.5} seed={i + 1}>
            <div style={{fontFamily: TF, fontSize: l.size ?? 120, lineHeight: 1.1, color: l.col ?? col, whiteSpace: 'nowrap', textShadow: '0 8px 0 rgba(0,0,0,.35)'}}>{hiText(l.text, l.hi, l.at + 0.25, C.acc)}</div>
          </Pop>
        );
      })}
    </>
  );
};
/** 一句话 + 划重点。放在画面里当小标题或者注解。 */
export const Say: React.FC<{at: number; out?: number; text: string; hi?: string; size?: number; x?: number; y?: number; col?: string; bg?: string; from?: any; rot?: number}> = ({at, out, text, hi, size = 64, x = W / 2, y = 160, col = '#fff', bg, from = 'up', rot = 0}) => (
  <Pop at={at} out={out} x={x} y={y} from={from} rot={rot} float={0.4}>
    <div style={{fontFamily: TF, fontSize: size, color: col, background: bg, padding: bg ? '0.14em 0.5em' : 0, borderRadius: bg ? THEME.radius / 2 : 0, border: bg ? `${THEME.border - 1}px solid ${C.ink}` : undefined, whiteSpace: 'nowrap', lineHeight: 1.15}}>{hiText(text, hi, at + 0.3, bg === C.hi || col === '#fff' || col === C.hi ? C.acc : C.hi)}</div>
  </Pop>
);
/** 一串标签，一个一个蹦出来。 */
export const Chips: React.FC<{items: {at: number; text: string; col?: string}[]; y?: number; size?: number; w?: number}> = ({items, y = H / 2, size = 44, w = 1500}) => (
  <div style={{...abs, left: (W - w) / 2, top: y, width: w, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', transform: 'translateY(-50%)'}}>
    {items.map((it, i) => <Chip key={i} {...it} size={size} seed={i} />)}
  </div>
);
const Chip: React.FC<{at: number; text: string; col?: string; size: number; seed: number}> = ({at, text, col, size, seed}) => {
  const t = useT(); const k = sp(t, at);
  return <div style={{fontFamily: F.body, fontWeight: 700, fontSize: size, padding: '0.22em 0.7em', borderRadius: 999, background: col ?? C.paper, color: col && col !== C.paper && col !== C.hi ? '#fff' : C.ink, border: `${THEME.border - 2}px solid ${C.ink}`, transform: `scale(${Math.max(0, k)}) rotate(${(hash(seed) - 0.5) * 6}deg)`, opacity: k > 0 ? 1 : 0, whiteSpace: 'nowrap'}}>{text}</div>;
};

/* ---------- 流程 ---------- */
/** 一排步骤卡片，到点一个个亮起来；stop 的那几步头上顶一个"等你点头"。 */
export const Steps: React.FC<{items: {at: number; label: string; icon?: string; sub?: string; stop?: boolean | number}[]; y?: number; w?: number; stopText?: string; dark?: boolean; hold?: boolean}> = ({items, y = H / 2, w = 1700, stopText = '停 · 等你点头', dark = true, hold}) => {
  const t = useT(); const n = items.length; const cw = Math.min(250, (w - (n - 1) * 30) / n), gap = (w - cw * n) / Math.max(1, n - 1);
  const cur = hold ? -2 : items.reduce((a, it, i) => (t >= it.at ? i : a), -1);   // hold：只摆出来，不逐个点亮
  const x0 = (W - w) / 2;
  const prog = cur < 0 ? 0 : cur + ease(lin(t, items[cur].at, items[cur].at + 0.35));
  return (
    <div style={{...abs, width: W, height: H}}>
      <div style={{position: 'absolute', left: x0 + cw / 2, top: y - 5, width: w - cw, height: 10, borderRadius: 5, background: dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.12)'}} />
      <div style={{position: 'absolute', left: x0 + cw / 2, top: y - 5, width: clamp((prog - 1) / Math.max(1, n - 1)) * (w - cw), height: 10, borderRadius: 5, background: C.hi}} />
      {items.map((it, i) => {
        const k = sp(t, it.at); if (k <= 0) return null;
        const on = i === cur, done = cur >= 0 && i < cur;
        return (
          <div key={i} style={{position: 'absolute', left: x0 + i * (cw + gap), top: y - cw * 0.62, width: cw, height: cw * 1.24, transform: `scale(${Math.min(1.1, k) * (on ? 1.1 : 1)}) translateY(${on ? -14 : 0}px)`, transformOrigin: 'center'}}>
            <div style={{width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: THEME.radius, border: `${THEME.border}px solid ${C.ink}`, background: on ? C.hi : done ? C.paper2 : C.paper, boxShadow: THEME.shadow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6}}>
              <div style={{fontSize: cw * 0.34, lineHeight: 1}}>{it.icon ?? i + 1}</div>
              <div style={{fontFamily: TF, fontSize: cw * 0.2, color: C.ink, whiteSpace: 'nowrap'}}>{it.label}</div>
              {it.sub ? <div style={{fontFamily: F.body, fontWeight: 600, fontSize: cw * 0.1, color: 'rgba(0,0,0,.6)', whiteSpace: 'nowrap'}}>{it.sub}</div> : null}
            </div>
            <div style={{position: 'absolute', left: -14, top: -14, width: 46, height: 46, borderRadius: 23, background: done ? C.blue : C.ink, color: '#fff', fontFamily: F.mono, fontWeight: 700, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${C.paper}`}}>{done ? '✓' : i + 1}</div>
            {it.stop ? <div style={{position: 'absolute', left: '50%', top: -70, transform: `translateX(-50%) scale(${sp(t, typeof it.stop === 'number' ? it.stop : it.at + 0.25)}) rotate(-4deg)`, background: C.acc, color: '#fff', fontFamily: F.body, fontWeight: 700, fontSize: 30, padding: '4px 16px', borderRadius: 999, border: `3px solid ${C.ink}`, whiteSpace: 'nowrap'}}>✋ {stopText}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- 终端回放 ---------- */
/** 回放 term/*.json 里录下来的真实命令和输出。从 at 开始，用 dur 秒放完。hl：到某一刻，把含 match 的那一行标出来。 */
export const Term: React.FC<{log: any; at: number; dur: number; w?: number; h?: number; title?: string; size?: number; hl?: {at: number; match: string}[]}> = ({log, at, dur, w = 1320, h = 720, title, size = 27, hl = []}) => {
  const t = useT();
  const ev = log.events as any[];
  const units = ev.map((e) => 0.6 + e.cmd.length / 26 + e.lines.length * 0.11);
  const tot = units.reduce((a, b) => a + b, 0);
  const rows: {text: string; t: number; cmd?: boolean; td?: number; fail?: boolean}[] = [];
  let u0 = 0;
  ev.forEach((e, i) => {
    const s = at + (dur * u0) / tot, d = (dur * units[i]) / tot;
    const td = (d * (e.cmd.length / 26 + 0.15)) / units[i];
    rows.push({text: e.cmd, t: s, cmd: true, td});
    const l0 = s + td + (d * 0.2) / units[i], l1 = s + d - (d * 0.15) / units[i];
    (e.lines as any[]).forEach((ln, j) => rows.push({text: ln.text, t: mix(l0, l1, j / Math.max(1, e.lines.length)), fail: e.code !== 0 && j === e.lines.length - 1}));
    u0 += units[i];
  });
  const lh = size * 1.52, max = Math.floor((h - 56 - 44) / lh);
  const vis = rows.filter((r) => t >= r.t).slice(-max);
  return (
    <Win w={w} h={h} dark title={title ?? `${log.cwd} — zsh`}>
      <div style={{padding: '20px 30px', fontFamily: F.mono, fontSize: size, lineHeight: `${lh}px`, color: '#D9D6EA'}}>
        {vis.map((r, i) => {
          const mark = hl.find((x) => t >= x.at && r.text.includes(x.match));
          if (r.cmd) {
            const n = Math.floor(clamp((t - r.t) / Math.max(0.01, r.td!)) * r.text.length);
            return <div key={i} style={{whiteSpace: 'pre', color: '#fff', fontWeight: 700}}><span style={{color: C.hi}}>❯ </span>{r.text.slice(0, n)}{n < r.text.length && Math.floor(t * 4) % 2 ? '▋' : ''}</div>;
          }
          return <div key={i} style={{whiteSpace: 'pre', overflow: 'hidden', color: mark ? C.ink : r.fail ? '#FF8A7A' : undefined, background: mark ? C.hi : undefined, fontWeight: mark ? 700 : 400, borderRadius: 6, margin: mark ? '0 -10px' : 0, padding: mark ? '0 10px' : 0, opacity: lin(t, r.t, r.t + 0.08)}}>{r.text || ' '}</div>;
        })}
      </div>
    </Win>
  );
};

/* ---------- 文件圈画 ---------- */
/** 展示一份真实文件（term/*.json，用 taowa.py term 名字 --file 路径 录）。focus：到某一刻，滚到第 line 行并点亮 n 行，旁边可以贴一句批注。 */
export const FileView: React.FC<{file: any; at: number; w?: number; h?: number; size?: number; focus?: {at: number; line: number; n?: number; note?: string}[]}> = ({file, at, w = 1200, h = 760, size = 27, focus = []}) => {
  const t = useT();
  const lines = file.lines as string[], first = file.start ?? 1;
  const lh = size * 1.55, rows = Math.floor((h - 56 - 40) / lh);
  const pts: [number, number][] = [[at, 0], ...focus.map((f) => [f.at + 0.45, clamp(f.line - first - 2, 0, Math.max(0, lines.length - rows))] as [number, number])];
  const sc = kf(t, pts.flatMap(([a, v], i) => (i === 0 ? [[a, v]] : [[a - 0.45, pts[i - 1][1]], [a, v]])) as [number, number][], ease);
  const cur = [...focus].reverse().find((f) => t >= f.at);
  return (
    <div style={{position: 'relative', width: w, height: h}}>
      <Win w={w} h={h} title={file.name}>
        <div style={{padding: '18px 0', transform: `translateY(${-sc * lh}px)`, fontFamily: F.mono, fontSize: size, lineHeight: `${lh}px`}}>
          {lines.map((ln, i) => {
            const no = i + first, on = cur && no >= cur.line && no < cur.line + (cur.n ?? 1);
            const k = cur && on ? ease(lin(t, cur.at + 0.3, cur.at + 0.6)) : 0;
            const head = /^#{1,6} /.test(ln), fm = /^---/.test(ln) || /^[a-z_]+:/.test(ln) && no < 8;
            return (
              <div key={i} style={{display: 'flex', whiteSpace: 'pre', background: on ? `rgba(245,184,61,${0.5 * k})` : undefined, borderLeft: `10px solid ${on ? C.acc : 'transparent'}`, opacity: cur && !on ? mix(1, 0.38, ease(lin(t, cur.at, cur.at + 0.4))) : 1}}>
                <span style={{width: 70, textAlign: 'right', color: 'rgba(0,0,0,.3)', marginRight: 24, flexShrink: 0}}>{no}</span>
                <span style={{color: head ? C.acc : fm ? C.blue : C.ink, fontWeight: head || on ? 700 : 400, overflow: 'hidden'}}>{ln || ' '}</span>
              </div>
            );
          })}
        </div>
      </Win>
      {focus.map((f, i) => (f.note && t >= f.at + 0.5 && (!focus[i + 1] || t < focus[i + 1].at) ? (
        <div key={i} style={{position: 'absolute', right: -40, top: 56 + 18 + (f.line - first - sc + (f.n ?? 1) / 2) * lh - 34, transform: `translateX(${(1 - sp(t, f.at + 0.5)) * 80}px) rotate(3deg)`, opacity: Math.min(1, sp(t, f.at + 0.5) * 2), background: C.acc, color: '#fff', fontFamily: TF, fontSize: 38, padding: '8px 22px', borderRadius: 16, border: `4px solid ${C.ink}`, whiteSpace: 'nowrap', boxShadow: '0 12px 30px rgba(0,0,0,.35)'}}>{f.note}</div>
      ) : null))}
    </div>
  );
};

/* ---------- 左右对比 ---------- */
export const Compare: React.FC<{at: number; lt: string; rt: string; l: React.ReactNode; r: React.ReactNode; rAt?: number; w?: number; h?: number}> = ({at, lt, rt, l, r, rAt, w = 800, h = 620}) => {
  const t = useT(); const ra = rAt ?? at + 0.4;
  const side = (title: string, el: React.ReactNode, a: number, x: number, good: boolean) => (
    <Pop at={a} x={x} y={H / 2 + 30} from={good ? 'right' : 'left'} float={0.3} seed={good ? 2 : 1}>
      <div style={{position: 'relative'}}>
        <div style={{width: w, height: h, borderRadius: THEME.radius, border: `${THEME.border}px solid ${C.ink}`, background: good ? C.paper : C.paper2, boxShadow: THEME.shadow, overflow: 'hidden', filter: good ? undefined : 'saturate(.35)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{el}</div>
        <div style={{position: 'absolute', left: 30, top: -34, background: good ? C.acc : C.ink, color: '#fff', fontFamily: TF, fontSize: 44, padding: '4px 26px', borderRadius: 999, border: `4px solid ${C.ink}`}}>{title}</div>
      </div>
    </Pop>
  );
  return <>{side(lt, l, at, W / 2 - w / 2 - 40, false)}{side(rt, r, ra, W / 2 + w / 2 + 40, true)}{t >= ra ? <Pop at={ra + 0.1} from="spin" float={0}><div style={{width: 110, height: 110, borderRadius: 55, background: C.hi, border: `6px solid ${C.ink}`, fontFamily: TF, fontSize: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink}}>VS</div></Pop> : null}</>;
};

/* ---------- 数字 ---------- */
export const Stats: React.FC<{items: {at: number; to: number; label: string; pre?: string; post?: string; fix?: number; col?: string}[]; y?: number; size?: number}> = ({items, y = H / 2, size = 150}) => {
  const n = items.length, cw = Math.min(520, (W - 200 - (n - 1) * 40) / n), x0 = (W - (cw * n + 40 * (n - 1))) / 2;
  return (
    <>
      {items.map((it, i) => (
        <Pop key={i} at={it.at} x={x0 + cw / 2 + i * (cw + 40)} y={y} from="up" seed={i + 1} float={0.5}>
          <div style={{width: cw, boxSizing: 'border-box', padding: '30px 10px 26px', borderRadius: THEME.radius, border: `${THEME.border}px solid ${C.ink}`, background: it.col ?? C.paper, boxShadow: THEME.shadow, textAlign: 'center'}}>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: size * Math.min(1, cw / 440), lineHeight: 1, color: it.col && it.col !== C.paper && it.col !== C.hi ? '#fff' : C.acc, whiteSpace: 'nowrap'}}><Counter at={it.at} to={it.to} fix={it.fix} pre={it.pre} post={it.post} /></div>
            <div style={{fontFamily: TF, fontSize: 44, color: it.col && it.col !== C.paper && it.col !== C.hi ? '#fff' : C.ink, marginTop: 14, whiteSpace: 'nowrap'}}>{it.label}</div>
          </div>
        </Pop>
      ))}
    </>
  );
};

/* ---------- 条形对比 ---------- */
/** 几个数放在一起比。每一条在自己的时刻长出来；note 是条尾的批注；strike 是这一条被划掉的时刻（"这把尺子不算数"）。 */
export const Bars: React.FC<{items: {at: number; label: string; v: number; col?: string; note?: string; noteAt?: number; strike?: number}[]; max: number; post?: string; fix?: number; y?: number; w?: number; rowH?: number; dark?: boolean; labelW?: number; dx?: number}> = ({items, max, post = '', fix = 0, y = H / 2, w = 900, rowH = 118, dark = true, labelW = 470, dx = 0}) => {
  const t = useT(); const x0 = (W - w - labelW - 40) / 2 + dx, y0 = y - (items.length * rowH) / 2;
  return (
    <div style={{...abs, width: W, height: H}}>
      {items.map((it, i) => {
        if (t < it.at) return null;
        const k = out5(lin(t, it.at, it.at + 0.55)), dead = it.strike !== undefined && t >= it.strike, kd = dead ? ease(lin(t, it.strike!, it.strike! + 0.3)) : 0;
        return (
          <div key={i} style={{position: 'absolute', left: x0, top: y0 + i * rowH, height: rowH - 26, display: 'flex', alignItems: 'center', opacity: (1 - 0.55 * kd) * Math.min(1, lin(t, it.at, it.at + 0.1))}}>
            <div style={{width: labelW, textAlign: 'right', marginRight: 40, fontFamily: TF, fontSize: 46, color: dark ? '#fff' : C.ink, whiteSpace: 'nowrap'}}><span style={{position: 'relative', display: 'inline-block'}}>{it.label}
              {dead ? <span style={{position: 'absolute', left: 0, top: '52%', height: 7, width: `${kd * 100}%`, background: C.red, borderRadius: 4}} /> : null}</span></div>
            <div style={{width: Math.max(8, (it.v / max) * w * k), height: rowH - 44, background: it.col ?? C.paper, border: `${THEME.border - 1}px solid ${C.ink}`, borderRadius: THEME.radius / 2, boxSizing: 'border-box'}} />
            <div style={{marginLeft: 24, fontFamily: F.mono, fontWeight: 700, fontSize: 62, color: it.col && it.col !== C.paper ? it.col : dark ? '#fff' : C.ink, whiteSpace: 'nowrap'}}>{(it.v * k).toFixed(fix)}{post}</div>
            {it.note && t >= (it.noteAt ?? it.at + 0.5) ? <div style={{marginLeft: 26, background: C.acc, color: '#fff', fontFamily: TF, fontSize: 36, padding: '4px 20px', borderRadius: 999, border: `4px solid ${C.ink}`, whiteSpace: 'nowrap', transform: `scale(${sp(t, it.noteAt ?? it.at + 0.5)}) rotate(-3deg)`}}>{it.note}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- 划掉的句子 ---------- */
export const StrikeList: React.FC<{items: {at: number; text: string}[]; strike: number; y?: number; size?: number; gap?: number}> = ({items, strike, y = H / 2, size = 56, gap = 132}) => {
  const t = useT();
  return (
    <>
      {items.map((it, i) => {
        const ks = ease(lin(t, strike + i * 0.18, strike + i * 0.18 + 0.3));
        return (
          <Pop key={i} at={it.at} x={W / 2} y={y + (i - (items.length - 1) / 2) * gap} from={i % 2 ? 'right' : 'left'} seed={i + 1} float={0.3} rot={(hash(i + 3) - 0.5) * 3}>
            <div style={{position: 'relative', fontFamily: F.body, fontWeight: 700, fontSize: size, color: C.ink, background: C.paper, padding: '14px 40px', borderRadius: THEME.radius / 1.5, border: `${THEME.border - 1}px solid ${C.ink}`, boxShadow: THEME.shadow, whiteSpace: 'nowrap', opacity: 1 - 0.45 * ks}}>
              {it.text}
              <div style={{position: 'absolute', left: 24, top: '50%', height: 9, marginTop: -4, width: `calc(${ks * 100}% - ${48 * ks}px)`, background: C.red, borderRadius: 5}} />
            </div>
          </Pop>
        );
      })}
    </>
  );
};

/* ---------- 对话 ---------- */
/** 一来一回的对话。who：me 靠右（打字出来）、ai 靠左、sys 居中的小字。只放真实说过的话。 */
export const Chat: React.FC<{msgs: {at: number; who: 'me' | 'ai' | 'sys'; text: string}[]; w?: number; y?: number; size?: number; meName?: string; aiName?: string}> = ({msgs, w = 1300, y = H / 2, size = 50, meName = '我', aiName = 'Claude Code'}) => {
  const t = useT();
  return (
    <div style={{...abs, left: (W - w) / 2, top: y, width: w, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 26}}>
      {msgs.map((m, i) => {
        const k = sp(t, m.at); if (k <= 0) return null;
        if (m.who === 'sys') return <div key={i} style={{alignSelf: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: size * 0.56, color: 'rgba(255,255,255,.75)', background: 'rgba(255,255,255,.1)', padding: '6px 22px', borderRadius: 999, opacity: Math.min(1, k)}}>{m.text}</div>;
        const me = m.who === 'me', n = me ? Math.floor(clamp((t - m.at - 0.1) * 20 / Math.max(1, m.text.length)) * m.text.length) : m.text.length;
        return (
          <div key={i} style={{alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: w * 0.82, transform: `scale(${Math.min(1.04, k)})`, transformOrigin: me ? 'right bottom' : 'left bottom'}}>
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: size * 0.44, color: 'rgba(255,255,255,.65)', textAlign: me ? 'right' : 'left', margin: '0 18px 6px'}}>{me ? meName : aiName}</div>
            <div style={{fontFamily: F.body, fontWeight: 700, fontSize: size, lineHeight: 1.3, color: me ? '#fff' : C.ink, background: me ? C.acc : C.paper, padding: '16px 34px', borderRadius: THEME.radius, border: `${THEME.border - 1}px solid ${C.ink}`, boxShadow: THEME.shadow}}>{m.text.slice(0, n) || ' '}{me && n < m.text.length ? '▍' : ''}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- 引文 ---------- */
/** 一句引来的话，宋体，逐字显出来。by 写出处，要查准。 */
export const Quote: React.FC<{at: number; text: string; by: string; size?: number; y?: number}> = ({at, text, by, size = 150, y = H / 2 - 40}) => {
  const t = useT();
  return (
    <div style={{...abs, width: W, top: y, transform: 'translateY(-50%)', textAlign: 'center'}}>
      <div style={{fontFamily: F.song, fontWeight: 900, fontSize: size, color: C.paper, letterSpacing: size * 0.08, whiteSpace: 'nowrap'}}>
        <span style={{color: C.hi, opacity: lin(t, at - 0.2, at)}}>「</span>
        {[...text].map((ch, i) => { const k = ease(lin(t, at + i * 0.09, at + i * 0.09 + 0.35)); return <span key={i} style={{opacity: k, display: 'inline-block', transform: `translateY(${(1 - k) * 26}px)`, filter: `blur(${(1 - k) * 8}px)`}}>{ch}</span>; })}
        <span style={{color: C.hi, opacity: lin(t, at + text.length * 0.09, at + text.length * 0.09 + 0.3)}}>」</span>
      </div>
      <div style={{fontFamily: F.body, fontWeight: 600, fontSize: size * 0.24, color: C.hi, marginTop: size * 0.22, opacity: lin(t, at + text.length * 0.09 + 0.2, at + text.length * 0.09 + 0.6), letterSpacing: 4}}>{by}</div>
    </div>
  );
};

/* ---------- 检查单 ---------- */
export const Checklist: React.FC<{at: number; title?: string; items: {at: number; text: string; ok?: boolean}[]; w?: number; size?: number; y?: number}> = ({at, title = '检查', items, w = 1100, size = 46, y = H / 2}) => {
  const t = useT();
  return (
    <Pop at={at} y={y} from="up" float={0.3}>
      <Win w={w} h={56 + 40 + items.length * (size * 1.9)} title={title}>
        <div style={{padding: '22px 44px'}}>
          {items.map((it, i) => { const k = sp(t, it.at); const ok = it.ok !== false; return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 26, height: size * 1.9, opacity: Math.min(1, k * 2), transform: `translateX(${(1 - Math.min(1, k)) * 60}px)`}}>
              <div style={{width: size * 1.1, height: size * 1.1, borderRadius: size, background: ok ? C.blue : C.red, color: '#fff', fontFamily: F.mono, fontWeight: 700, fontSize: size * 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${sp(t, it.at + 0.2)})`}}>{ok ? '✓' : '✗'}</div>
              <div style={{fontFamily: F.body, fontWeight: 700, fontSize: size, color: C.ink, whiteSpace: 'nowrap'}}>{it.text}</div>
            </div>); })}
        </div>
      </Win>
    </Pop>
  );
};

/* ---------- 截图 / 录屏 ---------- */
/** 把一张图或一段录屏装进窗口。src 相对 public/。cam：[[时刻, 放大倍数, 焦点x(0–1), 焦点y(0–1)], …]，跟着讲的地方推近。 */
export const Media: React.FC<{src: string; at: number; w?: number; h?: number; title?: string; video?: boolean; from?: number; rate?: number; cam?: [number, number, number, number][]}> = ({src, at, w = 1320, h = 800, title, video, from = 0, rate = 1, cam}) => {
  const t = useT();
  const z = cam ? kf(t, cam.map((c) => [c[0], c[1]]) as [number, number][]) : 1, fx = cam ? kf(t, cam.map((c) => [c[0], c[2]]) as [number, number][]) : 0.5, fy = cam ? kf(t, cam.map((c) => [c[0], c[3]]) as [number, number][]) : 0.5;
  const st: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', transform: `scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`};
  return (
    <Win w={w} h={h} title={title ?? src.split('/').pop()}>
      {video ? <Sequence from={Math.round(at * FPS)} layout="none"><OffthreadVideo src={asset(src)} startFrom={Math.round(from * FPS)} playbackRate={rate} muted style={st} /></Sequence> : <Img src={asset(src)} style={st} />}
    </Win>
  );
};

/* ---------- 三连 ---------- */
/** 点赞、收藏、关注三个按钮，到各自的时刻被按下去。 */
export const Triple: React.FC<{at: number; press: [number, number, number]; y?: number; labels?: [string, string, string]}> = ({at, press, y = H / 2, labels = ['点赞', '收藏', '关注']}) => {
  const t = useT(); const icons = ['👍', '⭐', '➕'];
  return (
    <>
      {icons.map((ic, i) => {
        const on = t >= press[i], k = sp(t, press[i], 8, 220, 0.5), x = W / 2 + (i - 1) * 420;
        return (
          <Pop key={i} at={at + i * 0.1} x={x} y={y} from="up" seed={i + 1} float={0.6}>
            <div style={{position: 'relative', width: 300, height: 300}}>
              {on ? <div style={{position: 'absolute', inset: 0, borderRadius: 150, border: `10px solid ${C.hi}`, transform: `scale(${1 + ease(lin(t, press[i], press[i] + 0.5)) * 0.9})`, opacity: 1 - lin(t, press[i], press[i] + 0.5)}} /> : null}
              <div style={{position: 'absolute', inset: 0, borderRadius: 150, background: on ? C.acc : C.paper, border: `${THEME.border + 2}px solid ${C.ink}`, boxShadow: THEME.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 130, transform: `scale(${on ? 0.82 + 0.18 * Math.min(1.2, k) : 1})`}}>{ic}</div>
              <div style={{position: 'absolute', left: 0, width: 300, top: 318, textAlign: 'center', fontFamily: TF, fontSize: 60, color: on ? C.hi : '#fff'}}>{labels[i]}{on ? ' ✓' : ''}</div>
            </div>
          </Pop>
        );
      })}
    </>
  );
};

/* ---------- 评论区口令 ---------- */
/** 一个评论框：at 出现，口令一个字一个字打出来，send 那一刻点发送，然后同一句话像弹幕一样刷过去。 */
export const CommentBox: React.FC<{at: number; send: number; phrase: string; y?: number; hint?: string; echo?: number}> = ({at, send, phrase, y = H / 2, hint = '评论区打这句话，我看到就回', echo = 9}) => {
  const t = useT(); const n = Math.floor(clamp((t - at - 0.4) / Math.max(0.3, send - at - 0.7)) * phrase.length); const sent = t >= send;
  return (
    <>
      {sent ? Array.from({length: echo}).map((_, i) => {
        const t0 = send + 0.15 + i * 0.22, k = lin(t, t0, t0 + 3.6); if (k <= 0 || k >= 1) return null;
        return <div key={i} style={{...abs, left: mix(W + 100, -1100, k), top: [70, 180, 290, 800, 910][i % 5], fontFamily: F.body, fontWeight: 700, fontSize: 46, color: i % 3 === 0 ? C.hi : 'rgba(255,255,255,.85)', whiteSpace: 'nowrap', textShadow: '0 3px 0 rgba(0,0,0,.5)'}}>{phrase}{i % 3 === 1 ? ' +1' : ''}</div>;
      }) : null}
      <Pop at={at} x={W / 2} y={y} from="up" float={0.3}>
        <div style={{width: 1400}}>
          <div style={{fontFamily: TF, fontSize: 54, color: C.hi, marginBottom: 22, textAlign: 'center'}}>{hint}</div>
          <div style={{display: 'flex', gap: 22, alignItems: 'stretch'}}>
            <div style={{flex: 1, background: C.paper, border: `${THEME.border}px solid ${C.ink}`, borderRadius: THEME.radius, boxShadow: THEME.shadow, padding: '34px 40px', fontFamily: F.body, fontWeight: 700, fontSize: 68, color: C.ink, whiteSpace: 'nowrap', minHeight: 100}}>
              {sent ? <span style={{color: 'rgba(0,0,0,.28)'}}>已发送 ✓</span> : <>{phrase.slice(0, n)}<span style={{opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: C.acc}}>|</span></>}
            </div>
            <div style={{width: 230, background: sent ? C.blue : C.acc, border: `${THEME.border}px solid ${C.ink}`, borderRadius: THEME.radius, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TF, fontSize: 62, color: '#fff', transform: `scale(${t >= send - 0.08 && t < send + 0.12 ? 0.9 : 1})`, boxShadow: THEME.shadow}}>发送</div>
          </div>
        </div>
      </Pop>
    </>
  );
};

/* ---------- 章节横幅、片尾卡 ---------- */
export const Chapter: React.FC<{at: number; num: string; title: string; sub?: string; dur?: number}> = ({at, num, title, sub = '', dur = 1.15}) => {
  const t = useT();
  if (t < at || t > at + dur + 0.3) return null;
  const ki = out5(lin(t, at, at + 0.22)), ko = ease(lin(t, at + dur, at + dur + 0.25));
  return (
    <div style={{...abs, width: W, height: H, zIndex: 50, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', inset: 0, background: 'rgba(10,9,24,.6)', opacity: ki * (1 - ko)}} />
      <div style={{position: 'absolute', left: W / 2 - 620, top: H / 2 - 170, width: 1240, height: 340, borderRadius: THEME.radius + 30, background: C.acc, border: `${THEME.border + 4}px solid ${C.ink}`, boxShadow: THEME.shadow, transform: `scale(${mix(0.3, 1, ki) * (1 + ko * 0.6)})`, opacity: ki * (1 - ko), display: 'flex', alignItems: 'center', gap: 44, paddingLeft: 70, boxSizing: 'border-box'}}>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 210, lineHeight: 1, color: C.hi}}>{num}</div>
        <div>
          <div style={{fontFamily: TF, fontSize: 124, lineHeight: 1.1, color: '#fff', whiteSpace: 'nowrap'}}>{title}</div>
          <div style={{fontFamily: F.mono, fontSize: 34, fontWeight: 700, letterSpacing: 6, color: C.ink, marginTop: 6}}>{sub}</div>
        </div>
      </div>
    </div>
  );
};
export const EndCard: React.FC<{at: number; title: string; sub?: string; foot?: string[]}> = ({at, title, sub, foot = []}) => (
  <>
    <Pop at={at + 0.1} y={H / 2 - 110} from="slam" float={0.5}><div style={{fontFamily: TF, fontSize: 150, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 10px 0 rgba(0,0,0,.35)'}}>{title}</div></Pop>
    {sub ? <Pop at={at + 0.5} y={H / 2 + 60} from="up" float={0.4}><div style={{fontFamily: TF, fontSize: 64, color: C.ink, background: C.hi, padding: '8px 36px', borderRadius: 999, border: `5px solid ${C.ink}`, whiteSpace: 'nowrap'}}>{sub}</div></Pop> : null}
    <Pop at={at + 1.0} y={H - 150} from="fade" float={0}><div style={{fontFamily: F.body, fontWeight: 600, fontSize: 26, lineHeight: 1.6, color: 'rgba(255,255,255,.6)', textAlign: 'center', whiteSpace: 'pre'}}>{foot.join('\n')}</div></Pop>
  </>
);
