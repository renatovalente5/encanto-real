// A lista das imagens de partilha que o site usa (a mesma escolha da capa de cada página: src/lib/seo.mjs).
// Lida pelo scripts/partilha.py, que faz os JPEG.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregar } from '../src/lib/dados.mjs';
import { partilhasPrecisas, partilhaFicheiro } from '../src/lib/seo.mjs';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const dados = await carregar(RAIZ);
console.log(JSON.stringify(partilhasPrecisas(dados).map((x) => ({ ...x, ficheiro: partilhaFicheiro(x) }))));
