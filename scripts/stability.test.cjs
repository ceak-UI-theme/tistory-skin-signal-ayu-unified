const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const widths = [320, 375, 390, 820, 1280, 1440];
const article = '<div class="tt_article_useless_p_margin contents_style"><h2 id="기존">한글 &amp; &lt;제목&gt;</h2><p>' + '본문 내용 '.repeat(1000) + '</p><h3>중간 제목</h3><p>' + '후반 내용 '.repeat(1000) + '</p><h2>마지막 제목</h2><p>' + '마지막 내용 '.repeat(1000) + '</p><pre><code>const x = `test`;</code></pre></div>';
function render({ kind = 'post', notice = true, content = article, ads = false } = {}) {
  let html = fs.readFileSync(path.join(root, 'skin.html'), 'utf8');
  const drop = tag => { html = html.replace(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g'), ''); };
  for (const [tag, type] of Object.entries({ s_notice_rep: 'notice', s_page_rep: 'page', s_article_protected: 'protected', s_article_rep: 'post' })) if (kind !== type) drop(tag);
  for (const tag of ['s_index_article_rep', 's_tag', 's_guest', 's_paging', 's_sidebar', 's_list']) drop(tag);
  if (!notice) drop('s_rct_notice');
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<link\b[^>]*>/g, '').replace(/<\/?s_[^>]+>/g, '');
  const values = { body_id: kind === 'list' ? 'tt-body-index' : kind === 'notice' ? 'tt-body-notice' : 'tt-body-page',
    article_rep_desc: content, notice_rep_desc: content, article_rep_category_link: '/category/test', category_list: '<a href="/category/test">테스트</a>',
    page_title: 'Fixture', title: 'Blog', blogger: 'Author', notice_rep_title: '공지 제목', notice_rep_link: '/notice/95',
    revenue_list_upper: ads ? '<iframe title="광고 fixture" style="width:970px;height:40px;border:0"></iframe>' : '',
    revenue_list_lower: ads ? '<div style="width:970px;height:40px">Ad fixture</div>' : '' };
  return html.replace(/\[##_([\w]+)_##\]/g, (_, key) => values[key] || '');
}
async function fixture(run, options = {}) {
  const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: options.width || 390, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent(render(options));
    await page.addStyleTag({ path: path.join(root, 'style.css') });
    if (options.hash) await page.evaluate(hash => { location.hash = hash; }, options.hash);
    await page.addScriptTag({ path: require.resolve('jquery/dist/jquery.js') });
    await page.addScriptTag({ path: path.join(root, 'images/script.js') });
    await page.evaluate(() => {
      window.SignalAyuTheme.init(); window.SignalAyuControls.init();
      window.SignalAyuTables.init(); window.SignalAyuToc.init(); window.jQuery.Area.init();
    });
    await run(page);
    assert.deepEqual(errors, [], 'browser runtime errors');
  } finally { await browser.close(); }
}

test('template contexts: post, notice and page show TOC; protected and lists do not', async () => {
  for (const kind of ['post', 'notice', 'page', 'protected', 'list']) {
    await fixture(async page => {
      assert.equal(await page.locator('#tocMobileBtn').evaluate(el => !el.hidden), ['post', 'notice', 'page'].includes(kind), kind);
      if (['post', 'notice', 'page'].includes(kind)) {
        assert.equal(await page.locator('#tocNavMobile a').first().textContent(), '한글 & <제목>');
        assert.equal(await page.locator('#tocNavMobile a').first().getAttribute('data-target'), '기존');
      }
    }, { kind });
  }
});

test('tables: all editor styles, spans, explicit colors, system exclusion and scrolling across viewport/theme matrix', async () => {
  const table = style => `<table data-ke-style="style${style}" style="width:100%"><caption>표 ${style}</caption><tbody><tr><td colspan="2">Header</td><th>More</th></tr><tr><td rowspan="2">병합</td><td>긴문자열${'abcdef'.repeat(25)}</td><td><code>${'x'.repeat(100)}</code></td></tr><tr><td>Second</td><td style="background-color:rgb(12, 34, 56);color:rgb(255, 255, 255)">Custom</td></tr></tbody></table>`;
  await fixture(async page => {
    assert.equal(await page.locator('.ayu-table-scroll').count(), 17);
    assert.equal(await page.locator('.another_category .ayu-content-table').count(), 0);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => { window.SignalAyuTheme.apply(theme); window.SignalAyuTables.init(); }, theme);
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          wrappers: [...document.querySelectorAll('.ayu-table-scroll')].map(el => ({ width: el.clientWidth, scroll: el.scrollWidth, overflow: getComputedStyle(el).overflowX })),
          custom: getComputedStyle([...document.querySelectorAll('td')].find(el => el.textContent === 'Custom')).backgroundColor,
          spans: [document.querySelector('[colspan]').colSpan, document.querySelector('[rowspan]').rowSpan],
          border8: getComputedStyle(document.querySelector('[data-ke-style=style8] td')).borderLeftColor,
          border16: getComputedStyle(document.querySelector('[data-ke-style=style16] td')).borderBottomColor
        }));
        assert.ok(metrics.overflow <= 1, `${width}/${theme}: page overflow ${metrics.overflow}`);
        assert.ok(metrics.wrappers.every(el => el.overflow === 'auto' && el.width <= width));
        assert.equal(metrics.custom, 'rgb(12, 34, 56)');
        assert.deepEqual(metrics.spans, [2, 2]);
        assert.equal(metrics.border8, 'rgba(0, 0, 0, 0)');
        assert.equal(metrics.border16, 'rgba(0, 0, 0, 0)');
        if (width === 320) assert.ok(metrics.wrappers.some(el => el.scroll > el.width));
      }
    }
    assert.equal(await page.locator('.ayu-table-scroll').count(), 17);
    await page.locator('.ayu-table-scroll').first().focus();
    assert.equal(await page.locator('.ayu-table-scroll').first().getAttribute('role'), 'region');
  }, { content: '<div class="contents_style tt_article_useless_p_margin">' + Array.from({ length: 16 }, (_, i) => table(i + 1)).join('') + '<table style="width:1200px"><tr><td>Wide plain</td><td>More</td></tr></table><div class="another_category"><table><tr><th>System</th><td>Other</td></tr></table></div></div>' });
});

