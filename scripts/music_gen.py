"""用 ACE-Step 1.5 生成纯音乐铺底。  taowa.py music [段名…]
每段的速度、调、时长和英文描述写在这一集的 cues.json 的 beds 里。输出 music/<段名>.wav。"""
import os, sys, json, shutil, time
from pathlib import Path
for k in ('http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY'):
    os.environ.pop(k, None)
sys.path.insert(0, str(Path(__file__).parent))
from common import cfg, ep, log

C, E = cfg(), ep()
ROOT = C['acestep_root']; sys.path.insert(0, ROOT)
from acestep.handler import AceStepHandler
from acestep.llm_inference import LLMHandler
from acestep.inference import GenerationParams, GenerationConfig, generate_music

BEDS = json.load(open(E / 'cues.json'))['beds']
want = sys.argv[1:] or [n for n in BEDS if not (E / f'music/{n}.wav').exists()]
if not want:
    print('每一段都已经有了；要重做就写上段名'); sys.exit(0)
dit = AceStepHandler(); print(dit.initialize_service(project_root=ROOT, config_path='acestep-v15-turbo', device='auto', offload_to_cpu=False))
lm = LLMHandler(); print(lm.initialize(checkpoint_dir=os.path.join(ROOT, 'checkpoints'), lm_model_path='acestep-5Hz-lm-0.6B', backend='mlx', device='auto', offload_to_cpu=False, dtype=None))
(E / 'music/raw').mkdir(parents=True, exist_ok=True)
for name in want:
    b = BEDS[name]; t0 = time.time()
    r = generate_music(dit, lm, params=GenerationParams(task_type='text2music', thinking=True, caption=b['caption'], lyrics='[Instrumental]', bpm=b['bpm'],
                       keyscale=b['key'], timesignature='4', vocal_language='en', duration=b['dur'], inference_steps=8, guidance_scale=1.0, seed=b.get('seed', 11), instrumental=True),
                       config=GenerationConfig(batch_size=1, audio_format='wav'), save_dir=str(E / 'music/raw'))
    print(name, r.success, round(time.time() - t0), 's', r.status_message if not r.success else '', flush=True)
    if r.success and r.audios:
        shutil.copyfile(r.audios[0]['path'], E / f'music/{name}.wav')
        log(E, '4-声音', f'配乐 {name}：{b["bpm"]} BPM，{b["dur"]} 秒，生成用了 {round(time.time() - t0)} 秒')
    else:
        log(E, '4-声音', f'配乐 {name} 生成失败：{r.status_message}')
