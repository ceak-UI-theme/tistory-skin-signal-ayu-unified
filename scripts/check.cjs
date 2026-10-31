const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const postcss = require('postcss');
(async () => {
  const { parse } = await import('parse5');
  const html = fs.readFileSync('skin.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');
  const js = fs.readFileSync('images/script.js', 'utf8');
  for (const [name, source] of Object.entries({ html, css, js })) assert.ok(!source.includes('\ufffd'), `${name}: damaged encoding`);
  new vm.Script(js, { filename: 'images/script.js' });
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  postcss.parse(css, { from: 'style.css' });
  const errors = [];
  // Tistory expands some standalone tokens into complete attributes.
  const normalized = html.replace(/\[##_[\w]+_##\]/g, 'placeholder');
  parse(normalized, { onParseError: error => errors.push(`${error.code}:${error.startLine}`) });
  assert.deepEqual(errors, [], 'HTML parser errors');
  const stack = [];
  for (const tag of html.matchAll(/<(\/?)s_([a-z_]+)\b[^>]*>/g)) {
    if (!tag[1]) stack.push(tag[2]);
    else assert.equal(stack.pop(), tag[2], 'Tistory block nesting');
  }
  assert.equal(stack.length, 0);
  const version = fs.readFileSync('index.xml', 'utf8').match(/<version>([^<]+)<\/version>/)[1];
  assert.ok(html.includes(`script.js?v=${version}`));
  assert.ok(css.includes(`Version: v${version}`));
  assert.ok(fs.readFileSync('CHANGELOG.md', 'utf8').includes(`## v${version}`));
  assert.equal(fs.readFileSync('my/skin.html', 'utf8'), html);
  for (const token of ['revenue_list_upper', 'revenue_list_lower']) assert.equal(html.split(`[##_${token}_##]`).length - 1, 1);
  const notice = html.match(/<s_rct_notice_rep>([\s\S]*?)<\/s_rct_notice_rep>/)[1];
  assert.ok(!/notice_rep_(summary|date)/.test(notice));
  assert.ok(!/\.article_skin:first-child/.test(css));
  assert.ok(!/innerHTML\s*=.*replace/.test(html));
  console.log(`Static HTML/template/JS/CSS/version checks PASS (${version})`);
})().catch(error => { console.error(error); process.exitCode = 1; });
