"""各脚本共用：读配置、找到当前这一集的目录、读写状态、记运行记录。只用标准库。"""
import json, os, re, sys, time
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent


def cfg():
    c = json.load(open(SKILL / 'config.example.json'))
    p = SKILL / 'config.json'
    if p.exists():
        c.update(json.load(open(p)))
    if os.environ.get('TAOWA_ROOT'):          # 临时换一个项目根目录（试跑、验收时用）
        c['project_root'] = os.environ['TAOWA_ROOT']
    for k, v in c.items():
        if isinstance(v, str) and v.startswith('~'):
            c[k] = os.path.expanduser(v)
    return c


def ep():
    """当前这一集的目录：环境变量 TAOWA_EP，或者从当前目录往上找 episode.json。"""
    d = Path(os.environ.get('TAOWA_EP') or os.getcwd()).resolve()
    for x in [d, *d.parents]:
        if (x / 'episode.json').exists():
            return x
    sys.exit('找不到 episode.json：请在某一集的目录里运行，或者设 TAOWA_EP=那一集的目录')


def state(e):
    return json.load(open(e / 'episode.json'))


def save_state(e, s):
    json.dump(s, open(e / 'episode.json', 'w'), ensure_ascii=False, indent=1)


def log(e, stage, msg):
    """往 运行记录.md 追加一行。卡住、人工介入、耗时都记在这里。"""
    with open(e / '运行记录.md', 'a') as f:
        f.write(f"- {time.strftime('%m-%d %H:%M')} 【{stage}】{msg}\n")


def load_lines(e):
    import importlib.util
    spec = importlib.util.spec_from_file_location('lines', e / 'vo/lines.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.LINES, mod.CHAPTERS


def wlen(s):
    return max(1, len(re.sub(r'[^\w]', '', s)))


class Clock:
    """读 timeline.json，把"时间写法"换成秒。
    写法：12.5 | a01（句子开始）| a01$（句子结束）| a01:关键词 | END（片尾卡）| DUR（全片结束），后面可以跟 +0.3 / -0.2。"""

    def __init__(self, e):
        self.tl = json.load(open(e / 'app/src/timeline.json'))

    def at(self, expr):
        if isinstance(expr, (int, float)):
            return float(expr)
        s = str(expr).strip()
        try:
            return float(s)
        except ValueError:
            pass
        m = re.match(r'^(?P<base>.+?)(?P<off>[+-]\d+(?:\.\d+)?)?$', s)
        base, off = m.group('base'), float(m.group('off') or 0)
        L = self.tl['lines']
        if base == 'END':
            return self.tl['end_card'] + off
        if base == 'DUR':
            return self.tl['duration'] + off
        if base.endswith('$'):
            return L[base[:-1]]['end'] + off
        if ':' in base:
            k, w = base.split(':', 1)
            for c in L[k]['clauses']:
                i = c['text'].find(w)
                if i >= 0:
                    return c['start'] + (c['end'] - c['start']) * i / max(1, len(c['text'])) + off
            raise KeyError(f'{k} 这句里没有「{w}」（按配音文本找，数字要写成汉字）')
        return L[base]['start'] + off
