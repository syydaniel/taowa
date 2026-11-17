"""跑真命令，把输出和时间记下来，画面里用 <Term> 回放：
  taowa.py term <名字> [--cwd 目录] [--max 行数] -- "命令一" "命令二" …
  taowa.py term <名字> --file 路径 [--from 起始行] [--to 结束行]     把一份真实文件录下来，画面里用 <FileView> 展示
输出 app/src/term/<名字>.json。家目录会写成 ~，不会把电脑上的用户名带进画面。命令是真跑的，别放有副作用的。"""
import json, os, subprocess, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import ep, log

E = ep()
a = sys.argv[1:]
assert a and ('--' in a or '--file' in a), __doc__
name = a[0]
out = E / 'app/src/term'; out.mkdir(parents=True, exist_ok=True)
if '--file' in a:
    src = Path(os.path.expanduser(a[a.index('--file') + 1])); home = str(Path.home())
    ls = src.read_text().replace(home, '~').split('\n')
    f0 = int(a[a.index('--from') + 1]) if '--from' in a else 1
    f1 = int(a[a.index('--to') + 1]) if '--to' in a else len(ls)
    json.dump({'name': src.name, 'start': f0, 'total': len(ls), 'lines': [x[:110] for x in ls[f0 - 1:f1]]}, open(out / f'{name}.json', 'w'), ensure_ascii=False, indent=1)
    print(f'{src.name}：第 {f0}–{f1} 行（全文 {len(ls)} 行）→ term/{name}.json'); log(E, '5-画面', f'录了真实文件 {src.name} 第 {f0}–{f1} 行'); sys.exit(0)
cmds = a[a.index('--') + 1:]
cwd = a[a.index('--cwd') + 1] if '--cwd' in a else str(E)
mx = int(a[a.index('--max') + 1]) if '--max' in a else 40
home = str(Path.home())
clean = lambda s: s.replace(home, '~').rstrip('\n')
events = []
for cmd in cmds:
    t0 = time.time(); lines = []
    p = subprocess.Popen(cmd, shell=True, cwd=os.path.expanduser(cwd), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors='replace',
                         env={**os.environ, 'PATH': str(Path(__file__).parent) + os.pathsep + os.environ.get('PATH', '')})   # 录的时候可以直接写 taowa <命令>
    for ln in p.stdout:
        lines.append({'t': round(time.time() - t0, 3), 'text': clean(ln)[:160]})
    p.wait()
    if len(lines) > mx:
        cut = len(lines) - mx + 1
        lines = lines[: mx // 2] + [{'t': lines[mx // 2]['t'], 'text': f'… 中间省略 {cut} 行 …'}] + lines[-(mx - mx // 2 - 1):]
    events.append({'cmd': clean(cmd), 'code': p.returncode, 'dur': round(time.time() - t0, 2), 'lines': lines})
    print(f'$ {cmd}\n  → 退出码 {p.returncode}，{len(lines)} 行，{events[-1]["dur"]} 秒')
json.dump({'name': name, 'cwd': clean(os.path.abspath(os.path.expanduser(cwd))), 'recorded': time.strftime('%Y-%m-%d %H:%M'), 'events': events}, open(out / f'{name}.json', 'w'), ensure_ascii=False, indent=1)
log(E, '5-画面', f'录了一段真实命令输出 term/{name}.json（{len(cmds)} 条命令）')
