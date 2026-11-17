"""从你自己整理的选题库（一个 SQLite 文件）里挑"讲 skill 的视频"候选：  taowa.py topic [关键词…] [--n 20]
加 --brief 出窄格式。按"播放量 ÷ 粉丝数"的倍数排，小频道跑出来的大数字排前面。没有选题库就跳过这一步，改用联网搜索。"""
import sqlite3, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import cfg

C = cfg()
db = Path(C['radar_db']) if Path(C.get('radar_db') or '').is_absolute() else Path(C['project_root']) / (C.get('radar_db') or 'none')
if not db.is_file():
    sys.exit('没有配置选题库（config.json 的 radar_db）。改用联网搜索找对标视频。')
n = int(sys.argv[sys.argv.index('--n') + 1]) if '--n' in sys.argv else 20
kw = [a for a in sys.argv[1:] if not a.startswith('--') and not a.isdigit()] or ['skill', 'skills', '插件', 'plugin', 'Claude Code', 'MCP', '工作流', 'workflow']
con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
where = ' OR '.join(['i.title LIKE ?'] * len(kw))
rows = con.execute(f"""SELECT i.platform, i.title, i.views, a.followers, i.multiplier, i.duration, i.comments, i.url, substr(i.published_at, 1, 10)
  FROM items i LEFT JOIN accounts a ON a.id = i.account_key
  WHERE ({where}) AND i.hidden = 0 AND i.is_demo = 0 AND i.views > 3000
  ORDER BY COALESCE(i.multiplier, 0) DESC, i.views DESC LIMIT ?""", [f'%{k}%' for k in kw] + [n]).fetchall()
if '--brief' in sys.argv:     # 窄一点的格式，适合录下来放进画面
    for p, t, v, f, m, d, c, u, dt in rows:
        print(f"{round(m or 0):>4}×  播放 {v:>8,}  粉丝 {f or 0:>7,}  {p[:2]}  {(t or '')[:30]}")
    sys.exit(0)
print(f'关键词：{kw}；共 {len(rows)} 条\n')
print('| 平台 | 标题 | 播放 | 粉丝 | 倍数 | 时长 | 评论 | 发布 | 链接 |\n|---|---|---|---|---|---|---|---|---|')
for p, t, v, f, m, d, c, u, dt in rows:
    dur = f'{d // 60}:{d % 60:02d}' if d else ''
    print(f"| {p} | {(t or '')[:44]} | {v or ''} | {f or ''} | {round(m, 1) if m else ''} | {dur} | {c or ''} | {dt or ''} | {u} |")
