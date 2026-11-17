"""查一个 GitHub 仓库的许可证和星数：  taowa.py license <owner/repo> [更多仓库…]
只用 GitHub 的公开接口，不登录，请求里不带任何个人信息。结论只有两种：可以打包转发，或者只给链接。"""
import json, sys, urllib.request

OK = {'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'CC0-1.0', 'Unlicense', 'MIT-0', '0BSD'}
for repo in sys.argv[1:]:
    repo = repo.replace('https://github.com/', '').strip('/')
    try:
        req = urllib.request.Request(f'https://api.github.com/repos/{repo}', headers={'User-Agent': 'license-check', 'Accept': 'application/vnd.github+json'})
        d = json.load(urllib.request.urlopen(req, timeout=20))
    except Exception as e:
        print(f'{repo}：查不到（{e}）。按"没写许可证"处理：只给链接，不转发。'); continue
    lic = (d.get('license') or {}).get('spdx_id') or '没写'
    verdict = '可以打包转发：原文件不改，附许可证原文、原作者、原始链接' if lic in OK else '只给链接和安装命令，不转发（许可证不明确或者不在允许的清单里，需要人看一眼原文）'
    print(f"{repo}：许可证 {lic}；{d.get('stargazers_count')} 星；最近更新 {str(d.get('pushed_at'))[:10]}；{(d.get('description') or '')[:80]}\n  → {verdict}")
