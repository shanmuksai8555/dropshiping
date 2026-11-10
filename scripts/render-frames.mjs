#!/usr/bin/env node
// Renders the 240-frame "Lumen One" sequence into public/frames/0001.webp..0240.webp.
// Usage: node scripts/render-frames.mjs [--only=0,90,150] [--out=public/frames] [--quality=70]
// Needs: google-chrome (or CHROME_PATH), devDependencies three, puppeteer-core, sharp.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const outDir = path.resolve(root, args.out || 'public/frames');
const quality = Number(args.quality || 78);
const TOTAL = 240;
const list = args.only ? args.only.split(',').map(Number) : [...Array(TOTAL).keys()];
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/scripts/render/scene.html`);
await page.waitForFunction('window.ready === true', { timeout: 120000 });

// Edge vignette: fades every frame to flat #060608 at the borders so the site can letterbox
// (portrait phones) with a plain background colour and no visible seam.
const vignette = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000">
  <defs><radialGradient id="v" cx="50%" cy="48%" r="62%" gradientTransform="translate(0.5,0.48) scale(1,1.45) translate(-0.5,-0.48)">
    <stop offset="0.55" stop-color="#060608" stop-opacity="0"/><stop offset="1" stop-color="#060608" stop-opacity="1"/></radialGradient>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060608"/><stop offset="0.05" stop-color="#060608" stop-opacity="0"/>
    <stop offset="0.95" stop-color="#060608" stop-opacity="0"/><stop offset="1" stop-color="#060608"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#060608"/><stop offset="0.04" stop-color="#060608" stop-opacity="0"/>
    <stop offset="0.96" stop-color="#060608" stop-opacity="0"/><stop offset="1" stop-color="#060608"/></linearGradient></defs>
  <rect width="1600" height="1000" fill="url(#v)"/><rect width="1600" height="1000" fill="url(#t)"/><rect width="1600" height="1000" fill="url(#s)"/></svg>`);
let bytes = 0; const t0 = Date.now();
for (const i of list) {
  const url = await page.evaluate((f) => window.renderFrame(f), i);
  const png = Buffer.from(url.split(',')[1], 'base64');
  const file = path.join(outDir, String(i + 1).padStart(4, '0') + '.webp');
  const buf = await sharp(await sharp(png).composite([{ input: vignette }]).png().toBuffer()).webp({ quality, effort: 6, smartSubsample: true }).toBuffer();
  fs.writeFileSync(file, buf); bytes += buf.length;
  if (i % 20 === 0 || list.length < 20) console.log(`frame ${i + 1}/${TOTAL}  ${(buf.length / 1024).toFixed(1)} KB  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
console.log(`done: ${list.length} frames, ${(bytes / 1048576).toFixed(2)} MB total, avg ${(bytes / list.length / 1024).toFixed(1)} KB`);
await browser.close(); server.close();
