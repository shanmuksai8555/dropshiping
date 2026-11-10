// QA: overflow check at 4 widths, 404 scan, and screenshots. Needs `npm run build && npm run preview` on :4173.
// node scripts/verify-shots.mjs [outDir]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const OUT = process.argv[2] || '/workspace/ora-shots';
const URL = process.env.URL || 'http://localhost:4173/dropshiping/';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--hide-scrollbars'] });
const bad = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(w, h, { throttle = false, mobile = false } = {}) {
  const page = await browser.newPage();
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => bad.push(`FAILED ${r.url()} ${r.failure()?.errorText}`));
  page.on('pageerror', (e) => bad.push(`pageerror ${e.message}`));
  let allDone = false;
  page.on('console', (m) => { if (m.text().startsWith('[frames]')) { allDone = true; console.log(`  ${w}x${h} ${m.text()}`); } });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  if (throttle) {
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 250 * 1024, uploadThroughput: 100 * 1024 });
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  return { page, waitAll: async () => { for (let i = 0; i < 300 && !allDone; i++) await sleep(100); } };
}
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120)))));
async function scrubTo(page, p) {
  await page.evaluate((p) => {
    const s = document.querySelector('.scrub');
    const span = s.offsetHeight - innerHeight;
    window.scrollTo({ top: s.offsetTop + span * p, behavior: 'instant' });
  }, p);
  await settle(page); await sleep(250); await settle(page);
}
async function toEl(page, sel, off = 0) {
  await page.evaluate((sel, off) => window.scrollTo({ top: document.querySelector(sel).getBoundingClientRect().top + scrollY + off, behavior: 'instant' }), sel, off);
  await settle(page); await sleep(300);
}
const info = (page) => page.evaluate(() => ({ count: document.querySelector('.scrub__count')?.textContent, sw: document.documentElement.scrollWidth, iw: innerWidth }));

// 1) preloader mid-load (throttled)
{
  const { page } = await open(1440, 900, { throttle: true });
  let shot = false;
  for (let i = 0; i < 200; i++) {
    const pct = await page.evaluate(() => Number(document.querySelector('.preloader')?.getAttribute('aria-valuenow') ?? -1));
    if (pct >= 25 && pct <= 75) { await page.screenshot({ path: `${OUT}/01-preloader-midload-1440.png` }); console.log('preloader captured at', pct + '%'); shot = true; break; }
    await sleep(150);
  }
  if (!shot) console.log('preloader mid-load NOT captured');
  await page.close();
}
// 2) desktop sequence
{
  const { page, waitAll } = await open(1440, 900);
  await page.waitForSelector('.preloader', { hidden: true, timeout: 30000 }).catch(() => {});
  await waitAll();
  await sleep(800);
  await scrubTo(page, 0); await page.screenshot({ path: `${OUT}/02-hero-1440.png` }); console.log('hero', await info(page));
  await scrubTo(page, 0.17); await page.screenshot({ path: `${OUT}/03-chapter01-1440.png` }); console.log('ch01', await info(page));
  await scrubTo(page, 0.4); await page.screenshot({ path: `${OUT}/04-mid-explode-40pct-1440.png` }); console.log('40%', await info(page));
  await scrubTo(page, 0.72); await page.screenshot({ path: `${OUT}/05-fully-exploded-1440.png` }); console.log('72%', await info(page));
  await scrubTo(page, 1); await page.screenshot({ path: `${OUT}/06-ready-to-ship-1440.png` }); console.log('100%', await info(page));
  await toEl(page, '#categories'); await page.screenshot({ path: `${OUT}/07-categories-1440.png` });
  await toEl(page, '.how'); await page.screenshot({ path: `${OUT}/08-how-it-works-1440.png` });
  await toEl(page, '#join', -60);
  await page.type('input[name=whatsapp]', '12345');
  await page.click('.join__form button[type=submit]'); await settle(page);
  await page.screenshot({ path: `${OUT}/09-whatsapp-form-errors-1440.png` });
  await page.type('input[name=name]', 'Asha Rao');
  await page.$eval('input[name=whatsapp]', (el) => el.focus()); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); await page.type('input[name=whatsapp]', '+91 98765 43210');
  await page.click('.join__form button[type=submit]'); await settle(page);
  await page.screenshot({ path: `${OUT}/10-whatsapp-thanks-1440.png` });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await settle(page);
  await page.screenshot({ path: `${OUT}/11-footer-1440.png` });
  await page.close();
}
// 3) mobile mid-explode
{
  const { page, waitAll } = await open(390, 844, { mobile: true });
  await page.waitForSelector('.preloader', { hidden: true, timeout: 30000 }).catch(() => {});
  await waitAll(); await sleep(500);
  await scrubTo(page, 0); await page.screenshot({ path: `${OUT}/12-hero-390.png` });
  await scrubTo(page, 0.4); await page.screenshot({ path: `${OUT}/13-mid-explode-390.png` }); console.log('390 40%', await info(page));
  await scrubTo(page, 0.72); await page.screenshot({ path: `${OUT}/14-exploded-390.png` });
  await toEl(page, '#categories'); await page.screenshot({ path: `${OUT}/15-categories-390.png` });
  await toEl(page, '#join', -40); await page.screenshot({ path: `${OUT}/16-join-390.png` });
  await page.close();
}
// 4) overflow at 4 widths, sampled across the page
for (const [w, h] of [[390, 844], [768, 1024], [1280, 800], [1920, 1080]]) {
  const { page, waitAll } = await open(w, h, { mobile: w < 800 });
  await page.waitForSelector('.preloader', { hidden: true, timeout: 30000 }).catch(() => {});
  await waitAll();
  let worst = 0;
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate((p) => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * p), p); await settle(page);
    const r = await page.evaluate(() => {
      const offenders = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 0.5).map((el) => el.className || el.tagName).slice(0, 5);
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, offenders };
    });
    worst = Math.max(worst, r.sw - r.iw);
    if (r.offenders.length) console.log(`  ${w}: elements past right edge at p=${p}:`, r.offenders);
  }
  console.log(`overflow ${w}x${h}: scrollWidth - innerWidth = ${worst} -> ${worst <= 0 ? 'PASS' : 'FAIL'}`);
  await page.screenshot({ path: `${OUT}/w${w}-bottom.png` });
  await page.close();
}
// 5) reduced motion
{
  const page = await browser.newPage();
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `${OUT}/17-reduced-motion-1440.png`, fullPage: true });
  const n = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/frames/')).length);
  console.log('reduced-motion frame requests:', n);
  await page.close();
}
// 6) shop link target
{
  const page = await browser.newPage();
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL + 'shop.html?category=fashion', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/18-shop-page-1440.png` });
  await page.close();
}
console.log(bad.length ? 'ERRORS/404s:\n' + [...new Set(bad)].join('\n') : 'no 4xx/5xx responses, no failed requests, no page errors');
await browser.close();
