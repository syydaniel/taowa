"""合成带声音的成片：  taowa.py final   → out/final.mp4
out/video_silent.mp4 + out/vo.wav + out/bed.wav + out/sfx.wav。
人声：高通 70 Hz、3 kHz 轻微提亮、轻压缩；配乐：给人声让出 2.5 kHz，人声出现时自动压低（侧链）；
总响度两遍 loudnorm 到 -16 LUFS、真峰值 -1.5 dB。电平可以在 cues.json 的 levels 里调。"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from common import ep, log

E = ep(); O = E / 'out'
LV = {'voice_rms': -20, 'bed_db': -7, 'sfx_db': 0, 'duck_ratio': 5, **json.load(open(E / 'cues.json')).get('levels', {})}
a, sr = sf.read(O / 'vo.wav'); act = a[np.abs(a) > 0.01]
vg = LV['voice_rms'] - 20 * np.log10(np.sqrt(np.mean(act ** 2)) + 1e-9)      # 把"有人说话的部分"拉到目标音量
chain = (f"[1:a]aresample=48000,highpass=f=70,equalizer=f=3000:t=q:w=1:g=2,volume={vg:.2f}dB,acompressor=threshold=-18dB:ratio=2.5:attack=8:release=150,aformat=channel_layouts=stereo,asplit=2[vo][sc];"
         f"[2:a]highpass=f=50,equalizer=f=2500:t=q:w=1.2:g=-3.5,volume={LV['bed_db']}dB[bq];"
         f"[bq][sc]sidechaincompress=threshold=0.02:ratio={LV['duck_ratio']}:attack=20:release=400[bd];"
         f"[3:a]volume={LV['sfx_db']}dB[fx];[vo][bd][fx]amix=inputs=3:normalize=0[m]")
ins = ['-i', str(O / 'video_silent.mp4'), '-i', str(O / 'vo.wav'), '-i', str(O / 'bed.wav'), '-i', str(O / 'sfx.wav')]
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', *ins, '-filter_complex', chain + ';[m]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json[a]', '-map', '[a]', '-f', 'null', '-'], capture_output=True, text=True)
m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr)
assert m, r.stderr[-1500:]
st = json.loads(m.group(0))
ln = f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={st['input_i']}:measured_TP={st['input_tp']}:measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true"
# 限幅之后再编码成 AAC，真峰值还会往上冒一点；冒过 -1 dB 就把限幅线再压低重来
for lim in (-2.5, -4.0, -5.5, -7.0):
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', chain + f';[m]{ln},alimiter=limit={lim}dB:attack=3:release=60:level=false[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', str(O / 'final.mp4')])
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(O / 'final.mp4'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)[-1]; TP = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r.stderr)[-1]
    print(f'限幅线 {lim} dB → 响度 {I} LUFS，真峰值 {TP} dB')
    if float(TP) <= -1.0: break
msg = f'成片 out/final.mp4：响度 {I} LUFS，真峰值 {TP} dB（人声增益 {vg:+.1f} dB，配乐 {LV["bed_db"]} dB）'
print(msg); log(E, '6-发布包', msg)
