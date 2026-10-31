const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

async function fixture(run, { headings = '<h2>한글 제목</h2><h3>하위 제목</h3>', bodyId = 'tt-body-page' } = {}) {
  const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage();
    await page.setContent(`<body id="${bodyId}"><div id="external"></div>
      <div class="skin_view"><div class="area_title"><strong class="tit_category"><a href="/category/test">test</a></strong><h1 class="tit_post">Post</h1></div>
      <div class="area_view article-view">${headings}</div></div>
      <aside id="tocFloating" hidden><nav id="tocNavDesktop"></nav></aside>
      <button id="tocMobileBtn" hidden aria-expanded="false">Contents</button>
      <div id="tocMobileBackdrop" hidden></div>
      <section id="tocMobilePanel" hidden><button id="tocMobileClose">Close</button><nav id="tocNavMobile"></nav></section>`);
    await page.evaluate(() => { window.T = { entryInfo: {} }; });
    await page.addScriptTag({ path: path.join(__dirname, '../images/script.js') });
    await page.evaluate(() => window.SignalAyuToc.init());
    await run(page);
  } finally {
    await browser.close();
  }
}

test('one parent and one child show a working TOC; repeated init stays stable', async () => {
  await fixture(async page => {
    assert.equal(await page.locator('#tocFloating').evaluate(el => el.hidden), false);
    assert.deepEqual(await page.locator('#tocNavDesktop a').allTextContents(), ['한글 제목', '하위 제목']);
    const ids = await page.locator('.article-view h2, .article-view h3').evaluateAll(els => els.map(el => el.id));
    await page.evaluate(() => { window.SignalAyuToc.init(); window.SignalAyuHeadingAnchor.init(); });
    assert.deepEqual(await page.locator('.article-view h2, .article-view h3').evaluateAll(els => els.map(el => el.id)), ids);
    assert.equal(await page.locator('.heading-anchor').count(), 1);
    for (const link of await page.locator('#tocNavDesktop a').all()) {
      const id = await link.getAttribute('data-target');
      assert.equal(await page.evaluate(id => Array.from(document.querySelectorAll('[id]')).filter(el => el.id === id).length, id), 1);
      await link.click();
    }
  });
});

test('duplicate IDs, external collisions, HTML text and reserved object names are safe', async () => {
  await fixture(async page => {
    const ids = await page.locator('.article-view h2, .article-view h3').evaluateAll(els => els.map(el => el.id));
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(!ids.includes('external'));
    assert.equal(await page.locator('#tocNavDesktop img').count(), 0);
    assert.ok((await page.locator('#tocNavDesktop').textContent()).includes('<img src=x>'));
    for (const link of await page.locator('.heading-anchor').all()) {
      assert.equal(await link.getAttribute('href'), '#' + await link.evaluate(el => el.parentElement.id));
    }
  }, { headings: '<h2 id="external">&lt;img src=x&gt;</h2><h3 id="duplicate">Child A</h3><h3 id="duplicate">Child B</h3><h2>constructor</h2><h3>__proto__</h3>' });
});

test('mobile TOC moves focus on open and restores it on Escape', async () => {
  await fixture(async page => {
    await page.locator('#tocMobileBtn').click();
    assert.equal(await page.locator('#tocMobileBtn').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tocMobileClose');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#tocMobilePanel').evaluate(el => el.hidden), true);
    assert.equal(await page.locator('#tocMobileBtn').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tocMobileBtn');
  });
});

test('single headings and list pages keep TOC hidden', async () => {
  for (const options of [{ headings: '<h2>Only heading</h2>' }, { bodyId: 'tt-body-index' }]) {
    await fixture(async page => {
      assert.equal(await page.locator('#tocFloating').evaluate(el => el.hidden), true);
      assert.equal(await page.locator('#tocMobileBtn').evaluate(el => el.hidden), true);
    }, options);
  }
});

