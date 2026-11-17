"""用参考音克隆配音（Qwen3-TTS Base，Apple 芯片上的 mlx 版）。
  taowa.py tts [句子键…]      不给键 = 只做文本有改动的句子；给了键 = 强制重做这几句
每句最多 4 遍，用 Whisper 听写核对，选听写最准、语速最接近目标的一遍，再把句内过长的停顿压短。
成品不做时间拉伸（拉伸会出电音）：想说快一点，就给模型一条加快过的参考音。"""
import sys, json, difflib, re, subprocess
from pathlib import Path
import numpy as np, soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from common import cfg, ep, load_lines, log

C, E = cfg(), ep()
LINES, _ = load_lines(E)
OUT = E / 'vo/me'; (OUT / 'takes').mkdir(parents=True, exist_ok=True)
WH = C['whisper_model']
import mlx_whisper

# 参考音：优先用配置里现成的加快版；没有就用 ffmpeg 把原声加快 voice_speed 倍，存在这一集的 vo/ 里
REF = Path(C['voice_ref_fast']) if C.get('voice_ref_fast') and Path(C['voice_ref_fast']).exists() else E / 'vo/ref_fast.wav'
if not REF.exists():
    assert C.get('voice_ref') and Path(C['voice_ref']).exists(), '配置里没有可用的参考音：在 config.json 里填 voice_ref（一段 10 到 20 秒、干净的本人录音）'
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', C['voice_ref'], '-af', f"atempo={C['voice_speed']}", '-ar', '24000', '-ac', '1', str(REF)])
rt = Path(C['voice_ref_text']) if C.get('voice_ref_text') and Path(C['voice_ref_text']).exists() else E / 'vo/ref.txt'
if not rt.exists():
    rt.write_text(mlx_whisper.transcribe(str(REF), path_or_hf_repo=WH, language='zh', initial_prompt='以下是普通话的句子。')['text'].strip())
REF_TXT = rt.read_text().strip()
print('参考音：', REF.name, '｜参考文本：', REF_TXT[:30], '…', flush=True)

DIG = '〇一二三四五六七八九'
def norm(s):
    s = re.sub(r'\d', lambda m: DIG[int(m.group(0))], s)
    return re.sub(r'[^\w]', '', s).lower().replace('零', '〇').replace('两', '二')

def trim(a, sr):
    idx = np.where(np.abs(a) > 0.01)[0]
    return a[max(0, idx[0] - int(0.03 * sr)): idx[-1] + int(0.25 * sr)] if len(idx) else a

def tighten(a, sr, keep=0.28, longest=0.40):
    """只动静音：句内长于 longest 秒的停顿压到 keep 秒。"""
    hop = sr // 100
    fr = np.sqrt((a[: len(a) // hop * hop].reshape(-1, hop) ** 2).mean(1)) + 1e-9
    db = 20 * np.log10(fr); q = db < np.percentile(db, 90) - 40
    out, last, i = [], 0, 0
    while i < len(q):
        if q[i]:
            j = i
            while j < len(q) and q[j]:
                j += 1
            if (j - i) * hop > longest * sr and i > 0 and j < len(q):
                mid = (i + j) // 2 * hop; half = int(keep * sr / 2); fade = int(0.015 * sr)
                seg = a[last: mid - half].copy(); seg[-fade:] *= np.linspace(1, 0, fade)
                out.append(seg); last = mid + half
                a[last: last + fade] *= np.linspace(0, 1, fade)
            i = j
        else:
            i += 1
    out.append(a[last:])
    return np.concatenate(out)

from mlx_audio.tts.utils import load_model
m = load_model(C['tts_model'])
force = bool(sys.argv[1:])
keys = sys.argv[1:] or list(LINES)
cf = OUT / 'choice.json'
choice = json.load(open(cf)) if cf.exists() else {}
RATE = float(C['voice_rate']); n_takes = 0
for k in keys:
    text = LINES[k][1]
    if k in choice and choice[k].get('text') == text and not force:
        continue
    takes = []
    for t in range(4):
        if takes and max(x['acc'] for x in takes) >= 0.97 and t >= 2:
            break
        res = list(m.generate(text=text, ref_audio=str(REF), ref_text=REF_TXT, language='Chinese'))
        sr = res[0].sample_rate
        a = trim(np.concatenate([np.array(r.audio) for r in res]), sr)
        p = OUT / 'takes' / f'{k}_{t}.wav'; sf.write(p, a, sr)
        asr = mlx_whisper.transcribe(str(p), path_or_hf_repo=WH, language='zh', initial_prompt='以下是普通话的句子，夹杂少量英文单词。')['text']
        acc = difflib.SequenceMatcher(None, norm(text), norm(asr)).ratio()
        tk = tighten(a.copy(), sr)
        np.save(OUT / 'takes' / f'{k}_{t}.npy', tk.astype(np.float32))
        takes.append(dict(take=str(p), acc=round(acc, 3), dur=round(len(tk) / sr, 3), rate=round(len(norm(text)) / (len(tk) / sr), 2), asr=asr.strip()))
        n_takes += 1
        print(k, t, f"acc {acc:.2f} dur {takes[-1]['dur']:.1f}s rate {takes[-1]['rate']:.2f}", asr.strip(), flush=True)
    top = max(x['acc'] for x in takes)
    best = min([x for x in takes if x['acc'] >= top - 0.015], key=lambda x: abs(x['rate'] - RATE))
    i = takes.index(best)
    tk = np.load(OUT / 'takes' / f'{k}_{i}.npy'); f = OUT / f'{k}.wav'; sf.write(f, tk, sr)
    choice[k] = dict(best, file=str(f.relative_to(E)), text=text, tries=len(takes))
    json.dump(choice, open(cf, 'w'), ensure_ascii=False, indent=1)
for k in [k for k in choice if k not in LINES]:
    del choice[k]
json.dump(choice, open(cf, 'w'), ensure_ascii=False, indent=1)
low = [k for k, c in choice.items() if c['acc'] < 0.9]
total_tries = sum(c.get('tries', 0) for c in choice.values())
msg = f"{len(choice)} 句，共 {round(sum(c['dur'] for c in choice.values()), 1)} 秒；这次念了 {n_takes} 遍，累计 {total_tries} 遍；听写准确率低于 0.9 的：{low or '无'}"
print('DONE', msg); log(E, '4-声音', '配音：' + msg)
