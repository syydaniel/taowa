"""出发布包：  taowa.py package <编号_片名>   → <项目根>/发布包/<编号_片名>/
成片_1080p.mp4、手机预览_720p.mp4（小于 30 MB）、三张封面（16:9、4:3、3:4）、字幕.srt、发布文案.md、领取包/、运行记录.md。
发布文案.md 和 gift/（要送的 skill 文件夹）要先在这一集的目录里准备好。上传由作者自己来。"""
import json, shutil, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import cfg, ep, log

C, E = cfg(), ep(); O = E / 'out'
assert len(sys.argv) > 1, __doc__
D = Path(C['project_root']) / C['publish_dir'] / sys.argv[1]
assert (O / 'final.mp4').exists(), '还没有 out/final.mp4（先 render 再 final）'
assert (E / '发布文案.md').exists(), '这一集的目录里还没有 发布文案.md'
D.mkdir(parents=True, exist_ok=True)
shutil.copyfile(O / 'final.mp4', D / '成片_1080p.mp4')
# 手机预览：720p，超过 30 MB 就再压
pv = D / '手机预览_720p.mp4'
for crf in (26, 28, 30, 32, 34):
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', str(O / 'final.mp4'), '-vf', 'scale=1280:720,hqdn3d=2:1:3:3', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(pv)])
    mb = pv.stat().st_size / 1e6
    if mb < 30: break
assert mb < 30, f'预览压到 crf 34 还有 {mb:.1f} MB'
# 封面：从画面工程里出静帧
covers = [('CoverA', '封面_16比9_1920x1080.jpg'), ('CoverB', '封面_4比3_1440x1080.jpg'), ('CoverV', '封面_3比4_1080x1440.jpg')]
for comp, fn in covers:
    cmd = ['npx', 'remotion', 'still', str(O / 'bundle'), comp, str(D / fn), '--frame=60', '--timeout=120000', '--jpeg-quality=92']
    if subprocess.run(cmd, cwd=E / 'app', capture_output=True).returncode != 0:
        subprocess.check_call(cmd, cwd=E / 'app')
# 字幕
TL = json.load(open(E / 'app/src/timeline.json'))
ts = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}'
(D / '字幕.srt').write_text(''.join(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n" for i, s in enumerate(TL['subs'], 1)))
shutil.copyfile(E / '发布文案.md', D / '发布文案.md')
shutil.copyfile(E / '运行记录.md', D / '运行记录.md')
if (E / 'gift').exists() and any((E / 'gift').iterdir()):
    shutil.rmtree(D / '领取包', ignore_errors=True)
    shutil.copytree(E / 'gift', D / '领取包', ignore=shutil.ignore_patterns('.DS_Store', 'node_modules', '__pycache__'))
have = sorted(p.name for p in D.iterdir())
msg = f'发布包 {D}：{have}；预览 {mb:.1f} MB'
print(msg); log(E, '6-发布包', msg)
