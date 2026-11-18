// One-off verification: farm steps render, the value bar has height, the lede is clean, live view works.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright');
const POLICY = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
const policy = readFileSync(POLICY);
const browser = await chromium.launch({
  executablePath: '/opt/meta-chromium/chrome',
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--hatch-webgl-allowed-domains-file=${POLICY}`,
    `--hatch-webgl-allowed-domains-sha256=${createHash('sha256').update(policy).digest('hex')}`,
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const base = 'file:///home/hatch/workspace/goals/three-track-income-push/files/token-radar/out/dashboard/index.html';

await page.goto(`${base}#p=steakhouse-financial`, { waitUntil: 'load' });
await page.waitForSelector('.steps li', { timeout: 10000 });
const steps = await page.evaluate(() => [...document.querySelectorAll('.steps li')].map((li) => li.textContent.trim().slice(0, 110)));
console.log('farm steps rendered:', steps.length);
steps.forEach((s, i) => console.log(`${i + 1}.`, s));

await page.goto(base, { waitUntil: 'load' });
await page.waitForSelector('table.board tbody tr[data-slug]');
const barH = await page.evaluate(() => {
  const b = document.querySelector('.bar');
  const r = b.getBoundingClientRect();
  return `${r.height}px high, ${Math.round(r.width)}px wide`;
});
console.log('implied-value bar size:', barH);
console.log('lede:', await page.evaluate(() => document.getElementById('lede').textContent.slice(0, 150)));
await page.evaluate(() => { location.hash = '#view=live'; });
await page.waitForTimeout(300);
console.log('live rows:', await page.evaluate(() => document.querySelectorAll('table.board tbody tr').length));
console.log('page errors:', errs.length ? errs.join('; ') : 'none');
await browser.close();