test('inline conversion preserves code blocks, links, listeners and copy success/failure', async () => {
  await fixture(async page => {
    await page.evaluate(() => {
      const article = document.querySelector('.article-view');
      article.innerHTML = '<div class="tt_article_useless_p_margin contents_style"><p>`하나` 그리고 `&lt;img src=x&gt;` <a href="/test" title="`attribute`">`link`</a><button id="keep">Keep</button></p><pre><code>const value = `block`;</code></pre><code>`existing`</code><p>``double`` 그리고 `unclosed</p></div>';
      window.keptButton = document.querySelector('#keep');
      window.keptButton.addEventListener('click', () => { window.keptClicks = (window.keptClicks || 0) + 1; });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: text => { window.copiedText = text; return window.failCopy ? Promise.reject(new Error('denied')) : Promise.resolve(); }
      } });
      window.SignalAyuCodeCopy.init();
      window.copyButton = document.querySelector('.btn_code_copy');
      window.SignalAyuInlineCode.init();
      window.SignalAyuInlineCode.init();
    });
    assert.deepEqual(await page.locator('.contents_style p code').allTextContents(), ['하나', '<img src=x>']);
    assert.equal(await page.locator('.contents_style img').count(), 0);
    assert.equal(await page.locator('.contents_style a').textContent(), '`link`');
    assert.equal(await page.locator('.contents_style a').getAttribute('title'), '`attribute`');
    assert.equal(await page.locator('.contents_style > code').textContent(), '`existing`');
    assert.equal(await page.locator('.contents_style p').last().textContent(), '``double`` 그리고 `unclosed');
    assert.equal(await page.evaluate(() => window.copyButton === document.querySelector('.btn_code_copy')), true);
    assert.equal(await page.evaluate(() => window.keptButton === document.querySelector('#keep')), true);
    await page.locator('#keep').click();
    assert.equal(await page.evaluate(() => window.keptClicks), 1);
    await page.locator('.btn_code_copy').click();
    await page.waitForFunction(() => document.querySelector('.btn_code_copy').textContent === 'Copied');
    assert.equal(await page.evaluate(() => window.copiedText), 'const value = `block`;');
    await page.evaluate(() => { window.failCopy = true; });
    await page.locator('.btn_code_copy').click();
    await page.waitForFunction(() => document.querySelector('.btn_code_copy').textContent === 'Failed');
    assert.equal(await page.locator('.btn_code_copy').count(), 1);
  });
});

test('notice CSS never hides the first regular post, with and without notices in both themes', async () => {
  await fixture(async page => {
    await page.addStyleTag({ path: path.join(__dirname, '../style.css') });
    for (const width of [320, 375, 390, 820, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        for (const notice of [false, true]) {
          await page.evaluate(({ theme, notice }) => {
            document.documentElement.setAttribute('data-theme', theme);
            const previous = document.querySelector('#dkContent');
            if (previous) previous.remove();
            const content = document.createElement('div');
            content.id = 'dkContent';
            content.innerHTML = '<div id="cMain">' + (notice ? '<div class="article_skin top_notice_wrap"><div class="list_content top_notice_content"><strong class="tit_post">공지</strong><div class="detail_info">Notice meta</div></div></div>' : '') + '<div class="article_skin regular-post"><div class="list_content"><strong class="tit_post">Post</strong><div class="detail_info">Post date/category</div></div></div></div>';
            document.body.appendChild(content);
          }, { theme, notice });
          assert.equal(await page.locator('.regular-post .detail_info').isVisible(), true, `${width}/${theme}/${notice}`);
          if (notice) {
            assert.equal(await page.locator('.top_notice_wrap .detail_info').isVisible(), false);
            const bg = await page.locator('.top_notice_content').evaluate(el => ({ image: getComputedStyle(el).backgroundImage, color: getComputedStyle(el).backgroundColor }));
            if (theme === 'light') assert.equal(bg.image, 'none');
            else assert.ok(bg.image.includes('linear-gradient'));
          }
        }
      }
    }
  });
});
