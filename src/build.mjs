// Gerador do site da Encanto Real: lê content/ e escreve _site/ (páginas estáticas + assets).
//   node src/build.mjs                       local e no ar (https://encantoreal.pt, base vazia)
//   node src/build.mjs --base=/pasta         se um dia o site estiver numa subpasta
//   node src/build.mjs --ensaio-aberta --saida=.cache/aberta   como se a loja estivesse aberta, só para as provas
//                                            (scripts/testar.mjs --aberta); não passa pela guarda dos dados legais
import { mkdir, rm, writeFile, readFile, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregar } from './lib/dados.mjs';
import { paginaInicio } from './templates/inicio.mjs';
import { PAGINAS } from './templates/paginas.mjs';
import { ACABAMENTOS } from './3d/acabamentos.js';
import { entradaCatalogo } from './lib/catalogo.mjs';
import { INDEXNOW, dataGit, historicoRaso, fontesDaPagina, mapaDoSite } from './lib/seo.mjs';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const arg = (n, padrao) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] ?? padrao;
const BASE = arg('base', '');
const SAIDA = join(RAIZ, arg('saida', '_site'));
const SITE_URL = arg('site', 'https://encantoreal.pt');
const ENSAIO_ABERTA = process.argv.includes('--ensaio-aberta');
const avisosAbrir = new Set();

async function escrever(caminho, conteudo) {
  // com a loja aberta não pode ficar nada por confirmar nem as notas da pré-visualização (DL 7/2004, art. 10.º: quem
  // vende identifica-se; e um preço ou uma regra «de exemplo» não se anuncia)
  if (typeof conteudo === 'string' && caminho.endsWith('.html')) {
    if (conteudo.includes('[por confirmar')) avisosAbrir.add(`«[por confirmar]» em ${caminho}`);
    if (conteudo.includes('class="nota-pre"')) avisosAbrir.add(`nota da pré-visualização em ${caminho}`);
  }
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
  for (const d of ['marca', 'fontes', 'fontes-3d', 'produtos', 'cenas', 'partilha']) await cp(join(RAIZ, 'media', d), join(SAIDA, 'media', d), { recursive: true });
}

function catalogoJson(ctx) {
  const { produtos, categorias, ocasioes, cupoes, entregas, porId } = ctx.dados;
  const nomeCat = Object.fromEntries(categorias.map((c) => [c.id, c.nome]));
  const nomeOc = Object.fromEntries(ocasioes.map((o) => [o.id, o.nome]));
  return {
    v: ctx.versao,
    produtos: produtos.map((p) => entradaCatalogo(p, { nomeCat, nomeOc })),
    categorias, ocasioes, cupoes, entregas,
    acabamentos: Object.fromEntries(Object.entries(ACABAMENTOS).map(([k, a]) => [k, { nome: a.nome, hex: a.hex }])),
  };
}

async function main() {
  const t0 = Date.now();
  const dados = await carregar(RAIZ);
  const versao = Date.now().toString(36);
  const ctx = { base: BASE, siteUrl: SITE_URL, raiz: RAIZ, dados, versao, preVisualizacao: !ENSAIO_ABERTA && dados.site.preVisualizacao !== false, paginas: new Map() };
  // as datas do mapa vêm do git: no CI o histórico tem de vir todo (fetch-depth: 0), senão saem todas iguais
  if (process.env.GITHUB_ACTIONS && historicoRaso(RAIZ)) throw new Error('clonagem rasa: o mapa do site precisa do histórico todo (fetch-depth: 0 no actions/checkout)');
  await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });
  await copiarAssets(ctx);
  await escrever('assets/catalogo.json', JSON.stringify(catalogoJson(ctx)));

  // página inicial (a variante escolhida) e as três propostas
  const variante = dados.site.variante || 'a';
  await escrever('index.html', paginaInicio(ctx, variante));
  for (const v of ['a', 'b', 'c']) await escrever(`propostas/${v}/index.html`, paginaInicio(ctx, v, { proposta: true }));

  // as outras páginas
  let n = 4;
  for (const gerar of PAGINAS) {
    for (const [caminho, html] of await gerar(ctx)) {
      await escrever(/\.(html|xml|txt)$/.test(caminho) ? caminho : join(caminho, 'index.html'), html);
      n++;
    }
  }
  // o mapa do site: as páginas que ficam no Google com a loja aberta (as legais, as de utilidade e as propostas
  // ficam fora), cada uma com a data do último commit dos ficheiros de que é feita
  const noMapa = [...ctx.paginas].filter(([, p]) => p.indexar).map(([caminho]) => caminho);
  await escrever('sitemap.xml', mapaDoSite(dados.site, noMapa.map((caminho) => ({ caminho, data: dataGit(RAIZ, fontesDaPagina(caminho, dados)) }))));
  // robots.txt: aberto mesmo na pré-visualização; quem a fecha é o noindex de cada página (com «Disallow», o Google
  // não lia o noindex e podia guardar os endereços que visse ligados de fora)
  await escrever('robots.txt', `User-agent: *\nAllow: /\n${ctx.preVisualizacao ? '' : `\nSitemap: ${dados.site.url}/sitemap.xml\n`}`);
  await escrever(`${INDEXNOW}.txt`, INDEXNOW);
  await escrever('.nojekyll', '');
  // a guarda para abrir a loja: sem os dados da empresa e os contactos, ou com coisas por confirmar, não se publica
  if (!ctx.preVisualizacao && !ENSAIO_ABERTA) {
    const { site } = dados, e = site.empresa || {};
    const falta = [['nome da empresa', e.nome], ['NIF', e.nif], ['morada', e.morada], ['código postal', e.codigoPostal], ['email', site.email], ['telefone ou WhatsApp', site.telefone || site.whatsapp]].filter(([, v]) => !String(v ?? '').trim()).map(([n]) => n);
    if (falta.length || avisosAbrir.size) throw new Error(`a loja não pode abrir assim (content/site.json → "preVisualizacao": false):\n- falta: ${falta.join(', ') || 'nada'}\n- ${[...avisosAbrir].join('\n- ')}`);
  }
  console.log(`ok: ${n} páginas em ${SAIDA.replace(RAIZ + '/', '')} (base «${BASE}») em ${Date.now() - t0} ms`);
}

main().catch((e) => { console.error(e); process.exit(1); });
