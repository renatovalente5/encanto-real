// Lê o conteúdo da loja (content/) e prepara o que as páginas precisam.
// As regras do conteúdo (src/lib/regras.mjs, as mesmas do painel) correm aqui: um «bloqueia» pára a publicação; um
// «neutraliza» tira do site só aquela peça, cupão ou fotografia; os avisos escrevem-se e seguem.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { poupancaCenario } from '../scripts/regras.js';
import { FICHEIROS, PASTAS, validar, neutralizar, bloqueios, temTresD, noSite, fotosDe, ordemDe, corPrincipal } from './regras.mjs';

const lerJson = async (f) => JSON.parse(await readFile(f, 'utf8'));
const lerTexto = async (f) => (existsSync(f) ? readFile(f, 'utf8') : null);

export async function carregar(raiz, { aberta = false, avisar = () => {} } = {}) {
  const C = join(raiz, 'content');
  // os textos tal e qual (as regras leem-nos como o painel os grava)
  const textos = {};
  for (const [k, f] of Object.entries(FICHEIROS)) textos[k] = await lerTexto(join(raiz, f));
  const nomesProdutos = (await readdir(join(raiz, PASTAS.produtos))).filter((f) => f.endsWith('.json')).sort().map((f) => f.slice(0, -5));
  textos.produtos = Object.fromEntries(await Promise.all(nomesProdutos.map(async (id) => [id, await lerTexto(join(raiz, PASTAS.produtos, `${id}.json`))])));
  const pastaFotos = join(raiz, PASTAS.fotos);
  textos.ficheirosFotos = existsSync(pastaFotos) ? (await readdir(pastaFotos)).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)) : [];
  if (textos.fotos === null) textos.fotos = '{}';

  const problemas = validar(textos, { aberta });
  const parar = bloqueios(problemas);
  if (parar.length) throw new Error(`o conteúdo tem problemas que param a publicação:\n${parar.map((p) => `- ${p.mensagem} (${p.ficheiro})`).join('\n')}`);
  for (const p of problemas) if (p.classe !== 'bloqueia') avisar(p);
  const fora = neutralizar(problemas);

  const categorias = JSON.parse(textos.categorias);
  const ocasioes = JSON.parse(textos.ocasioes);
  const cupoes = JSON.parse(textos.cupoes).filter((_, i) => !fora.cupoes.has(i));
  const entregas = JSON.parse(textos.entregas);
  const site = JSON.parse(textos.site);
  const fotos = JSON.parse(textos.fotos);
  const artigos = existsSync(join(C, 'inspiracao')) ? await lerArtigos(join(C, 'inspiracao')) : [];
  // as fotografias para a web (scripts/fotos.py); sem o manifesto, as fotografias não aparecem (e diz-se porquê)
  const fManifesto = join(raiz, '.cache/fotos/manifesto.json');
  const manifesto = existsSync(fManifesto) ? await lerJson(fManifesto) : {};

  // todas as peças (as referências: cenários, capas) e as que estão no site
  const todos = [];
  for (const id of nomesProdutos) {
    let p;
    try { p = JSON.parse(textos.produtos[id]); } catch { continue; }
    if (p === null || typeof p !== 'object' || Array.isArray(p)) continue;
    p.id = id;
    p.cor = corPrincipal(p);
    const semFoto = fora.fotos.get(id) || new Set();
    p._fotos = fotosDe(p).filter((f) => !semFoto.has(f)).map((nome) => {
      const m = manifesto[nome];
      if (!m) { avisar({ classe: 'avisa', chave: `foto:${nome}:sem-versoes`, mensagem: `a fotografia «${nome}» ainda não tem as versões para a web (python3 scripts/fotos.py)` }); return null; }
      return { nome, alt: fotos[nome]?.alt || p.nome, foco: fotos[nome]?.foco || '50% 50%', largura: m.largura, altura: m.altura, ficheiros: m.ficheiros };
    }).filter(Boolean);
    p._tresD = temTresD(p);
    p._noSite = noSite(p) && !fora.pecas.has(id) && (p._tresD || p._fotos.length > 0);
    todos.push(p);
  }
  const porId = Object.fromEntries(todos.map((p) => [p.id, p]));
  const produtos = todos.filter((p) => p._noSite);
  const ordemCat = Object.fromEntries(categorias.map((c, i) => [c.id, i]));
  produtos.sort((a, b) => (ordemCat[a.categoria] - ordemCat[b.categoria]) || (ordemDe(a) - ordemDe(b)) || (Number(!!b.destaque) - Number(!!a.destaque)) || a.nome.localeCompare(b.nome, 'pt'));
  for (const p of produtos) if (p.categoria === 'cenarios') p.poupanca = poupancaCenario(p, porId);
  return { produtos, porId, categorias, ocasioes, cupoes, entregas, site, artigos, fotos, problemas };
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
