"""抽帧拼图，自己看画面：  taowa.py kf <名字> <时间…> [--comp Film] [--bundle bundle]
时间可以写秒数，也可以写 a01 / a01:关键词+0.3 / END-1。加 --lines 会在每句开头后 0.7 秒各抽一帧，专门查镜头开头空不空。输出 out/kf_<名字>.jpg（每张 640 宽，4 列）。
冷启动第一张可能超时，会自动重试一次。正在渲染时，抽帧请用另一个打包目录（--bundle bundle_kf）。"""
import subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import ep, Clock

E = ep()
a = sys.argv[1:]
def opt(k, d):
    if k in a:
        i = a.index(k); v = a[i + 1]; del a[i:i + 2]; return v
    return d
comp, bundle = opt('--comp', 'Film'), opt('--bundle', 'bundle')
ck = Clock(E)
if '--lines' in a:      # 每句开头后 0.7 秒各抽一帧：专门查"镜头刚开始时画面是空的"
    a.remove('--lines'); a += [f'{k}+0.7' for k in ck.tl['lines']]
assert len(a) >= 2, __doc__
name, times = a[0], a[1:]
kf = E / 'out/kf'; kf.mkdir(parents=True, exist_ok=True)
for old in kf.glob(f'{name}_*.jpg'): old.unlink()
ok = 0
for n, x in enumerate(times):
    f = int(round(ck.at(x) * 30)); o = kf / f'{name}_{n:03d}.jpg'
    cmd = ['npx', 'remotion', 'still', str(E / 'out' / bundle), comp, str(o), f'--frame={f}', '--timeout=120000', '--scale=0.5']
    for attempt in (1, 2):
        r = subprocess.run(cmd, cwd=E / 'app', capture_output=True, text=True)
        if r.returncode == 0: ok += 1; break
        if attempt == 2: print(f'失败 {x}（第 {f} 帧）：', (r.stderr or r.stdout)[-400:])
rows = (ok + 3) // 4
sheet = E / f'out/kf_{name}.jpg'
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-pattern_type', 'glob', '-i', str(kf / f'{name}_*.jpg'), '-vf', f'scale=640:360,tile=4x{max(1, rows)}', '-frames:v', '1', '-q:v', '4', str(sheet)])
print('ok', sheet, f'{ok}/{len(times)} 张')