test('notice and ad containers protect post metadata and document width', async () => {
  for (const notice of [false, true]) await fixture(async page => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => window.SignalAyuTheme.apply(theme), theme);
        assert.equal(await page.locator('.skin_view .txt_detail').isVisible(), true);
        assert.equal(await page.locator('.top_notice_content').count(), notice ? 1 : 0);
        if (notice) {
          assert.equal(await page.locator('.top_notice_content .notice-label').textContent(), '공지');
          assert.equal(await page.locator('.top_notice_content .txt_post, .top_notice_content .detail_info').count(), 0);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${theme}/notice=${notice}`);
      }
    }
  }, { notice, ads: true });
});

test('keyboard menu, disclosures, search, modal Tab cycle and responsive close', async () => {
  await fixture(async page => {
    const menu = page.locator('.btn_menu');
    await menu.focus(); await page.keyboard.press('Enter');
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#dkContent').evaluate(el => el.inert), true);
    assert.equal(await page.evaluate(() => document.activeElement.className), 'btn_close');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.closest('#dkGnb') !== null), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'btn_close');
    await page.locator('#tfSearch').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.btn_search').getAttribute('aria-expanded'), 'false');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'btn_menu');
    assert.equal(await page.locator('#dkContent').evaluate(el => el.inert), false);
    await page.keyboard.press('Space');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForFunction(() => !document.body.classList.contains('layer_on'));
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    await page.locator('.btn_search').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tfSearch');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'btn_search');
    await page.locator('.btn_cate').focus(); await page.keyboard.press('Space');
    assert.equal(await page.locator('.btn_cate').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.btn_cate').getAttribute('aria-expanded'), 'false');
    await page.locator('.btn_name').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.btn_name').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.btn_name').getAttribute('aria-expanded'), 'false');
  });
});

test('TOC modal focus cycle, 1280 boundary and heading offset/active state', async () => {
  await fixture(async page => {
    await page.locator('#tocMobileBtn').focus(); await page.keyboard.press('Space');
    assert.equal(await page.locator('.wrap_skin').evaluate(el => el.inert), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('toc-link')), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tocMobileClose');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForFunction(() => document.querySelector('#tocMobilePanel').hidden);
    assert.equal(await page.locator('.wrap_skin').evaluate(el => el.inert), false);
    assert.equal(await page.evaluate(() => document.activeElement.closest('#tocNavDesktop') !== null), true);
    await page.locator('#tocNavDesktop a').last().click();
    await page.waitForFunction(() => Math.abs(document.querySelector('.article-view h2:last-of-type').getBoundingClientRect().top - (document.querySelector('.area_head').offsetHeight + 12)) < 4);
    assert.equal(await page.locator('#tocNavDesktop a').last().getAttribute('aria-current'), 'true');
    await page.setViewportSize({ width: 820, height: 900 });
    await page.locator('#tocMobileBtn').click(); await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tocMobileBtn');
  });
});

test('theme toggle, contrast and reading progress remain functional', async () => {
  await fixture(async page => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => window.SignalAyuTheme.apply(theme), theme);
        assert.equal(await page.locator('.btn_theme').getAttribute('aria-pressed'), String(theme === 'dark'));
        const ratio = await page.evaluate(() => {
          const styles = getComputedStyle(document.documentElement);
          const luminance = hex => { const rgb = hex.trim().replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
          const bg = luminance(styles.getPropertyValue('--bg'));
          return ['--text', '--text-muted', '--link'].map(token => { const fg = luminance(styles.getPropertyValue(token)); return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05); });
        });
        assert.ok(ratio.every(x => x >= 4.5), `${theme}: ${ratio}`);
      }
    }
    await page.locator('.btn_theme').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await page.evaluate(() => document.querySelector('.btn_theme').getAttribute('aria-label')), '다크모드로 전환');
    await page.evaluate(() => window.scrollTo(0, document.querySelector('.article-view').offsetTop + 600));
    await page.waitForFunction(() => document.querySelector('.reading_progress').classList.contains('is-active'));
    assert.ok(await page.locator('.reading_progress_bar').evaluate(el => parseFloat(el.style.width) > 0));
    assert.equal(await page.locator('.reading_time').count(), 1);
  }, { width: 1440 });
});


test('initial Korean hash aligns below header and TOC clicks preserve encoded hash', async () => {
  await fixture(async page => {
    await page.waitForFunction(() => Math.abs(document.getElementById('기존').getBoundingClientRect().top - (document.querySelector('.area_head').offsetHeight + 12)) < 4);
    await page.locator('#tocNavDesktop a').last().click();
    assert.equal(await page.evaluate(() => decodeURIComponent(location.hash.slice(1))), await page.locator('#tocNavDesktop a').last().getAttribute('data-target'));
  }, { width: 1440, hash: encodeURIComponent('기존') });
});

test('visible controls expose keyboard focus and menu restores background for all mobile sizes/themes', async () => {
  await fixture(async page => {
    for (const width of [320, 375, 390, 820]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => window.SignalAyuTheme.apply(theme), theme);
        await page.locator('.btn_menu').focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('.btn_menu').getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('btn_theme')), true);
        assert.equal(await page.locator('.btn_theme').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#dkContent').evaluate(el => el.inert), false);
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('btn_menu')), true);
      }
    }
  });
});


test('TOC supports H1/H2 and H3/H4 hierarchies and retains an existing section anchor', async () => {
  for (const content of [
    '<h1>상위</h1><h2 id="stable">하위<a class="heading-anchor" href="#stale">#</a></h2>',
    '<h3>상위</h3><h4>하위</h4>'
  ]) await fixture(async page => {
    assert.equal(await page.locator('#tocNavMobile .toc-link').count(), 2);
    assert.deepEqual(await page.locator('#tocNavMobile .toc-link').allTextContents(), ['상위', '하위']);
    if (await page.locator('#stable').count()) {
      assert.equal(await page.locator('#stable .heading-anchor').count(), 1);
      assert.equal(await page.locator('#stable .heading-anchor').getAttribute('href'), '#stable');
    }
  }, { content });
});
