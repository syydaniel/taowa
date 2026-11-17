"""合成一套够用的音效（不用下载任何素材）：  taowa.py sfx-synth <输出目录>
甩动声 sw1–4、砸字的冲击 hit1–3、章节低频 sub、故障声 glitch、亮晶晶 sparkle、反向吸入 rev。48 kHz 立体声。
自己有更好的音效库，就把 config.json 的 sfx_dir 指过去，文件名保持这一套。"""
import sys
from pathlib import Path
import numpy as np, soundfile as sf

SR = 48000
rng = np.random.default_rng(7)
def tt(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.005, curve=4.0):
    e = np.exp(-curve * np.arange(n) / n); k = max(1, int(a * SR)); e[:k] *= np.linspace(0, 1, k); return e
def lp(x, fc):     # 一阶低通
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def bp_sweep(n, f0, f1):   # 扫频带通噪声：把白噪声和一条扫频正弦相乘再低通，得到"呼"的一声
    t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / t[-1]); ph = 2 * np.pi * np.cumsum(f) / SR
    return lp(rng.standard_normal(n), 1800) * np.sin(ph) * 2
def st(x, w=0.0):  # 立体声：w 是左右差
    l, r = x * (1 + w), x * (1 - w); a = np.stack([l, r], 1); return (a / (np.abs(a).max() + 1e-9) * 0.8).astype(np.float32)

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'sfx'); out.mkdir(parents=True, exist_ok=True)
S = {}
for i, (d, f0, f1) in enumerate([(0.6, 300, 5000), (0.5, 4500, 400), (0.4, 600, 7000), (0.45, 6000, 500)], 1):
    n = int(d * SR); w = np.sin(np.pi * np.arange(n) / n) ** 2
    S[f'sw{i}'] = st(bp_sweep(n, f0, f1) * w, 0.25 * (-1) ** i)
for i, (f, d) in enumerate([(62, 1.2), (48, 1.4), (75, 1.0)], 1):
    t = tt(d); body = np.sin(2 * np.pi * (f * t + 40 * (1 - np.exp(-t * 30)) / 30)) * env(len(t), curve=6)
    click = lp(rng.standard_normal(len(t)), 3000) * env(len(t), curve=60)
    S[f'hit{i}'] = st(np.tanh(2.2 * body) + 0.6 * click)
t = tt(1.6); S['sub'] = st(np.sin(2 * np.pi * (38 * t + 22 * (1 - np.exp(-t * 6)) / 6)) * env(len(t), a=0.02, curve=3.5))
t = tt(0.9); g = np.sign(np.sin(2 * np.pi * 110 * t * (1 + 3 * (rng.random(len(t)) > 0.995).cumsum() % 5))) * (rng.random(len(t)) > 0.3)
gate = np.repeat(rng.random(30) > 0.4, len(t) // 30 + 1)[: len(t)]; S['glitch'] = st(lp(g * gate, 5000) * env(len(t), curve=2.5), 0.3)
t = tt(1.6); sp = np.zeros(len(t))
for k in range(14):
    f = rng.choice([2093, 2637, 3136, 3951, 4186, 5274]); t0 = int(rng.uniform(0, 0.9) * SR); m = len(t) - t0
    sp[t0:] += np.sin(2 * np.pi * f * t[:m]) * np.exp(-9 * t[:m]) * rng.uniform(0.4, 1)
S['sparkle'] = st(sp, 0.2)
n = int(1.7 * SR); S['rev'] = st(lp(rng.standard_normal(n), 6000) * (np.arange(n) / n) ** 3, 0.15)
for name, a in S.items():
    sf.write(out / f'{name}.wav', a, SR)
print('写好', len(S), '个音效 →', out)
