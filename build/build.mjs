// Validates the Squarespace sources and writes paste-ready files to dist/.
//   npm run build   -> checks + dist/
//   npm run check   -> checks only (used in CI)
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { Script } from 'node:vm';
import path from 'node:path';
import less from 'less';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const checkOnly = process.argv.includes('--check');
const read = (p) => readFile(path.join(root, p), 'utf8');
const errors = [];

// 1. LESS must compile (Squarespace compiles the same source server-side).
const lessSrc = await read('styles/custom.less');
let css = '';
try {
  css = (await less.render(lessSrc, { filename: 'custom.less' })).css;
} catch (err) {
  errors.push(`styles/custom.less: ${err.message} (line ${err.line})`);
}

// 2. Code Block snippets: Squarespace strips <style> and <script> there.
for (const file of await readdir(path.join(root, 'blocks'))) {
  if (!file.endsWith('.html')) continue;
  const html = await read(`blocks/${file}`);
  if (/<style[\s>]/i.test(html)) errors.push(`blocks/${file}: contains a <style> tag — move it to styles/custom.less`);
  if (/<script[\s>]/i.test(html)) errors.push(`blocks/${file}: contains a <script> tag — move it to scripts/main.js`);
  if (/\sstyle\s*=/i.test(html)) errors.push(`blocks/${file}: contains an inline style attribute — use a class in styles/custom.less`);
}

// 3. The footer script must parse and be safe to wrap in <script>.
const js = await read('scripts/main.js');
try {
  new Script(js, { filename: 'scripts/main.js' });
} catch (err) {
  errors.push(`scripts/main.js: ${err.message}`);
}
if (/<\/script/i.test(js)) errors.push('scripts/main.js: contains "</script" which would end the injected tag early');

if (errors.length) {
  console.error('Build failed:\n  - ' + errors.join('\n  - '));
  process.exit(1);
}

if (!checkOnly) {
  await mkdir(path.join(root, 'dist'), { recursive: true });
  const out = (p, s) => writeFile(path.join(root, 'dist', p), s);
  await out('custom.css', css);
  await out('header-injection.html', await read('injection/header.html'));
  await out('footer-injection.html', `<!-- Fidelity Capital site scripts — generated from scripts/main.js; do not edit here -->\n<script>\n${js}</script>\n`);
  console.log('dist/ written: custom.css, header-injection.html, footer-injection.html');
}
console.log(`OK — LESS compiled (${css.length} bytes CSS), blocks clean, main.js parses.`);
