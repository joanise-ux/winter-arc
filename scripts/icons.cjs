// Generuje ikony PNG z favicon.svg. Wymaga Playwrighta: NODE_PATH=$(npm root -g) node scripts/icons.cjs
const { readFileSync } = require('node:fs');
const { chromium } = require('playwright');

(async () => {

const svg = readFileSync('public/icons/favicon.svg', 'utf8');
const out = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['apple-touch-icon.png', 180, 1],
  ['icon-maskable-512.png', 512, 0.72],
];
const browser = await chromium.launch();
for (const [name, size, scale] of out) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0;background:#0a0b0d;display:grid;place-items:center;height:100vh">
       <div style="width:${size * scale}px;height:${size * scale}px">${svg}</div></body>`,
  );
  await page.screenshot({ path: `public/icons/${name}` });
  await page.close();
}
await browser.close();
})();
