"""建一集：  taowa.py new <编号_片名> [--theme 主题名]
把 template/ 复制到 <项目根>/productions/<编号_片名>/，选一个主题，装好画面工程的依赖，写 episode.json 和 运行记录.md。"""
import json, shutil, subprocess, sys, time, hashlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import SKILL, cfg

C = cfg()
args = [a for a in sys.argv[1:] if not a.startswith('--')]
assert args, __doc__
name = args[0]
theme = sys.argv[sys.argv.index('--theme') + 1] if '--theme' in sys.argv else 'matryoshka'
E = Path(C['project_root']) / C['productions_dir'] / name
assert not E.exists(), f'{E} 已经存在'
T = SKILL / 'template'
shutil.copytree(T, E, ignore=shutil.ignore_patterns('node_modules', '.DS_Store'))
for d in ('research', 'out', 'music', 'gift', 'vo/me'):
    (E / d).mkdir(parents=True, exist_ok=True)
th = E / 'app/src/themes' / f'{theme}.ts'
assert th.exists(), f'没有这个主题：{theme}（可选：{[p.stem for p in (E / "app/src/themes").glob("*.ts")]}）'
shutil.copyfile(th, E / 'app/src/theme.ts')

# 画面工程的依赖：第一次 npm ci，之后从缓存里克隆（APFS 上 cp -c 不占空间）
lock = (T / 'app/package-lock.json').read_bytes()
cache = Path.home() / '.cache/taowa' / ('node_modules_' + hashlib.md5(lock).hexdigest()[:10])
nm = E / 'app/node_modules'
if cache.exists():
    if subprocess.call(['cp', '-cR', str(cache), str(nm)]) != 0:
        shutil.copytree(cache, nm, symlinks=True)
else:
    print('第一次用：安装画面工程的依赖（npm ci，一两分钟）…', flush=True)
    subprocess.check_call(['npm', 'ci', '--no-audit', '--no-fund'], cwd=E / 'app')
    cache.parent.mkdir(parents=True, exist_ok=True)
    if subprocess.call(['cp', '-cR', str(nm), str(cache)]) != 0:
        shutil.copytree(nm, cache, symlinks=True)

json.dump({'name': name, 'created': time.strftime('%Y-%m-%d %H:%M'), 'theme': theme, 'stage': '1-选题', 'skill': '', 'gates': {'选题': None, '文案': None, '成片': None}},
          open(E / 'episode.json', 'w'), ensure_ascii=False, indent=1)
(E / '运行记录.md').write_text(f'# 运行记录：{name}\n\n每个阶段做了什么、花了多久、哪里卡住、哪里是人动的手，都记在这里。视频里的数字从这里取。\n\n- {time.strftime("%m-%d %H:%M")} 【1-选题】建好目录，主题 {theme}\n')
print('建好了：', E)
