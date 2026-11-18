// Lê o conteúdo da loja (content/) e prepara o que as páginas precisam.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { poupancaCenario } from '../scripts/regras.js';

const lerJson = async (f) => JSON.parse(await readFile(f, 'utf8'));

export async function carregar(raiz) {
  const C = join(raiz, 'content');
  const ficheiros = (await readdir(join(C, 'produtos'))).filter((f) => f.endsWith('.json')).sort();
  const produtos = await Promise.all(ficheiros.map((f) => lerJson(join(C, 'produtos', f))));
  const categorias = await lerJson(join(C, 'categorias.json'));
  const ocasioes = await lerJson(join(C, 'ocasioes.json'));
  const cupoes = await lerJson(join(C, 'cupoes.json'));
  const entregas = await lerJson(join(C, 'entregas.json'));
  const site = existsSync(join(C, 'site.json')) ? await lerJson(join(C, 'site.json')) : {};
  const artigos = existsSync(join(C, 'inspiracao')) ? await lerArtigos(join(C, 'inspiracao')) : [];

  const porId = Object.fromEntries(produtos.map((p) => [p.id, p]));
  const ordemCat = Object.fromEntries(categorias.map((c, i) => [c.id, i]));
  produtos.sort((a, b) => (ordemCat[a.categoria] - ordemCat[b.categoria]) || (b.destaque - a.destaque) || a.nome.localeCompare(b.nome, 'pt'));
  for (const p of produtos) {
    p.cor = p.cor ?? 'base';
    if (p.categoria === 'cenarios') p.poupanca = poupancaCenario(p, porId);
  }
  return { produtos, porId, categorias, ocasioes, cupoes, entregas, site, artigos };
}

async function lerArtigos(dir) {
  const fs = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const lista = await Promise.all(fs.map((f) => lerJson(join(dir, f))));
  return lista.sort((a, b) => b.data.localeCompare(a.data));
}

// as cores à escolha de uma peça (com o nome e a amostra), ou as combinações
export function opcoesDeCor(prod, ACAB) {
  if (prod.combinacoes) return prod.combinacoes.map((c) => ({ id: c.id, nome: c.nome, amostras: c.cores.map((x) => ACAB[x]?.hex) }));
  if (!prod.cores) return [];
  return prod.cores.map((id) => ({ id, nome: ACAB[id]?.nome || id, amostras: [ACAB[id]?.hex] }));
}
