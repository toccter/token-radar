// Screenshots for the token-radar entry: three 1280x800 JPEGs of the finished dashboard.
// Playwright with the system Chrome and the Hatch WebGL policy args (direct chrome headless
// fails without them). No network: the page loads from file:// out/dashboard/.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'out', 'dashboard', 'index.html');
const SHOTS = join(ROOT, 'screenshots');

const POLICY = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
const policy = readFileSync(POLICY);
const args = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  `--hatch-webgl-allowed-domains-file=${POLICY}`,
  `--hatch-webgl-allowed-domains-sha256=${createHash('sha256').update(policy).digest('hex')}`,
];

const TARGETS = [
  { name: '1-board.jpg', hash: '', wait: 'table.board tbody tr[data-slug]', expect: 'board rows' },
  { name: '2-detail.jpg', hash: '#p=steakhouse-financial', wait: '.model table', expect: 'detail model table' },
  { name: '3-filtered.jpg', hash: '#category=Risk%20Curators', wait: 'table.board tbody tr[data-slug]', expect: 'filtered rows' },
];

const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', headless: true, args });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));

  for (const t of TARGETS) {
    await page.goto(`file://${OUT}${t.hash}`, { waitUntil: 'load' });
    await page.waitForSelector(t.wait, { timeout: 15000 });
    await page.waitForTimeout(400);
    const path = join(SHOTS, t.name);
    await page.screenshot({ path, type: 'jpeg', quality: 82 });
    const rows = await page.evaluate(() => document.querySelectorAll('table.board tbody tr[data-slug]').length);
    const detailCheck = await page.evaluate(() => {
      const el = document.querySelector('.check');
      return el ? el.textContent.trim() : null;
    });
    console.log(`${t.name}: ${t.expect} present, board rows in view: ${rows}${detailCheck ? ` | check: ${detailCheck}` : ''}`);
  }
  console.log(errors.length === 0 ? 'no console errors, no failed requests' : `ERRORS:\n${errors.join('\n')}`);
  if (errors.length > 0) process.exit(1);
} finally {
  await browser.close();
}
