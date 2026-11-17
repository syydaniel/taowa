"""导出一份可以公开的干净版：  taowa.py export <目标目录>
复制 skill 目录，去掉本机配置（config.json）、本机素材（local/：声音参考音、音效库）、依赖和缓存；
然后逐个文件搜个人路径、邮箱、音频文件、密钥样式的字符串，有一处就报错。只导出，不提交、不推送。"""
import re, shutil, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import SKILL

assert len(sys.argv) > 1, __doc__
D = Path(sys.argv[1]).expanduser().resolve()
extra = [w for w in sys.argv[2:]]          # 额外要搜的词（比如自己的名字、账号名）
if D.exists():
    assert (D / 'SKILL.md').exists() or not any(D.iterdir()), f'{D} 里有别的东西，不敢覆盖'
    for p in D.iterdir():
        if p.name in ('.git', 'README.md', 'LICENSE'): continue   # 仓库自己的文件留着
        shutil.rmtree(p) if p.is_dir() else p.unlink()
D.mkdir(parents=True, exist_ok=True)
skip = shutil.ignore_patterns('config.json', 'local', 'node_modules', '__pycache__', '.DS_Store', '*.pyc', '.cache', 'out')
for p in SKILL.iterdir():
    if p.name in ('config.json', 'local', '.DS_Store', '__pycache__'): continue
    (shutil.copytree(p, D / p.name, ignore=skip) if p.is_dir() else shutil.copyfile(p, D / p.name))

pats = [(r'/Users/[A-Za-z0-9_.-]+', '个人路径'), (r'/home/[a-z][A-Za-z0-9_.-]+/', '个人路径'), (r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(?:com|net|org|cn|io)\b', '邮箱'),
        (r'(?:sk|pk|ghp|gho|xox[bp])[-_][A-Za-z0-9_-]{16,}', '密钥'), (r'(?i)(?:api[_-]?key|secret|token|password)\s*[:=]\s*["\'][^"\']{8,}["\']', '密钥')]
pats += [(re.escape(w), '指定的词') for w in extra]
allow_mail = {'noreply@anthropic.com'}
bad, n = [], 0
for p in sorted(D.rglob('*')):
    if '.git' in p.parts or not p.is_file(): continue
    n += 1
    if p.suffix.lower() in ('.wav', '.mp3', '.m4a', '.flac', '.npy', '.mp4', '.mov'):
        bad.append(f'{p.relative_to(D)}：音视频文件不该在公开版里'); continue
    if p.suffix.lower() in ('.otf', '.ttf', '.woff2', '.png', '.jpg'): continue
    try: txt = p.read_text()
    except UnicodeDecodeError: continue
    for pat, what in pats:
        for m in re.finditer(pat, txt):
            if m.group(0) in allow_mail: continue
            bad.append(f'{p.relative_to(D)}：{what} {m.group(0)[:60]}')
print(f'导出 {n} 个文件 → {D}')
if bad:
    print('不干净，下面这些要处理：'); [print('  ', b) for b in bad]; sys.exit(1)
print('检查通过：没有个人路径、邮箱、音视频文件和密钥样式的字符串。')
