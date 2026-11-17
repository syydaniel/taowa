#!/usr/bin/env python3
"""taowa 的总入口。在某一集的目录里运行：
  python3 ~/.claude/skills/taowa/scripts/taowa.py <命令> [参数]

  new <编号_片名> [--theme 名字]   建一集            status            看做到哪了
  gate <选题|文案|成片> <一句话>     记下作者的确认     note <阶段> <话>   往运行记录里记一笔
  topic [关键词]                    从选题库挑候选     license <owner/repo>  查许可证和星数
  lint                             查口播稿          term <名字> -- 命令…  跑真命令并录下输出
  tts [句子键…]                    配音              timeline          排时间线
  music [段名…]                    配乐              mix               配乐拼接 + 音效轨
  bundle [目录名]                  打包画面工程       kf <名字> <时间…>  抽帧拼图
  render                           渲染无声成片       final             合成带声音的成片
  check                            成片体检          package <编号_片名> 出发布包
  sfx-synth <目录>                  合成一套音效       export <目录>      导出不含个人信息的干净版
"""
import os, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import cfg, ep, state, save_state, log

HERE = Path(__file__).parent
PY = {'tts': 'py_audio', 'timeline': 'py_audio', 'mix': 'py_audio', 'final': 'py_audio', 'check': 'py_audio', 'sfx-synth': 'py_audio', 'music': 'py_music'}
FILE = {'new': 'new_episode.py', 'topic': 'topic.py', 'license': 'license_check.py', 'lint': 'lint_script.py', 'term': 'term_rec.py', 'tts': 'tts.py', 'timeline': 'timeline.py',
        'music': 'music_gen.py', 'mix': 'mix.py', 'final': 'final_mix.py', 'check': 'check_final.py', 'package': 'package.py', 'sfx-synth': 'sfx_synth.py', 'export': 'export_clean.py', 'kf': 'kf.py'}


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help', 'help'):
        print(__doc__); return
    cmd, args = sys.argv[1], sys.argv[2:]
    c = cfg()
    if cmd == 'status':
        e = ep(); s = state(e)
        print(e); print('阶段：', s['stage']); print('确认：', s['gates'])
        return
    if cmd == 'gate':
        e = ep(); s = state(e)
        assert args and args[0] in s['gates'], '用法：gate <选题|文案|成片> <作者说了什么>'
        import time
        s['gates'][args[0]] = {'time': time.strftime('%Y-%m-%d %H:%M'), 'note': ' '.join(args[1:])}
        save_state(e, s); log(e, args[0], '作者确认：' + ' '.join(args[1:])); print('已记录')
        return
    if cmd == 'note':
        e = ep(); log(e, args[0], ' '.join(args[1:]))
        return
    if cmd == 'stage':
        e = ep(); s = state(e); s['stage'] = args[0]; save_state(e, s); log(e, args[0], '进入这个阶段'); return
    if cmd in ('bundle', 'render'):
        e = ep(); app = e / 'app'
        if cmd == 'bundle':
            out = e / 'out' / (args[0] if args else 'bundle')
            sys.exit(subprocess.call(['npx', 'remotion', 'bundle', 'src/index.ts', f'--out-dir={out}'], cwd=app))
        sys.exit(subprocess.call(['npx', 'remotion', 'render', str(e / 'out/bundle'), 'Film', str(e / 'out/video_silent.mp4'), '--codec=h264', '--crf=17', '--concurrency=6', *args], cwd=app))
    if cmd not in FILE:
        sys.exit(f'不认识的命令：{cmd}\n' + __doc__)
    py = c[PY[cmd]] if cmd in PY else sys.executable
    sys.exit(subprocess.call([py, str(HERE / FILE[cmd]), *args], env={**os.environ, 'PYTHONUNBUFFERED': '1'}))


if __name__ == '__main__':
    main()
