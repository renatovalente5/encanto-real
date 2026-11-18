// Cenas compostas para a capa e para as propostas (com balões). Saem em .cache/renders/_cenas/.
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirEstudio } from './estudio-local.mjs';
import { palco, PALETAS_PALCO } from '../src/3d/cenas.js';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const SAIDA = join(RAIZ, '.cache/renders/_cenas');

const CENAS = {
  ...Object.fromEntries(Object.entries(PALETAS_PALCO).map(([n, p]) => [`palco-${n}`, { itens: palco(p), vista: { az: 14, el: 7, margem: 0.06 } }])),
};

async function main() {
  await mkdir(SAIDA, { recursive: true });
  const { browser, fazer } = await abrirEstudio();
  for (const [nome, c] of Object.entries(CENAS)) {
    for (const [sufixo, tamanho] of [['largo', [2400, 1500]], ['alto', [1600, 2000]], ['quadrado', [1800, 1800]], ['retrato', [1600, 2667]]]) {
      const png = await fazer({ ...c, tamanho });
      await writeFile(join(SAIDA, `${nome}-${sufixo}.png`), png);
    }
    process.stdout.write(nome + ' ');
  }
  console.log();
  await browser.close();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
