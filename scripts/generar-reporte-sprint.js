// scripts/generar-reporte-sprint.js
// Genera, sin intervención humana, el mismo HTML standalone que produce el
// botón "Generar reporte" de la pestaña Resumen Ejecutivo del portal —
// pensado para correr en un cron (GitHub Actions) y alimentar un envío de
// correo programado (Power Automate), que lo toma como adjunto.
//
// Cómo funciona: sirve public/ con un servidor estático local (igual que
// `firebase serve`/`npx serve`, pero sin dependencias nuevas), carga un
// harness mínimo que trae datos.js + ds.js + seguimiento.js tal cual los usa
// el portal, y llama a window.SEG_GENERATE_REPORT_STANDALONE (expuesta en
// seguimiento.js solo para este propósito: no depende de login ni de que la
// pestaña esté montada, pide las mismas 7 fuentes públicas directamente).
//
// Salida: public/reports/latest.html (reporte completo) y
// public/reports/latest-summary.json (KPIs + texto corto para el cuerpo del
// correo). Estos dos archivos NO se commitean — se generan en el runner y
// se despliegan junto con el resto de public/ en el mismo job.
//
// Uso local: node scripts/generar-reporte-sprint.js

const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OUT_DIR = path.join(PUBLIC_DIR, 'reports');
const HARNESS_PATH = path.join(PUBLIC_DIR, '_report-harness.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function serveStatic(rootDir) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(rootDir, urlPath === '/' ? '/index.html' : urlPath);
    if (!filePath.startsWith(rootDir)) { res.writeHead(403); res.end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found: ' + urlPath); return; }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const HARNESS_HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Harness — generación desatendida del reporte</title>
<script src="/datos.js"></script>
<script src="/modules/ds.js"></script>
<script src="/modules/seguimiento.js"></script>
</head><body>
<script>
  window.__segReportDone = false;
  window.__segReportResult = null;
  window.__segReportError = null;
  (function esperarYGenerar(){
    if (typeof SEG_GENERATE_REPORT_STANDALONE !== 'function') { setTimeout(esperarYGenerar, 100); return; }
    SEG_GENERATE_REPORT_STANDALONE(function(err, result){
      window.__segReportDone = true;
      if (err) { window.__segReportError = String(err && err.message || err); return; }
      window.__segReportResult = result;
    });
  })();
</script>
</body></html>`;

async function main() {
  fs.writeFileSync(HARNESS_PATH, HARNESS_HTML);
  const server = await serveStatic(PUBLIC_DIR);
  const port = server.address().port;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('[harness pageerror]', e));
    page.on('console', (msg) => { if (msg.type() === 'error') console.error('[harness console]', msg.text()); });

    await page.goto(`http://127.0.0.1:${port}/_report-harness.html`, { waitUntil: 'load', timeout: 30000 });

    await page.waitForFunction('window.__segReportDone === true', { timeout: 60000 });

    const { result, error } = await page.evaluate(() => ({
      result: window.__segReportResult,
      error: window.__segReportError,
    }));

    if (error) throw new Error('SEG_GENERATE_REPORT_STANDALONE falló: ' + error);
    if (!result || !result.html) throw new Error('SEG_GENERATE_REPORT_STANDALONE no devolvió HTML.');

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'latest.html'), result.html);
    fs.writeFileSync(
      path.join(OUT_DIR, 'latest-summary.json'),
      JSON.stringify({
        generado_ts: new Date().toISOString(),
        summary_text: result.summaryText,
        kpis: result.kpis,
      }, null, 2)
    );

    console.log('OK — reporte generado: ' + result.kpis.sprint + ' (' + result.kpis.avance_pct + '%)');
  } finally {
    if (browser) await browser.close();
    server.close();
    fs.rmSync(HARNESS_PATH, { force: true });
  }
}

main().catch((err) => {
  console.error('ERROR generar-reporte-sprint:', err);
  process.exit(1);
});
