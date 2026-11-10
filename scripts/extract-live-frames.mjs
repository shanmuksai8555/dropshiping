// Build public/frames/0001.webp–0240.webp from the four product clips.
// 60 frames per chapter, 8-frame crossfades, cover-cropped to 1600×1000, WebP q78.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/frames');
const TMP = '/tmp/ora-footage/raw';
const W = 1600, H = 1000, Q = 78, PER = 60, FADE = 8, NEED = PER + FADE; // 68

const CLIPS = [
  'footage/clip-01-fashion.mp4',
  'footage/clip-02-electronics-v2.mp4',
  'footage/clip-03-kitchenware-v2.mp4',
  'footage/clip-04-essentials-v2.mp4',
].map((p) => path.join(ROOT, p));

function extractAll(clip, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  execFileSync('ffmpeg', [
    '-y', '-i', clip, '-vsync', '0', '-q:v', '2',
    path.join(dest, '%04d.jpg'),
  ], { stdio: 'pipe' });
  return fs.readdirSync(dest).filter((f) => f.endsWith('.jpg')).sort();
}

function pick(files, n) {
  if (files.length <= n) return files;
  return Array.from({ length: n }, (_, i) => files[Math.round((i * (files.length - 1)) / (n - 1))]);
}

// Cover-crop 1920×1088 (or whatever) to 1600×1000. Bias 20px toward the left
// so typography space on the left is preserved and any right-edge noise is cropped.
async function plate(file) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const scale = Math.max(W / width, H / height);
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);
  const left = Math.max(0, Math.round((sw - W) / 2 - 20));
  const top = Math.max(0, Math.round((sh - H) / 2));
  const buf = await sharp(file)
    .resize(sw, sh, { kernel: 'lanczos3' })
    .extract({ left: Math.min(left, sw - W), top: Math.min(top, sh - H), width: W, height: H })
    .removeAlpha()
    .raw()
    .toBuffer();
  // Subtle edge vignette toward #060608 so letterboxing on the site is seamless.
  const bg = [6, 6, 8];
  const out = Buffer.alloc(buf.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x / (W - 1)) * 2 - 1;
      const ny = (y / (H - 1)) * 2 - 1;
      // stronger at the very edges, almost none in the central product area
      const r = Math.sqrt(nx * nx * 0.85 + ny * ny);
      const v = Math.min(1, Math.max(0, (r - 0.72) / 0.48));
      const a = v * v * 0.55;
      const i = (y * W + x) * 3;
      out[i] = Math.round(buf[i] * (1 - a) + bg[0] * a);
      out[i + 1] = Math.round(buf[i + 1] * (1 - a) + bg[1] * a);
      out[i + 2] = Math.round(buf[i + 2] * (1 - a) + bg[2] * a);
    }
  }
  return { data: out, info: { width: W, height: H, channels: 3 } };
}

function lerp(a, b, t) {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) out[i] = Math.round(a[i] * (1 - t) + b[i] * t);
  return out;
}

async function encode(raw, dest) {
  await sharp(raw, { raw: { width: W, height: H, channels: 3 } })
    .webp({ quality: Q, effort: 5 })
    .toFile(dest);
}

const plates = [];
for (const [ci, clip] of CLIPS.entries()) {
  const dest = path.join(TMP, `c${ci + 1}`);
  console.log('extract', path.basename(clip));
  const files = extractAll(clip, dest);
  const chosen = pick(files, NEED);
  console.log(`  ${files.length} source frames → ${chosen.length} selected`);
  const ch = [];
  for (const f of chosen) ch.push(await plate(path.join(dest, f)));
  plates.push(ch);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const frames = new Array(240);
for (let k = 0; k < 4; k++) {
  const start = k * PER;
  for (let j = 0; j < PER; j++) {
    const i = start + j;
    const srcIndex = k === 0 ? j : j + FADE; // chapters 2–4 skip the fade-in heads already blended
    if (k < 3 && j >= PER - FADE) {
      const t = (j - (PER - FADE)) / (FADE - 1);
      const a = plates[k][srcIndex].data;
      const b = plates[k + 1][j - (PER - FADE)].data; // 0..7 of next
      frames[i] = lerp(a, b, t);
    } else {
      frames[i] = plates[k][srcIndex].data;
    }
  }
}

for (let i = 0; i < 240; i++) {
  const name = String(i + 1).padStart(4, '0') + '.webp';
  await encode(frames[i], path.join(OUT, name));
  if ((i + 1) % 60 === 0) console.log('wrote through', name);
}

const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.webp'));
const bytes = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
const meta = await sharp(path.join(OUT, '0001.webp')).metadata();
console.log(`done: ${files.length} frames, ${(bytes / 1e6).toFixed(2)} MB, first frame ${meta.width}x${meta.height}`);
