"""把配音排成时间线：  taowa.py timeline
输出 app/src/timeline.json（画面、混音、字幕都只认这一个时钟）和 out/vo.wav（整条配音）。
  taowa.py timeline --draft   还没配音时，按字数估每句的时长，先把画面做起来（不出 vo.wav）。配完音必须再跑一遍正式的。"""
import json, re, sys
from pathlib import Path
import numpy as np, soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from common import cfg, ep, load_lines, wlen, log

E = ep()
LINES, CHAPTERS = load_lines(E)
DRAFT = '--draft' in sys.argv
if not DRAFT:
    choice = json.load(open(E / 'vo/me/choice.json'))
    miss = [k for k in LINES if k not in choice or choice[k].get('text') != LINES[k][1]]
    assert not miss, f'这些句子还没配音或者文本改过了，先跑 tts：{miss}'
FPS, LEAD, TAIL, SR = 30, 0.35, 7.0, 24000   # 片头留白、片尾卡时长
SUB_MAX = 20                                 # 字幕一页最多多少字

t = LEAD
lines, subs, audio = {}, [], []
for k, (sec, tts, pause, sub) in LINES.items():
    if DRAFT:
        a = np.zeros(int(wlen(tts) / float(cfg()['voice_rate']) * SR), np.float32)
    else:
        a, sr = sf.read(E / choice[k]['file']); assert sr == SR, sr
        if a.ndim > 1: a = a.mean(1)
    dur = len(a) / SR
    # 分句：按标点切，时间按字数比例分。画面用它把动作对到关键词上
    parts = [p for p in re.split(r'(?<=[，。？！、：；,.?!:;])', tts) if p.strip()]
    total = sum(wlen(p) for p in parts); c0 = t; clauses = []
    for p in parts:
        d = dur * wlen(p) / total
        clauses.append({'text': p.strip(), 'start': round(c0, 3), 'end': round(c0 + d, 3)}); c0 += d
    lines[k] = {'sec': sec, 'start': round(t, 3), 'end': round(t + dur, 3), 'tts': tts, 'sub': sub or tts, 'clauses': clauses}
    stext = sub or tts
    pages, cur = [], ''
    for p in [p for p in re.split(r'(?<=[，。？！：；,.?!:;])', stext) if p.strip()]:
        if cur and wlen(cur) + wlen(p) > SUB_MAX:
            pages.append(cur); cur = p
        else:
            cur += p
    if cur: pages.append(cur)
    tot = sum(wlen(p) for p in pages); s0 = t
    for p in pages:
        d = dur * wlen(p) / tot
        subs.append({'text': re.sub(r'[，。：；,.:;]$', '', p.strip()), 'start': round(s0, 3), 'end': round(s0 + d + (0.12 if p is pages[-1] else 0), 3)}); s0 += d
    audio.append((t, a))
    t += dur + max(0.18, pause * 0.72)
duration = round(t + TAIL, 2)
chapters = [{'sec': sec, 'num': num, 'name': name, 'en': en, 'start': min(l['start'] for l in lines.values() if l['sec'] == sec)} for sec, num, name, en in CHAPTERS if any(l['sec'] == sec for l in lines.values())]
# 这一集自己的账单：画面里要报"多少句、念了多少遍、多少帧"时从这里读，不用写进旁白
facts = {'lines': len(lines), 'chars': sum(wlen(v[1]) for v in LINES.values()), 'takes': 0 if DRAFT else sum(c.get('tries', 1) for k, c in choice.items() if k in LINES),
         'frames': int(duration * FPS), 'seconds': round(duration, 1), 'vo_seconds': round(sum(len(a) for _, a in audio) / SR, 1)}
json.dump({'fps': FPS, 'draft': DRAFT, 'facts': facts, 'duration': duration, 'end_card': round(t, 3), 'lines': lines, 'subs': subs, 'chapters': chapters},
          open(E / 'app/src/timeline.json', 'w'), ensure_ascii=False, indent=1)
mix = np.zeros(int(duration * SR) + SR, dtype=np.float32)
for start, a in audio:
    i = int(start * SR); mix[i:i + len(a)] += a.astype(np.float32)
(E / 'out').mkdir(exist_ok=True)
if not DRAFT: sf.write(E / 'out/vo.wav', mix, SR)
msg = ('（草稿，按字数估的）' if DRAFT else '') + f"全片 {duration} 秒，{int(duration * FPS)} 帧；配音 {round(sum(len(a) for _, a in audio) / SR, 1)} 秒；片尾卡从 {round(t, 2)} 秒开始；字幕 {len(subs)} 页"
print(msg); log(E, '4-声音', '时间线：' + msg)
