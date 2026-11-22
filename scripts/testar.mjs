// As provas do que o Google e as partilhas leem, no _site construído (corre no CI depois do build):
//   node scripts/testar.mjs [_site]
//   node src/build.mjs --ensaio-aberta --saida=.cache/aberta && node scripts/testar.mjs .cache/aberta --aberta
// - cada página: um <title>, uma descrição, o canónico dela, um <h1>, imagens com alt, JSON-LD que se lê;
// - o mapa do site: só as páginas de destino (nunca as legais, as de política, as de utilidade nem as propostas),
//   todas construídas, com data; as de destino estão todas lá;
// - os títulos (até 60 letras antes de « | Encanto Real») e as descrições (50 a 160) das páginas do mapa, sem repetir;
// - o noindex: todas na pré-visualização; com a loja aberta, só as que estão fora do mapa;
// - a partilha: cada página aponta para uma imagem que existe, com as medidas certas; as peças, as categorias e os
//   artigos com o JPEG 1200×630 deles;
// - os dados estruturados das peças: o preço do Offer é o que a ficha mostra;
// - robots.txt aberto e a chave do IndexNow publicada.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDEXNOW } from '../src/lib/seo.mjs';
import { euros } from '../src/scripts/regras.js';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const SITE = resolve(RAIZ, process.argv.slice(2).find((a) => !a.startsWith('--')) || '_site');
const site = JSON.parse(readFileSync(join(RAIZ, 'content/site.json'), 'utf8'));
const URL0 = site.url;
// --aberta: o _site foi feito com `node src/build.mjs --ensaio-aberta` (como se a loja estivesse aberta)
const preVisualizacao = !process.argv.includes('--aberta') && site.preVisualizacao !== false;

let falhas = 0, avisos = 0;
const falha = (m) => { falhas++; console.log(`FALHA ${m}`); };
const aviso = (m) => { avisos++; console.log(`aviso ${m}`); };
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const um = (s, re) => [...s.matchAll(re)].map((m) => m[1]);

async function* paginasHtml(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* paginasHtml(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

// medidas de um JPEG (marcador SOF) ou de um WebP (VP8/VP8L/VP8X)
function medidas(f) {
  const b = readFileSync(f);
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const t = b.toString('ascii', 12, 16);
    if (t === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (t === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  }
  return null;
}

// ── o mapa do site ──────────────────────────────────────────────────────────
const mapa = await readFile(join(SITE, 'sitemap.xml'), 'utf8');
const entradas = [...mapa.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map((m) => ({ caminho: m[1].replace(URL0, ''), data: m[2] }));
const noMapa = new Set(entradas.map((e) => e.caminho));
if (!entradas.length) falha('o mapa do site está vazio');
for (const e of entradas) {
  if (!existsSync(join(SITE, e.caminho, 'index.html'))) falha(`no mapa sem página: ${e.caminho}`);
  if (!e.data) aviso(`no mapa sem data (sem git?): ${e.caminho}`);
  else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(e.data)) falha(`data do mapa estranha em ${e.caminho}: ${e.data}`);
}
// a regra de 13 nov 2026: as legais, as de política e as de utilidade ficam fora; as de destino ficam dentro
const FORA = ['/termos/', '/privacidade/', '/ajuda/litigios/', '/ajuda/entregas/', '/carrinho/', '/finalizar/', '/obrigado/', '/favoritos/', '/conta/', '/conta/entrar/', '/conta/criar/', '/conta/recuperar/', '/propostas/a/', '/propostas/b/', '/propostas/c/', '/404.html'];
for (const c of FORA) if (noMapa.has(c)) falha(`fora do Google mas no mapa: ${c}`);
const conteudo = (pasta) => {
  const d = join(RAIZ, 'content', pasta);
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(d, f), 'utf8'))) : [];
};
const produtos = conteudo('produtos'), artigos = conteudo('inspiracao');
const categorias = JSON.parse(readFileSync(join(RAIZ, 'content/categorias.json'), 'utf8'));
const DESTINO = ['/', '/loja/', ...categorias.map((c) => `/loja/${c.id}/`), ...produtos.map((p) => `/loja/${p.id}/`), '/monta/', '/inspiracao/', ...artigos.map((a) => `/inspiracao/${a.id}/`), '/ajuda/como-alugar/', '/ajuda/perguntas/', '/sobre/', '/contactos/'];
for (const c of DESTINO) if (!noMapa.has(c)) falha(`página de destino fora do mapa: ${c}`);

