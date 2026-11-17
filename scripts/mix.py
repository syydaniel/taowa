"""配乐拼接 + 音效轨：  taowa.py mix   → out/bed.wav、out/sfx.wav
全部照这一集的 cues.json 来（时间写法见 common.Clock）：
  plan  配乐分段：[{"from": "0", "to": "b01-0.2", "bed": "groove", "offset": 0, "gain": 0}, …]；两段之间留空就是"停乐"
  sfx   音效点：  [{"at": "a01:出大事了", "name": "hit"}, …]；name 写 sw / hit 会在同类里轮着用
  auto  {"line_whoosh": true 每句开头一声甩动, "chapter_sub": true 每章开头一声低频}"""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from common import cfg, ep, Clock, log

C, E = cfg(), ep()
CK = Clock(E); TL = CK.tl
CUES = json.load(open(E / 'cues.json'))
SR = 48000
DUR = TL['duration']; N = int(DUR * SR) + SR

def load(p):
    a, sr = sf.read(p, always_2d=True)
    assert sr == SR, f'{p} 的采样率是 {sr}，需要 48000（用 ffmpeg -ar 48000 转一下）'
    return (a if a.shape[1] == 2 else np.repeat(a, 2, 1)).astype(np.float32)
def rms_db(a): return 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-9)

# ---- 配乐：各段先拉到同一音量，按 plan 拼，交界处交叉淡化
names = sorted({p['bed'] for p in CUES.get('plan', [])})
beds = {n: load(E / f'music/{n}.wav') for n in names}
for n, a in beds.items(): beds[n] = a * 10 ** ((-20 - rms_db(a)) / 20)
bed = np.zeros((N, 2), np.float32); X = 0.5
for p in CUES.get('plan', []):
    a, b = CK.at(p['from']), min(DUR, CK.at(p['to']))
    if b <= a: continue
    i0, i1 = int(max(0, a - X / 2) * SR), int(min(DUR, b + X / 2) * SR)
    src = beds[p['bed']]; j0 = int(p.get('offset', 0) * SR)
    seg = np.take(src, np.arange(j0, j0 + i1 - i0) % len(src), axis=0) * 10 ** (p.get('gain', 0) / 20)
    f = int(X * SR); env = np.ones(len(seg), np.float32)
    if a > 0: env[:f] = np.linspace(0, 1, f) ** 0.5
    env[-f:] = np.linspace(1, 0, f) ** 0.5
    bed[i0:i1] += seg * env[:, None]
fo = int(4 * SR); e0 = int(DUR * SR) - fo; bed[e0:e0 + fo] *= np.linspace(1, 0, fo)[:, None]; bed[e0 + fo:] = 0
sf.write(E / 'out/bed.wav', bed, SR)

# ---- 音效
def lead(a):   # 裁掉开头的静音
    m = np.abs(a).max(axis=1); i = int(np.argmax(m > 0.06 * m.max())); return a[max(0, i - 200):]
sdir = Path(C['sfx_dir']) if C.get('sfx_dir') and Path(C['sfx_dir']).exists() else E / 'music/sfx'
assert sdir.exists() and list(sdir.glob('*.wav')), f'没有音效文件：在 config.json 里填 sfx_dir，或者先跑 taowa.py sfx-synth {E / "music/sfx"}'
fx = {p.stem: lead(load(p)) for p in sdir.glob('*.wav')}
DEF = {'sw': (0.7, -17, 0.12), 'hit': (1.3, -13, 0), 'sub': (1.6, -11, 0.15), 'glitch': (0.9, -16, 0), 'sparkle': (1.6, -17, 0), 'rev': (1.7, -15, 1.6)}   # 时长、峰值 dB、提前量
fam = lambda n: n.rstrip('0123456789')
group = {}
for n in sorted(fx): group.setdefault(fam(n), []).append(n)
turn = {}
sfx = np.zeros((N, 2), np.float32); count = {}
def put(name, t, d=None, db=None, pre=None):
    f = fam(name)
    if name not in fx:   # 写的是一类（sw / hit）：同类里轮着用
        g = group[f]; name = g[turn.get(f, 0) % len(g)]; turn[f] = turn.get(f, 0) + 1
    dd, ddb, dpre = DEF.get(f, (1.0, -15, 0))
    d, db, pre = d or dd, ddb if db is None else db, dpre if pre is None else pre
    a = fx[name][:int(d * SR)].copy(); k = int(len(a) * 0.4); a[-k:] *= np.linspace(1, 0, k)[:, None]
    a *= 10 ** ((db - 20 * np.log10(np.abs(a).max() + 1e-9)) / 20)
    i = int(max(0, t - pre) * SR); sfx[i:i + len(a)] += a[:N - i]; count[f] = count.get(f, 0) + 1
auto = CUES.get('auto', {})
keys = list(TL['lines'])
if auto.get('line_whoosh', True):
    for k in keys[1:]: put('sw', TL['lines'][k]['start'] - 0.1)
if auto.get('chapter_sub', True):
    for ch in TL['chapters'][1:]: put('sub', ch['start'])
for s in sorted(CUES.get('sfx', []), key=lambda s: CK.at(s['at'])):
    put(s['name'], CK.at(s['at']), s.get('dur'), s.get('db'), s.get('pre'))
sf.write(E / 'out/sfx.wav', sfx, SR)
msg = f"配乐 {len(CUES.get('plan', []))} 段（{'、'.join(names)}），音效 {sum(count.values())} 处 {count}"
print(msg, '｜bed', round(rms_db(bed), 1), 'dB，sfx 峰值', round(float(np.abs(sfx).max()), 2)); log(E, '4-声音', '混音素材：' + msg)
