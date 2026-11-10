// node scripts/contact-sheet.mjs [out.png] — every 20th frame from public/frames in a labelled grid
import sharp from 'sharp';
const out = process.argv[2] || 'frames-sheet.png';
const tw = 480, th = 300, cols = 4, idx = [];
for (let i = 1; i <= 240; i += 20) idx.push(i);
idx.push(240);
const comp = [];
for (const [k, i] of idx.entries()) {
  const name = String(i).padStart(4, '0');
  const img = await sharp(`public/frames/${name}.webp`).resize(tw, th).png().toBuffer();
  const label = Buffer.from(`<svg width="${tw}" height="28"><text x="10" y="20" font-family="monospace" font-size="16" fill="#c9a46a">frame ${name}</text></svg>`);
  const x = (k % cols) * tw, y = Math.floor(k / cols) * th;
  comp.push({ input: img, left: x, top: y }, { input: label, left: x, top: y });
}
await sharp({ create: { width: tw * cols, height: th * Math.ceil(idx.length / cols), channels: 3, background: '#000' } }).composite(comp).png().toFile(out);
console.log('wrote', out);
