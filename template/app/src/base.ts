import {spring, useCurrentFrame, staticFile, continueRender, delayRender} from 'remotion';
import {THEME} from './theme';

export const W = 1920, H = 1080, FPS = 30;
/* 颜色全部来自 theme.ts。acc = 主色，hi = 亮色；green / lime 是给 kit.tsx 里老组件用的别名。 */
export const C = {...THEME.C, green: THEME.C.acc, lime: THEME.C.hi};
export const F = {
  hei: "'Noto Sans SC Black','PingFang SC',sans-serif",
  smiley: "'Smiley Sans','PingFang SC',sans-serif",
  body: "'PingFang SC','Noto Sans SC Black',sans-serif",
  mono: "'Menlo','SF Mono',monospace",
  song: "'Songti SC','STSong',serif",
};
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lin = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const out = (k: number) => 1 - Math.pow(1 - k, 3);
export const out5 = (k: number) => 1 - Math.pow(1 - k, 5);
export const back = (k: number, s = 1.9) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const useT = () => useCurrentFrame() / FPS;
/** 带回弹的弹簧 0→1，从 at 秒开始。 */
export const sp = (t: number, at: number, damping = 11, stiffness = 170, mass = 0.6) =>
  t < at ? 0 : spring({frame: (t - at) * FPS, fps: FPS, config: {damping, stiffness, mass}});
/** 多段关键帧：kf=[[时间,值],...]，线性或缓动插值。 */
export const kf = (t: number, pts: [number, number][], fn: (k: number) => number = ease) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return mix(pts[i - 1][1], pts[i][1], fn(lin(t, pts[i - 1][0], pts[i][0])));
  return pts[pts.length - 1][1];
};
export const asset = (p: string) => staticFile(p);

let fontsReady = false;
export function loadFonts() {
  if (fontsReady || typeof document === 'undefined') return;
  fontsReady = true;
  const h = delayRender('fonts');
  const fs = [new FontFace('Noto Sans SC Black', `url(${staticFile('fonts/NotoSansSC-Black.otf')})`), new FontFace('Smiley Sans', `url(${staticFile('fonts/SmileySans-Oblique.ttf.woff2')})`)];
  Promise.all(fs.map((f) => f.load().then((x) => (document.fonts as any).add(x)))).then(() => continueRender(h)).catch(() => continueRender(h));
}