// ── cada página ─────────────────────────────────────────────────────────────
const titulos = new Map(), descricoes = new Map();
let n = 0;
for await (const f of paginasHtml(SITE)) {
  n++;
  const s = await readFile(f, 'utf8');
  const caminho = '/' + f.slice(SITE.length + 1).replace(/index\.html$/, '');
  const titulo = um(s, /<title>([^<]*)<\/title>/g).map(dec);
  const descricao = um(s, /<meta name="description" content="([^"]*)"/g).map(dec);
  const robots = um(s, /<meta name="robots" content="([^"]*)"/g)[0] || '';
  const canonico = um(s, /<link rel="canonical" href="([^"]*)"/g);
  const h1 = (s.match(/<h1[\s>]/g) || []).length;
  if (titulo.length !== 1) falha(`${caminho}: ${titulo.length} títulos`);
  if (descricao.length !== 1) falha(`${caminho}: ${descricao.length} descrições`);
  if (caminho !== '/404.html' && (canonico.length !== 1 || canonico[0] !== URL0 + caminho)) falha(`${caminho}: canónico ${canonico.join(' ')}`);
  if (h1 !== 1 && !/\/obrigado\/$/.test(caminho)) falha(`${caminho}: ${h1} h1`);
  const semAlt = (s.match(/<img(?![^>]*\balt=)[^>]*>/g) || []).length;
  if (semAlt) falha(`${caminho}: ${semAlt} imagens sem alt`);
  // noindex
  const noindex = /noindex/.test(robots);
  if (preVisualizacao && !noindex) falha(`${caminho}: pré-visualização sem noindex`);
  if (!preVisualizacao && noMapa.has(caminho) && noindex) falha(`${caminho}: no mapa mas com noindex`);
  if (!preVisualizacao && !noMapa.has(caminho) && !noindex) falha(`${caminho}: fora do mapa mas sem noindex`);
  // títulos e descrições das páginas do mapa
  if (noMapa.has(caminho)) {
    const t = titulo[0] || '', d = descricao[0] || '';
    const proprio = caminho === '/' ? t : t.replace(/ \| Encanto Real$/, '');
    if (caminho === '/' && !/^Encanto Real — .+/.test(t)) falha(`/: o título do início é «Encanto Real — o que faz, onde» (${t})`);
    if (caminho !== '/' && !t.endsWith(' | Encanto Real')) falha(`${caminho}: título sem a marca`);
    if (proprio.length > 60) falha(`${caminho}: título com ${proprio.length} letras (máx. 60): ${proprio}`);
    if (d.length < 50 || d.length > 160) falha(`${caminho}: descrição com ${d.length} letras (50 a 160): ${d}`);
    titulos.set(t, [...(titulos.get(t) || []), caminho]);
    descricoes.set(d, [...(descricoes.get(d) || []), caminho]);
    const comPergunta = um(s, /href="([^"#]*\?[^"]*)"/g).filter((h) => !h.startsWith('/assets/') && !/\.(css|js)\?/.test(h));
    if (comPergunta.length) falha(`${caminho}: ligações com «?» (páginas repetidas para o Google): ${comPergunta.slice(0, 3).join(' ')}`);
  }
  // partilha
  const og = um(s, /<meta property="og:image" content="([^"]*)"/g)[0] || '';
  const ow = +um(s, /<meta property="og:image:width" content="(\d+)"/g)[0], oh = +um(s, /<meta property="og:image:height" content="(\d+)"/g)[0];
  const ficheiro = join(SITE, og.replace(URL0, ''));
  if (!og.startsWith(URL0 + '/')) falha(`${caminho}: og:image fora do site: ${og}`);
  else if (!existsSync(ficheiro)) falha(`${caminho}: og:image não existe: ${og}`);
  else {
    const m = medidas(ficheiro);
    if (!m || m.w !== ow || m.h !== oh) falha(`${caminho}: og:image diz ${ow}×${oh}, o ficheiro tem ${m ? `${m.w}×${m.h}` : '?'}`);
  }
  const comFotografia = /^\/loja\/[^/]+\/$/.test(caminho) || /^\/inspiracao\/[^/]+\/$/.test(caminho);
  if (comFotografia && !/\/media\/partilha\/.+\.jpg$/.test(og)) aviso(`${caminho}: partilha sem o JPEG 1200×630 (python3 scripts/partilha.py): ${og.replace(URL0, '')}`);
  if (!comFotografia && caminho !== '/loja/' && !/partilha\.jpg$|\/media\/partilha\//.test(og)) falha(`${caminho}: página geral sem o cartão com o logótipo: ${og}`);
  // JSON-LD
  const ld = um(s, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g).map((j) => { try { return JSON.parse(j); } catch (e) { falha(`${caminho}: JSON-LD que não se lê (${e.message})`); return null; } }).filter(Boolean);
  const nos = ld.flatMap((j) => j['@graph'] || [j]);
  const tipos = nos.map((x) => x['@type']);
  if (caminho === '/' && !(tipos.includes('WebSite') && tipos.includes('OnlineStore'))) falha('/: falta o WebSite ou a OnlineStore');
  if (/^\/propostas\//.test(caminho) && nos.length) falha(`${caminho}: uma proposta não repete os dados do início`);
  const peca = nos.find((x) => x['@type'] === 'Product');
  if (peca) {
    const preco = peca.offers?.price;
    if (preco == null) falha(`${caminho}: peça sem preço no Offer`);
    else if (!s.includes(euros(+preco))) falha(`${caminho}: o Offer diz ${preco} €, que a ficha não mostra (${euros(+preco)})`);
    if (!peca.image?.length) falha(`${caminho}: peça sem imagens`);
    for (const i of peca.image || []) if (!existsSync(join(SITE, i.replace(URL0, '')))) falha(`${caminho}: imagem do JSON-LD não existe: ${i}`);
    if (!tipos.includes('BreadcrumbList')) falha(`${caminho}: peça sem migalhas`);
  }
}
for (const [t, cs] of titulos) if (cs.length > 1) falha(`título repetido «${t}»: ${cs.join(' ')}`);
for (const [d, cs] of descricoes) if (cs.length > 1) falha(`descrição repetida «${d.slice(0, 50)}…»: ${cs.join(' ')}`);

// ── robots.txt e IndexNow ───────────────────────────────────────────────────
const robotsTxt = await readFile(join(SITE, 'robots.txt'), 'utf8');
if (!/^User-agent: \*\nAllow: \/\n/.test(robotsTxt)) falha('robots.txt tem de estar aberto (o noindex é que fecha a pré-visualização)');
if (!preVisualizacao && !robotsTxt.includes(`Sitemap: ${URL0}/sitemap.xml`)) falha('robots.txt sem o mapa do site');
if (!existsSync(join(SITE, `${INDEXNOW}.txt`)) || readFileSync(join(SITE, `${INDEXNOW}.txt`), 'utf8').trim() !== INDEXNOW) falha('a chave do IndexNow não está publicada');

console.log(`${n} páginas, ${entradas.length} no mapa: ${falhas} falhas, ${avisos} avisos (${preVisualizacao ? 'pré-visualização' : 'loja aberta'})`);
process.exitCode = falhas ? 1 : 0;
