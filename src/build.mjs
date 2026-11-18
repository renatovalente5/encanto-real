// Gerador do site da Encanto Real: lê content/ e escreve _site/ (páginas estáticas + assets).
//   node src/build.mjs                       local (base vazia)
//   node src/build.mjs --base=/encanto-real  pré-visualização no GitHub Pages
import { mkdir, rm, writeFile, readFile, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregar } from './lib/dados.mjs';
import { paginaInicio } from './templates/inicio.mjs';
import { PAGINAS } from './templates/paginas.mjs';
import { ACABAMENTOS } from './3d/acabamentos.js';
import { euros, precoDesde, podeAlugar } from './scripts/regras.js';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const arg = (n, padrao) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] ?? padrao;
const BASE = arg('base', '');
const SAIDA = join(RAIZ, arg('saida', '_site'));
const SITE_URL = arg('site', 'https://renatovalente5.github.io');

async function escrever(caminho, conteudo) {
  const f = join(SAIDA, caminho);
  await mkdir(dirname(f), { recursive: true });
  await writeFile(f, conteudo);
}

async function copiarAssets(ctx) {
  // CSS: as @font-face entram no topo, com a base certa
  const fontes = (await readFile(join(RAIZ, 'media/fontes/fontes.css'), 'utf8')).replaceAll('{{base}}', BASE);
  const css = (await readFile(join(RAIZ, 'src/estilos/site.css'), 'utf8')).replace('/*@@FONTES@@*/', fontes);
  const extra = existsSync(join(RAIZ, 'src/estilos/paginas.css')) ? await readFile(join(RAIZ, 'src/estilos/paginas.css'), 'utf8') : '';
  await escrever('assets/site.css', css + '\n' + extra);
  // JS do site
  await cp(join(RAIZ, 'src/scripts'), join(SAIDA, 'assets/js'), { recursive: true });
  // 3D: os nossos módulos, o three.js e o opentype (só se carregam quando há 3D na página)
  for (const f of ['pecas.js', 'cena.js', 'visor.js', 'acabamentos.js', 'cenas.js', 'itens.js']) await cp(join(RAIZ, 'src/3d', f), join(SAIDA, 'assets/3d', f));
  // a receita 3D de cada peça (para o visualizador da ficha)
  for (const p of ctx.dados.produtos) {
    const r = { id: p.id, cor: p.cor, cores: p.cores || null, combinacoes: p.combinacoes || null, modelo3d: p.modelo3d || null, cena3d: p.cena3d || null, texto3d: p.texto3d || null, digitos: !!p.digitos, personalizavel: p.personalizavel || null, tamanhos: (p.tamanhos || []).map((t) => ({ id: t.id, opcoes3d: t.opcoes3d })), vista: p.vista };
    await escrever(`assets/3d/produtos/${p.id}.json`, JSON.stringify(r));
  }
  const T = join(RAIZ, 'node_modules/three');
  await cp(join(T, 'build/three.module.min.js'), join(SAIDA, 'assets/3d/three.module.min.js'));
  for (const f of ['controls/OrbitControls.js', 'environments/RoomEnvironment.js', 'shaders/HorizontalBlurShader.js', 'shaders/VerticalBlurShader.js']) {
    await cp(join(T, 'examples/jsm', f), join(SAIDA, 'assets/3d/addons', f));
  }
  await cp(join(RAIZ, 'node_modules/opentype.js/dist/opentype.module.js'), join(SAIDA, 'assets/3d/opentype.module.js'));
  // media
  for (const d of ['marca', 'fontes', 'fontes-3d', 'produtos', 'cenas']) await cp(join(RAIZ, 'media', d), join(SAIDA, 'media', d), { recursive: true });
}

function catalogoJson(ctx) {
  const { produtos, categorias, ocasioes, cupoes, entregas, porId } = ctx.dados;
  const nomeCat = Object.fromEntries(categorias.map((c) => [c.id, c.nome]));
  const nomeOc = Object.fromEntries(ocasioes.map((o) => [o.id, o.nome]));
  return {
    v: ctx.versao,
    produtos: produtos.map((p) => ({
      id: p.id, nome: p.nome, resumo: p.resumo, categoria: p.categoria, categoriaNome: nomeCat[p.categoria],
      ocasioes: p.ocasioes, ocasioesNomes: (p.ocasioes || []).map((o) => nomeOc[o]),
      cor: p.cor, cores: p.cores || null, combinacoes: p.combinacoes || null, tamanhos: p.tamanhos || null,
      aluguer: p.aluguer, venda: p.venda, personalizavel: p.personalizavel || null, digitos: p.digitos || false,
      componentes: p.componentes || null, poupanca: p.poupanca || 0, fundo: p.fundo, selo: p.selo,
      medidas: p.medidas,
      precoTexto: podeAlugar(p) ? `${euros(precoDesde(p, 'aluguer'))}/evento` : euros(precoDesde(p, 'compra')),
    })),
    categorias, ocasioes, cupoes, entregas,
    acabamentos: Object.fromEntries(Object.entries(ACABAMENTOS).map(([k, a]) => [k, { nome: a.nome, hex: a.hex }])),
  };
}

async function main() {
  const t0 = Date.now();
  const dados = await carregar(RAIZ);
  const versao = Date.now().toString(36);
  const ctx = { base: BASE, siteUrl: SITE_URL, dados, versao, preVisualizacao: dados.site.preVisualizacao !== false };
  await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });
  await copiarAssets(ctx);
  await escrever('assets/catalogo.json', JSON.stringify(catalogoJson(ctx)));

  // página inicial (a variante escolhida) e as três propostas
  const variante = dados.site.variante || 'a';
  await escrever('index.html', paginaInicio(ctx, variante));
  for (const v of ['a', 'b', 'c']) await escrever(`propostas/${v}/index.html`, paginaInicio(ctx, v));

  // as outras páginas
  let n = 4;
  for (const gerar of PAGINAS) {
    for (const [caminho, html] of await gerar(ctx)) {
      await escrever(/\.(html|xml|txt)$/.test(caminho) ? caminho : join(caminho, 'index.html'), html);
      n++;
    }
  }
  await escrever('.nojekyll', '');
  console.log(`ok: ${n} páginas em ${SAIDA.replace(RAIZ + '/', '')} (base «${BASE}») em ${Date.now() - t0} ms`);
}

main().catch((e) => { console.error(e); process.exit(1); });
