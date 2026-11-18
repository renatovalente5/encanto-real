// Abre o estúdio 3D (src/3d/estudio.html) num Chromium sem janela, servido do disco por page.route
// (sem servidor), e devolve uma função que faz cada imagem.
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const PW = '/Users/renatovalente/Websites/carimbo/node_modules/playwright/index.mjs';
const TIPOS = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.png': 'image/png' };

export async function abrirEstudio({ canal } = {}) {
  const { chromium } = await import(PW);
  const browser = await chromium.launch({
    headless: true,
    ...(canal ? { channel: canal } : {}),
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[estúdio]', m.type(), m.text()); });
  page.on('pageerror', (e) => console.log('[estúdio] erro', e.message));
  await page.route('http://estudio.local/**', async (route) => {
    const url = new URL(route.request().url());
    const caminho = join(RAIZ, decodeURIComponent(url.pathname));
    try {
      const corpo = await readFile(caminho);
      await route.fulfill({ status: 200, body: corpo, contentType: TIPOS[extname(caminho)] || 'application/octet-stream' });
    } catch {
      await route.fulfill({ status: 404, body: 'não existe: ' + url.pathname });
    }
  });
  await page.goto('http://estudio.local/src/3d/estudio.html');
  await page.waitForFunction(() => window.estudioPronto === true, null, { timeout: 30000 });
  const gl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2');
    if (!g) return 'sem webgl2';
    const d = g.getExtension('WEBGL_debug_renderer_info');
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'webgl2';
  });
  async function fazer(spec) {
    const dataUrl = await page.evaluate((s) => window.renderizar(s), spec);
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  }
  return { browser, page, fazer, gl };
}
