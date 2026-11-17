"""查口播稿：  taowa.py lint
硬伤（不通过）：禁用字、破折号、章节没定义、缺"收藏 / 点赞 / 关注 / 评论区口令"、AI 味指标超线。
提醒（要看一眼）：配音文本里有阿拉伯数字、句子太长、套话和空词、对立句、平台不喜欢的词、开头太长。
AI 味指标以作者认可过的稿子为准（2026-11 量的两份）：两个标点之间平均 7 个字，一句话 18 到 24 个字，4 个字以内的碎分句占 22% 到 25%，
"第一 / 第二…"每百字 0.3 到 0.6 次。被打回的那版是 5.7 个字、碎分句 40%、1.14 次；矫枉过正的那版是 10.6 个字、一句 25 个字。
注意：别拿语音识别出来的字幕当尺子，它的标点是机器加的，量出来偏长。"""
import re, statistics, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import cfg, ep, load_lines, wlen

C, E = cfg(), ep()
LINES, CHAPTERS = load_lines(E)
bad, warn = [], []
secs = {c[0] for c in CHAPTERS}
allt = ''
for k, v in LINES.items():
    assert len(v) == 4, f'{k}：每句是 (章节, 配音文本, 句后停顿秒, 字幕或 None)'
    sec, tts, pause, sub = v
    txt = tts + (sub or ''); allt += tts
    if sec not in secs: bad.append(f'{k}：章节 {sec} 没在 CHAPTERS 里')
    for w in C['banned_words']:
        if w in txt: bad.append(f'{k}：出现禁用字「{w}」')
    if '——' in txt: bad.append(f'{k}：有破折号，改成逗号或者拆成两句')
    if re.search(r'\d', tts): warn.append(f'{k}：配音文本里有阿拉伯数字「{"".join(re.findall(r"[0-9.]+", tts))}」，写成汉字（字幕里再写数字）')
    if wlen(tts) > 62: warn.append(f'{k}：{wlen(tts)} 个字，一句配音太长容易念坏，在句号处拆成两个键')
    for w in C.get('soft_words', []):
        if w in txt: warn.append(f'{k}：「{w}」在视频号、抖音容易被判成"AI 代替人创作"，B 站以外的版本换个说法')
# ---- AI 味：空词、套话、句式（词表来自作者自己的 ai_flavor.py）
BUZZ = ['赋能', '极致', '震撼', '沉浸', '打造', '助力', '硬核', '见证', '旅程', '探索', '建议收藏', '全方位', '一站式', '重磅', '颠覆', '天花板', '干货满满', '宝藏', '神器', '炸裂', '封神', '无与伦比', '匠心', '初心',
        '史诗级', '令人惊叹', '完美呈现', '全新升级', '焕然一新', '不容错过', '完美诠释', '加持']
STOCK = ['让我们', '首先', '其次', '接下来', '真正的', '更是', '说白了', '你猜怎么着', '那问题就来了', '值得一提的是', '总而言之', '综上所述', '不难发现', '毋庸置疑', '一起来看看', '话不多说', '总的来说', '可以说', '不仅仅是', '而是一种', '说白了就是']
PATS = [(r'不是[^，。！？]{1,14}[，,]\s*(?:而)?是', '「不是 A，是 B」对立句'), (r'不仅[^，。]{1,16}[，,]\s*(?:更|还|也)', '「不仅…更…」'), (r'既[^，。]{1,10}[，,]?\s*又', '「既…又…」'),
        (r'(?:(?:自己|有|要么|一)[^，。、]{1,6}[，、]){2,}(?:自己|有|要么|一)', '同一个字开头的排比'), ]
for k, v in LINES.items():
    for w in BUZZ:
        if w in v[1]: warn.append(f'{k}：空词「{w}」')
    for w in STOCK:
        if w in v[1]: warn.append(f'{k}：套话「{w}」')
    for pat, name in PATS:
        if re.search(pat, v[1]): warn.append(f'{k}：{name}')
    if '：' in v[1] and len(v[1]) < 60: warn.append(f'{k}：冒号铺垫（"说一句：…"），直接说下去')
