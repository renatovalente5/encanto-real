// Fotografias de estúdio das peças, feitas a partir dos modelos 3D (src/3d/pecas.js).
// Lê content/produtos/*.json e grava PNG com transparência em .cache/renders/<id>/<vista>-<cor>.png.
// Depois: python3 scripts/imagens.py (WebP em media/produtos/).
//
//   node scripts/renders.mjs                 todas as peças, todas as cores, todas as vistas
//   node scripts/renders.mjs arco-triplo-real só estas peças
//   node scripts/renders.mjs --principal     só a vista principal na cor de cada peça (rápido)
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirEstudio } from './estudio-local.mjs';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const SAIDA = join(RAIZ, '.cache/renders');
const args = process.argv.slice(2);
const so = args.filter((a) => !a.startsWith('--'));
const soPrincipal = args.includes('--principal');
const TAMANHO = [1600, 2000];

export async function lerProdutos() {
  const dir = join(RAIZ, 'content/produtos');
  const fs = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(fs.map(async (f) => JSON.parse(await readFile(join(dir, f), 'utf8'))));
}

export { itensDe, coresDe, corDe } from '../src/3d/itens.js';
import { itensDe, coresDe, corDe } from '../src/3d/itens.js';

export const VISTAS = {
  principal: (p) => ({ ...p.vista }),
  frente: (p) => ({ az: 0, el: 4, margem: p.vista?.margem ?? 0.1 }),
  lado: (p) => ({ az: 58, el: 14, margem: p.vista?.margem ?? 0.1 }),
  escala: () => ({ az: 0, el: 2, margem: 0.08, fov: 18 }),
};

async function main() {
  const produtos = (await lerProdutos()).filter((p) => !so.length || so.includes(p.id));
  const { browser, fazer, gl } = await abrirEstudio();
  console.log('GPU:', gl);
  let n = 0;
  const t0 = Date.now();
  for (const prod of produtos) {
    await mkdir(join(SAIDA, prod.id), { recursive: true });
    const trabalhos = [];
    const cores = soPrincipal ? [corDe(prod)] : coresDe(prod);
    for (const cor of cores) trabalhos.push(['principal', cor]);
    if (!soPrincipal) for (const v of ['frente', 'lado', 'escala']) trabalhos.push([v, corDe(prod)]);
    for (const [vista, cor] of trabalhos) {
      const spec = { itens: itensDe(prod, cor), vista: VISTAS[vista](prod), tamanho: vista === 'escala' ? [2000, 1600] : TAMANHO, escala: vista === 'escala' };
      const png = await fazer(spec);
      await writeFile(join(SAIDA, prod.id, `${vista}-${cor}.png`), png);
      n++;
    }
    process.stdout.write(`${prod.id} (${trabalhos.length}) `);
  }
  console.log(`\n${n} imagens em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await browser.close();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
