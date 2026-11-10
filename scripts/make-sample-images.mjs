// Generates the neutral SVG placeholders in public/sample/ used by the SAMPLE catalog.
import { writeFileSync, mkdirSync } from 'node:fs';
const items = [
  ['sample-cotton-crew-tshirt', 'Cotton crew T-shirt', 'fashion'],
  ['sample-canvas-tote', 'Canvas tote bag', 'fashion'],
  ['sample-card-wallet', 'Slim card wallet', 'fashion'],
  ['sample-wireless-earbuds', 'Wireless earbuds', 'electronics'],
  ['sample-usb-c-charger', 'USB-C wall charger', 'electronics'],
  ['sample-bluetooth-speaker', 'Portable Bluetooth speaker', 'electronics'],
  ['sample-steel-bottle', 'Stainless steel bottle', 'kitchenware'],
  ['sample-cast-iron-tawa', 'Cast-iron tawa', 'kitchenware'],
  ['sample-bamboo-board', 'Bamboo chopping board', 'kitchenware'],
  ['sample-cotton-towel', 'Cotton bath towel', 'daily-essentials'],
  ['sample-glass-jars', 'Glass storage jars, set of 3', 'daily-essentials'],
  ['sample-steel-lunch-box', 'Steel lunch box', 'daily-essentials'],
];
const ICON = {
  fashion: '<path d="M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z"/>',
  electronics: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M9 20h6M12 16v4"/>',
  kitchenware: '<path d="M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z"/><path d="M19 12h2M9 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4"/>',
  'daily-essentials': '<path d="M8 3h8l-1 4H9z"/><rect x="7" y="7" width="10" height="14" rx="3"/><path d="M10 13h4"/>',
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
mkdirSync('public/sample', { recursive: true });
for (const [slug, name, cat] of items) {
  for (const n of [1, 2]) {
    const bg = n === 1 ? ['#17151a', '#0b0a0d'] : ['#1d1914', '#0d0b09'];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
<defs><radialGradient id="g" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs>
<rect width="1200" height="1200" fill="url(#g)"/>
<g transform="translate(${n === 1 ? 360 : 420} ${n === 1 ? 300 : 340}) scale(${n === 1 ? 20 : 15})" fill="none" stroke="#c9a46a" stroke-width="${n === 1 ? 0.6 : 0.8}" stroke-linecap="round" stroke-linejoin="round">${ICON[cat]}</g>
<text x="600" y="980" text-anchor="middle" font-family="Georgia, serif" font-size="54" fill="#ece6dc">${esc(name)}</text>
<text x="600" y="1050" text-anchor="middle" font-family="monospace" font-size="26" letter-spacing="8" fill="#a39d93">SAMPLE IMAGE${n === 2 ? ' · 2' : ''}</text>
</svg>`;
    writeFileSync(`public/sample/${slug}-${n}.svg`, svg);
  }
}
console.log('wrote', items.length * 2, 'svgs');