# ---- AI 味：量化指标。英文单词两边的空格不算停顿
han = lambda x: len(re.findall(r'[\u4e00-\u9fffA-Za-z0-9]', x))
flat = re.sub(r'(?<=[A-Za-z0-9]) (?=[\u4e00-\u9fff])|(?<=[\u4e00-\u9fff]) (?=[A-Za-z0-9])|(?<=[A-Za-z]) (?=[A-Za-z])', '', '\n'.join(v[1] for v in LINES.values()))
cl = [han(c) for c in re.split(r'[，。？！、：；,.?!:;\s]+', flat) if han(c) > 0]
avg, tiny, ordn = statistics.mean(cl), sum(1 for c in cl if c <= 4) / len(cl), len(re.findall(r'第[一二三四五六七八九十]', flat)) / han(flat) * 100
sl = [han(x) for x in re.split(r'[。？！?!\n]+', flat) if han(x) > 1]
savg = statistics.mean(sl)
qa = len(re.findall(r'[？?]', flat))
print(f'AI 味指标：分句均长 {avg:.1f} 字（作者的稿子约 7；低于 6.2 或高于 9.5 不通过）；一句话平均 {savg:.0f} 字（约 20；高于 28 不通过）；'
      f'碎分句 {tiny:.0%}（约 23%；高于 33% 不通过）；"第几"每百字 {ordn:.2f} 次（高于 0.9 不通过）；问句 {qa} 处（自问自答别超过 3 处）')
short = len(LINES) < 15      # 稿子太短（比如模板里的示例），量出来没意义，只报数不判
if short: print('  （不到 15 句，量化指标只供参考，不判通过与否）')
if short: pass
elif avg < 6.2: bad.append(f'逗号切得太碎：两个标点之间平均只有 {avg:.1f} 个字')
if not short and (avg > 9.5 or savg > 28): bad.append(f'句子拉得太长（分句 {avg:.1f} 字，一句 {savg:.0f} 字）。一句只讲一件事，二十个字左右')
if not short and tiny > 0.33: bad.append(f'{tiny:.0%} 的分句不超过 4 个字（"这种，就值得学"这类），作者的稿子大约 23%')
if not short and ordn > 0.9: bad.append(f'"第一、第二、第三"太多（每百字 {ordn:.2f} 次）。别按条目讲，按事情发生的顺序讲')
if qa > 4: warn.append(f'问句 {qa} 处，看看是不是自问自答太密')
ends = [v[1] for k, v in LINES.items() if v[2] >= 0.8]
print(f'段尾的 {len(ends)} 句（自己读一遍，有没有哪句是为了漂亮才写的总结句）：')
for e in ends: print('   ·', e[-34:])
first = next(iter(LINES.values()))[1]
if wlen(first) > 28: warn.append(f'第一句 {wlen(first)} 个字：前 3 秒要把钩子抛出来，压到 28 字以内')
for need, name in ((r'收藏', '提醒收藏'), (r'点赞|点个赞', '提醒点赞'), (r'关注', '提醒关注'), (r'评论区', '评论区领取')):
    if not re.search(need, allt): bad.append(f'全文没有{name}')
ph = re.sub(r'[^\w]', '', C.get('cta_phrase', ''))
if ph and ph not in re.sub(r'[^\w]', '', allt): bad.append(f'全文没有评论区口令「{C["cta_phrase"]}」')
n = sum(wlen(v[1]) for v in LINES.values())
est = n / float(C['voice_rate']) + sum(max(0.18, v[2] * 0.72) for v in LINES.values()) + 7.35
print(f'{len(LINES)} 句，{n} 字，估计 {int(est // 60)} 分 {int(est % 60)} 秒（含片尾卡）')
for w in warn: print('  提醒：', w)
for b in bad: print('  不通过：', b)
print('结果：', '不通过' if bad else '通过' + ('（有提醒）' if warn else ''))
sys.exit(1 if bad else 0)
