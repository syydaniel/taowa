// 录屏场景。三个版本做完全相同的操作，方便并排对比。
// 每个版本的页面结构不一样，所以按端口配一组选择器。
const V = {
  5181: { check: 'input[type="checkbox"]:not(:checked)', open: 'li button.flex-1', drawer: '[aria-label="任务详情"]', cmd: '[aria-label="搜索与命令"]' },
  5182: { check: '[aria-label="标为已完成"]', open: 'button.flex-1', drawer: '[data-vaul-drawer]', cmd: '[cmdk-root]' },
  5183: { check: '[role="checkbox"][aria-checked="false"]', open: '.flex-1.text-left', drawer: '[data-vaul-drawer]', cmd: '[cmdk-root]' },
};
const cfg = (page) => V[new URL(page.url()).port];

// 在画面下方显示刚按的键，观众才知道发生了什么
const KEY_JS = `(label) => {
  let k = document.getElementById('__key');
  if (!k) {
    k = document.createElement('div'); k.id = '__key';
    k.style.cssText = 'position:fixed;left:50%;bottom:36px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;font:600 20px -apple-system,"PingFang SC",sans-serif;color:#fff;background:rgba(20,20,20,.86);padding:10px 18px;border-radius:12px;opacity:0;transition:opacity .15s';
    document.documentElement.append(k);
  }
  k.textContent = label; k.style.opacity = 1;
  clearTimeout(window.__keyT); window.__keyT = setTimeout(() => { k.style.opacity = 0; }, 900);
}`;
const key = async (page, combo, label, wait = 650) => {
  await page.evaluate(`(${KEY_JS})(${JSON.stringify(label)})`);
  await page.keyboard.press(combo);
  await page.waitForTimeout(wait);
};

module.exports = {
  // 首页停留，建立第一印象
  async home({ pause, move, w, h }) {
    await pause(600); await move(w * 0.62, h * 0.4, 900); await pause(1800);
  },

  // 连点四个任务，看提示条怎么堆；再把鼠标停在提示条上，看它会不会等你读完
  async toasts({ page, pause, move, click, center }) {
    const c = cfg(page);
    await pause(500);
    for (let i = 0; i < 4; i++) {
      const loc = page.locator(c.check);
      const n = await loc.count();
      if (!n) break;
      await click(loc.first(), i ? 260 : 500);  // 每次点第一个还没完成的
      await pause(140);
    }
    await pause(500);
    const toast = page.locator('[data-sonner-toast], [role="status"] > *').first();
    let hovered = false;
    if (await toast.count()) { const [x, y] = await center(toast); await move(x, y + 4, 500); hovered = true; }
    await pause(3600);
    const left = await page.locator('[data-sonner-toast], [role="status"] > *').count();
    await move(640, 560, 500); await pause(1200);
    return { hovered, toasts_left_while_hovering: left };
  },

  // 打开命令菜单：方向键选择，再连按 Tab 看焦点会不会跑出去，最后按 Esc
  async cmd({ page, pause }) {
    const c = cfg(page);
    await pause(500);
    await key(page, 'Meta+k', '⌘ K', 900);
    await key(page, 'ArrowDown', '↓'); await key(page, 'ArrowDown', '↓'); await key(page, 'ArrowUp', '↑');
    for (let i = 0; i < 10; i++) await key(page, 'Tab', `Tab × ${i + 1}`, 300);
    const inside = await page.evaluate((sel) => { const d = document.querySelector(sel); return d ? d.contains(document.activeElement) || !!document.activeElement.closest('[role="dialog"]') : null; }, c.cmd);
    await pause(500);
    await key(page, 'Escape', 'Esc', 1100);
    const closed = (await page.locator(c.cmd).count()) === 0;
    await pause(700);
    return { focus_stays_inside: inside, esc_closes: closed };
  },

  // 手机：点开一条任务，抓住抽屉顶部往下拖
  async drawer({ page, pause, tap, touchDrag, w }) {
    const c = cfg(page);
    await pause(500);
    await tap(page.locator(c.open).first());
    await pause(1200);
    const d = page.locator(c.drawer).first();
    const b = await d.boundingBox();
    if (!b) return { error: '抽屉没有打开' };
    await touchDrag(w / 2, b.y + 14, w / 2, b.y + 130, 700);   // 先小拖一下再松手：应该跟手，再弹回去
    await pause(1000);
    const b2 = await d.boundingBox();
    const followed = b2 ? null : 'closed';
    if (b2) await touchDrag(w / 2, b2.y + 14, w / 2, b2.y + 430, 420); // 再用力往下划：应该关掉
    await pause(1300);
    const open = await page.locator(c.drawer).evaluateAll((els) => els.some((e) => (e.dataset.state ? e.dataset.state === 'open' : true)));
    return { still_open_after_swipe: open, followed };
  },
};
