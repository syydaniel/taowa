# 套娃（taowa）

一个给 Claude Code 用的 skill：把「讲一个 AI skill 的视频」从选题做到发布包。

你说一句「做一条讲某某 skill 的视频」，它按六个阶段往下做：选题 → 调研实测 → 口播稿 → 配音和配乐 → 画面 → 发布包。中间在**选题、稿子、成片**三处停下来等你点头。不出镜：旁白是你自己声音的克隆，配乐是本机模型现写的，画面每一帧都是代码渲染的（Remotion）。

它做的第一条视频，讲的就是它自己。

## 它不是什么

- 不是一键出片。稿子像不像你说的话、配音语气怪不怪、音乐吵不吵，这些它判断不了，要你看、要你听。
- 不用素材库，不用图片或视频生成模型。画面全是代码，所以改起来快，但想要好看得花功夫写主视觉。
- 不替你发布。发布包做好就停，上传是你的事。

## 需要什么

只在 **Apple 芯片的 Mac** 上验证过。别的系统上，流程、口播稿检查和画面部分应该能用，配音和配乐要自己换方案，我没试过。

| 东西 | 干什么用 | 备注 |
|---|---|---|
| Claude Code | 跑这个 skill | |
| Node.js 18 以上 | Remotion 渲染画面 | 第一次建集会自动 `npm ci` |
| ffmpeg | 合成、响度、抽帧拼图 | `brew install ffmpeg` |
| 一个 Python 环境，装 `numpy soundfile mlx-audio mlx-whisper` | 配音（Qwen3-TTS）、听写核对（Whisper）、混音 | 路径填进 `config.json` 的 `py_audio` |
| [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) 和它的 Python 环境 | 生成配乐 | 路径填 `acestep_root` 和 `py_music` |
| 一段 10 到 20 秒你自己的干净录音 | 声音克隆的参考音 | 路径填 `voice_ref`。只能用你本人的声音，或者你有权使用的声音 |

模型（Qwen3-TTS、Whisper）第一次用时会自动下载，几个 GB。

## 安装

1. 把整个仓库放到 `~/.claude/skills/taowa/`：`git clone https://github.com/syydaniel/taowa ~/.claude/skills/taowa`。
2. 把 `agents/taowa-director.md` 复制到 `~/.claude/agents/`（可选，想用子代理来跑的话）。
3. 复制 `config.example.json` 为 `config.json`，填上路径。最省事的办法是直接跟 Claude Code 说：「帮我把 taowa 装上，检查环境缺什么」。
4. 没有自己的音效库的话，生成一套够用的：`python3 ~/.claude/skills/taowa/scripts/taowa.py sfx-synth ~/.claude/skills/taowa/local/sfx`，再把 `config.json` 的 `sfx_dir` 指过去。
5. 字体：模板里带了得意黑（Smiley Sans）和思源黑体 Black，都是 SIL Open Font License，许可证见 `template/app/public/fonts/`。

## 用

在 Claude Code 里说：

- 「用套娃做一条讲 XX skill 的视频」
- 「继续做上次那一集」
- 「只重配 a03 和 b02 这两句」
- 「出发布包」

它会读 `SKILL.md`，做到哪个阶段读 `stages/` 里对应的那一份。所有脚本一个入口：

```bash
python3 ~/.claude/skills/taowa/scripts/taowa.py        # 不带参数会列出全部命令
```

每一集是 `<项目根>/productions/<编号_片名>/` 下的一个目录，状态记在 `episode.json`，经过记在 `运行记录.md`，断了可以接着做。

## 目录

```
SKILL.md            总流程、三个必停点、硬规矩、踩过的坑
stages/             六个阶段各一份说明
scripts/            建集、选题、查许可证、查稿、配音、时间线、配乐、混音、抽帧、合成、体检、打包、导出
template/           一集的骨架：口播稿、配乐和音效表、Remotion 工程（积木块、主题、分镜表）
agents/             导演代理
config.example.json 配置样例
```

## 几条写死的规矩

- 讲一个 skill 之前必须真装真跑一遍，数字只用实测的。
- 别人的 skill 先查许可证，允许转发的才打包送，否则只给链接。
- 口播稿写完先跑 `taowa.py lint`：它会量句子是不是切得太碎或拉得太长，查排比、套话和段尾的漂亮话。这几条是被作者打回稿子之后加的。
- 每条视频都要说点赞、收藏、关注，结尾有评论区口令（在 `config.json` 里改）。
- 成品配音不做时间拉伸。

## 已知的不足

- 时间线上「某个词是第几秒念出来的」是按字数比例估的，不是逐字对齐，偶尔会差零点几秒。
- 网页录屏（`template/rec/record.js`，Playwright）是从别的工程搬来的，在这套流程里还没实际用过。
- 封面模板很朴素，想要好看的封面得自己重写 `Cover.tsx`。
- 自带的合成音效只是够用。

## 同一系列的 skill

- [卡字 kazi](https://github.com/syydaniel/kazi)：让讲解动画的画面卡在旁白的关键词上。
- [开口 kaikou](https://github.com/syydaniel/kaikou)：让克隆的声音，一开口就说人话。
- [真实感开关 zhenshi-kaiguan](https://github.com/syydaniel/zhenshi-kaiguan)：用纯代码做出看着像拍出来的 3D 画面。
- [曲风环游 qufeng-huanyou](https://github.com/syydaniel/qufeng-huanyou)：一首曲子进去，八个国家的版本出来。

## 许可证

MIT，见 `LICENSE`。字体和依赖各有自己的许可证。
