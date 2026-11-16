// Renderiza presentacion.html a PDF (Carta US) y un PNG por página para revisar.
// Uso: node render.js <salida.pdf> <carpeta-previews>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || 'LUJIS_Presentacion_Marca_v1.pdf';
  const prevDir = process.argv[3] || '.';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  await page.goto('file://' + path.resolve(__dirname, 'presentacion.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: out, width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true });
  const pages = await page.$$('.page');
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: path.join(prevDir, `p${i + 1}.png`) });
  }
  await browser.close();
})();
