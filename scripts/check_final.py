"""成片体检：  taowa.py check   → out/check_report.json、out/check_sheet.jpg
看得见的都查：分辨率、帧率、时长、响度、每 15 秒一格的联系表；把成片的声音转写回来对照口播稿；
在口播稿、字幕、发布文案、画面源码里搜禁用字。听感（语气、音乐好不好听、音效合不合拍）查不了，要人戴耳机听。"""
import json, re, subprocess, sys, difflib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import cfg, ep, load_lines, log

C, E = cfg(), ep(); O = E / 'out'
f = O / 'final.mp4'; assert f.exists(), '还没有 out/final.mp4'
TL = json.load(open(E / 'app/src/timeline.json'))
rep, bad = {}, []
p = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(f)]))
v = next(s for s in p['streams'] if s['codec_type'] == 'video'); au = next(s for s in p['streams'] if s['codec_type'] == 'audio')
rep.update(width=v['width'], height=v['height'], fps=v['r_frame_rate'], vcodec=v['codec_name'], acodec=au['codec_name'], duration=round(float(p['format']['duration']), 2), size_mb=round(int(p['format']['size']) / 1e6, 1))
if (v['width'], v['height']) != (1920, 1080): bad.append(f"分辨率是 {v['width']}×{v['height']}，应为 1920×1080")
if abs(rep['duration'] - TL['duration']) > 0.3: bad.append(f"时长 {rep['duration']} 秒，时间线是 {TL['duration']} 秒")
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(f), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
rep['lufs'] = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)[-1]); rep['true_peak'] = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r.stderr)[-1])
if abs(rep['lufs'] + 16) > 1: bad.append(f"响度 {rep['lufs']} LUFS，目标 -16")
if rep['true_peak'] > -1: bad.append(f"真峰值 {rep['true_peak']} dB，应低于 -1")
# 联系表：每 15 秒一格
n = int(rep['duration'] // 15) + 1; rows = (n + 4) // 5
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', str(f), '-vf', f'fps=1/15,scale=480:270,tile=5x{rows}', '-frames:v', '1', '-q:v', '4', str(O / 'check_sheet.jpg')])
rep['sheet'] = f'out/check_sheet.jpg（{n} 格，每格 15 秒）'
# 转写回来对照口播稿
LINES, _ = load_lines(E)
try:
    import mlx_whisper
    wav = O / 'check_audio.wav'
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', str(f), '-ac', '1', '-ar', '16000', str(wav)])
    asr = mlx_whisper.transcribe(str(wav), path_or_hf_repo=C['whisper_model'], language='zh', initial_prompt='以下是普通话的句子，夹杂少量英文单词。')['text']
    DIG = '〇一二三四五六七八九'
    norm = lambda s: re.sub(r'[^\w]', '', re.sub(r'\d', lambda m: DIG[int(m.group(0))], s)).lower().replace('零', '〇').replace('两', '二')
    want = norm(''.join(x[1] for x in LINES.values())); got = norm(asr)
    rep['asr_match'] = round(difflib.SequenceMatcher(None, want, got, autojunk=False).ratio(), 3)
    (O / 'check_asr.txt').write_text(asr)
    if rep['asr_match'] < 0.9: bad.append(f"成片转写和口播稿只对上 {rep['asr_match']}，听一下是哪里念错或者被音乐盖住了（out/check_asr.txt）")
    for w in C['banned_words']:
        if w in asr: bad.append(f'成片转写里出现「{w}」（可能是同音字，要人听一下）')
except ImportError:
    rep['asr_match'] = '没装 mlx_whisper，跳过'
# 禁用字：口播稿、字幕、发布文案、画面源码
hay = {'口播稿': ''.join(x[1] + (x[3] or '') for x in LINES.values()), '字幕': ''.join(s['text'] for s in TL['subs'])}
for q in [E / '发布文案.md', *sorted((E / 'app/src').glob('*.ts*')), *sorted((E / 'app/src/scenes').glob('*.tsx'))]:
    if q.exists() and q.name != 'kit.tsx': hay[q.name] = q.read_text()
for w in C['banned_words']:
    for name, txt in hay.items():
        if w in txt: bad.append(f'{name} 里出现禁用字「{w}」')
rep['problems'] = bad
rep['needs_ears'] = ['配音的语气和有没有念错的多音字', '配乐的音量和情绪对不对', '音效是不是卡在词上', '停乐的地方有没有突兀']
json.dump(rep, open(O / 'check_report.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(rep, ensure_ascii=False, indent=1))
log(E, '6-发布包', f"体检：{rep['width']}×{rep['height']}，{rep['duration']} 秒，{rep['lufs']} LUFS，转写对照 {rep.get('asr_match')}，问题 {len(bad)} 个")
sys.exit(1 if bad else 0)
