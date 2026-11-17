// 自动录屏：用电脑上的 Chrome 打开页面，按脚本操作，逐帧截图后合成 MP4。
// 用法：node record.js <网址> <场景名> <输出.mp4> [宽] [高] [mobile]
// 场景写在 scenarios.js 里。画面里的鼠标指针是脚本画上去的，方便观众看清点了哪里。
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const scenarios = require(process.env.SCENARIOS || './scenarios');

const [url, name, out, w = '1280', h = '720', mobile] = process.argv.slice(2);
const FPS = 30;

const CURSOR_JS = `(() => {
  if (window.__cur) return;
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:none';
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l15 8.2-6.4 1.7L9 18.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const ring = document.createElement('div');
  ring.style.cssText = 'position:fixed;left:0;top:0;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:3px solid rgba(255,90,60,.9);z-index:2147483646;pointer-events:none;opacity:0;transform:translate(-100px,-100px) scale(.4)';
  document.documentElement.append(ring, c);
  window.__cur = (x, y) => { c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; ring.dataset.x = x; ring.dataset.y = y; };
  window.__click = () => {
    const x = ring.dataset.x, y = ring.dataset.y;
    ring.animate([{ opacity: .95, transform: 'translate(' + x + 'px,' + y + 'px) scale(.4)' }, { opacity: 0, transform: 'translate(' + x + 'px,' + y + 'px) scale(1.5)' }], { duration: 420, easing: 'ease-out' });
  };
})()`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({
    viewport: { width: +w, height: +h }, deviceScaleFactor: 2, locale: 'zh-CN',
    hasTouch: !!mobile, isMobile: !!mobile,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(CURSOR_JS);

  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rec-'));
  let recording = true, n = 0;
  const stamps = [];
  const loop = (async () => {
    const t0 = Date.now();
    while (recording) {
      const t = Date.now() - t0;
      const f = path.join(dir, `f${String(n).padStart(5, '0')}.jpg`);
      await page.screenshot({ path: f, type: 'jpeg', quality: 92 }).catch(() => {});
      stamps.push([f, t]);
      n++;
    }
  })();

  // 给场景脚本用的小工具：平滑移动指针、点击、停顿
  let cx = +w / 2, cy = +h / 2;
  const pause = (ms) => page.waitForTimeout(ms);
  const move = async (x, y, ms = 450) => {
    const steps = Math.max(6, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const px = cx + (x - cx) * e, py = cy + (y - cy) * e;
      if (!mobile) await page.mouse.move(px, py);  // 手机模式只画指针，不发鼠标事件
      await page.evaluate(([a, b]) => window.__cur && window.__cur(a, b), [px, py]);
      await page.waitForTimeout(ms / steps);
    }
    cx = x; cy = y;
  };
  const center = async (locator) => {
    const b = await locator.boundingBox();
    if (!b) throw new Error('找不到元素');
    return [b.x + b.width / 2, b.y + b.height / 2];
  };
  const click = async (locator, ms = 450) => {
    const [x, y] = await center(locator);
    await move(x, y, ms);
    await page.evaluate(() => window.__click && window.__click());
    await page.mouse.down(); await pause(60); await page.mouse.up();
  };
  const drag = async (fromX, fromY, toX, toY, ms = 700) => {
    await move(fromX, fromY, 400);
    await page.evaluate(() => window.__click && window.__click());
    await page.mouse.down();
    await move(toX, toY, ms);
    await pause(80);
    await page.mouse.up();
  };

  // 手机场景用真正的触摸事件：点一下、按住拖动
  const cdp = mobile ? await ctx.newCDPSession(page) : null;
  const show = (x, y) => page.evaluate(([a, b]) => window.__cur && window.__cur(a, b), [x, y]);
  const tap = async (locator) => {
    const [x, y] = await center(locator);
    await move(x, y, 450);
    await page.evaluate(() => window.__click && window.__click());
    await locator.tap();
  };
  const touchDrag = async (x0, y0, x1, y1, ms = 600) => {
    await move(x0, y0, 400);
    await page.evaluate(() => window.__click && window.__click());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    const steps = Math.max(8, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await show(x, y);
      await page.waitForTimeout(ms / steps);
    }
    cx = x1; cy = y1;
    await pause(120);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };

  let note = {};
  try {
    note = (await scenarios[name]({ page, pause, move, click, drag, center, tap, touchDrag, w: +w, h: +h })) || {};
  } catch (e) {
    note = { error: String(e.message).slice(0, 300) };
  }
  recording = false;
  await loop;
  await browser.close();

  // 截图的间隔不均匀，按每帧的真实时间写进清单，再转成固定 30 帧
  const list = stamps.map(([f, t], i) => `file '${f}'\nduration ${(((stamps[i + 1] || [0, t + 33])[1]) - t) / 1000}`).join('\n');
  fs.writeFileSync(path.join(dir, 'list.txt'), list + `\nfile '${stamps[stamps.length - 1][0]}'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
    '-vf', `fps=${FPS},scale=${+w * 2}:${+h * 2}:flags=lanczos`, '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(JSON.stringify({ out, frames: n, seconds: +(stamps[stamps.length - 1][1] / 1000).toFixed(1), ...note }));
})().catch((e) => { console.error(e); process.exit(1); });
