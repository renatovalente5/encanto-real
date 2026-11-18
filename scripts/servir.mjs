// Abre o _site num browser do Playwright sem servidor (page.route lê do disco), para capturas e provas.
//   const { browser, abrir } = await servir({ motor: 'chromium' });
//   const page = await abrir('/propostas/a/', { largura: 390, altura: 844, movel: true });
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const PW = '/Users/renatovalente/Websites/carimbo/node_modules/playwright/index.mjs';
export const ORIGEM = 'http://localhost:4321'; // localhost: contexto seguro (crypto.subtle), como o https do site
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.xml': 'application/xml', '.txt': 'text/plain' };

export async function servir({ motor = 'chromium', pasta = '_site', gpu = true } = {}) {
  const pw = await import(PW);
  const browser = await pw[motor].launch(motor === 'chromium' && gpu ? { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : {});
  const raiz = join(RAIZ, pasta);
  async function abrir(caminho, { largura = 1440, altura = 900, movel = false, reduzir = true, esperar = 'load', contexto } = {}) {
    const ctx = contexto || await browser.newContext({
      viewport: { width: largura, height: altura },
      deviceScaleFactor: movel ? 3 : 2,
      isMobile: movel && motor !== 'firefox',
      hasTouch: movel,
      reducedMotion: reduzir ? 'reduce' : 'no-preference',
      locale: 'pt-PT',
    });
    await ctx.route(`${ORIGEM}/**`, async (route) => {
      const url = new URL(route.request().url());
      let f = join(raiz, decodeURIComponent(url.pathname));
      try {
        if ((await stat(f)).isDirectory()) f = join(f, 'index.html');
      } catch {
        return route.fulfill({ status: 404, contentType: 'text/html; charset=utf-8', body: await readFile(join(raiz, '404.html')).catch(() => 'não existe') });
      }
      try {
        await route.fulfill({ status: 200, body: await readFile(f), contentType: TIPOS[extname(f)] || 'application/octet-stream' });
      } catch {
        await route.fulfill({ status: 404, body: 'não existe' });
      }
    });
    const page = await ctx.newPage();
    page.erros = [];
    page.on('pageerror', (e) => page.erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') page.erros.push(m.text()); });
    await page.goto(ORIGEM + caminho, { waitUntil: esperar });
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  return { browser, abrir };
}
