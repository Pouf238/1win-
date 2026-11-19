// Exporte chaque SVG de ../svg en PNG de 1200 px de large dans ../png
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const svgDir = path.join(__dirname, '..', process.argv[2] || 'svg');
  const pngDir = path.join(__dirname, '..', process.argv[3] || 'png');
  fs.mkdirSync(pngDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const f of fs.readdirSync(svgDir).filter((n) => n.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(svgDir, f), 'utf8');
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const H = Math.round((1200 * h) / w);
    await page.setViewportSize({ width: 1200, height: H });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">` +
        svg.replace(/width="\d+" height="\d+"/, 'width="1200" height="' + H + '"') +
        `</body></html>`
    );
    const out = path.join(pngDir, f.replace('.svg', '.png'));
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: 1200, height: H } });
    console.log('PNG', out, `1200x${H}`);
  }
  await browser.close();
})();
