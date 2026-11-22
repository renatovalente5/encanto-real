// O QUE O GOOGLE LÊ: os títulos e as descrições das categorias e das peças, os dados estruturados (JSON-LD), as
// imagens de partilha, as páginas que ficam fora do Google e as datas do mapa do site.
//
// Regras (o Renato, 13 nov 2026, «para fazeres sempre»):
// - as páginas legais e de políticas ficam com noindex e fora do mapa (os termos, a privacidade, os litígios e as
//   entregas, que são a política de envios); as de utilidade (carrinho, conta, finalizar…) também;
// - o início, a loja, as categorias, as peças, o «Monta o teu cenário», a inspiração, o «Como funciona o aluguer», as
//   perguntas, o Sobre e os Contactos ficam no Google;
// - o título do início é «Marca — o que faz, onde».
// O scripts/testar.mjs confere tudo isto no _site construído.
import { execFileSync } from 'node:child_process';
import { euros, precoDesde, podeAlugar, podeComprar } from '../scripts/regras.js';

/* A chave do IndexNow (22 nov 2026): avisa o Bing e quem partilha a rede (Yandex, Seznam, Naver) das páginas que
   mudaram. É pública por desenho: o build escreve-a em /<chave>.txt, e é assim que se prova quem manda no domínio.
   Só se usa com a loja aberta (scripts/indexnow.mjs, depois de publicar). */
export const INDEXNOW = '98061cc844139c446f78177301427649';

/* Os títulos para o Google das categorias (sem « | Encanto Real», que a página junta; até 50 letras). O que as
   pessoas escrevem: «aluguer arco festa», «arco para festas», «cilindros para festas», «letras gigantes festa».
   Uma categoria que não esteja aqui (uma nova, do painel) leva «Nome para alugar ou comprar». */
export const CATEGORIAS = {
  'arcos-e-paineis': 'Arcos e painéis para festas: aluguer e venda',
  'cilindros-e-mesas': 'Cilindros e mesas para festas: aluguer e venda',
  'figuras-e-letras': 'Figuras, letras e números em MDF para festas',
  personalizados: 'Personalizados em MDF com o nome do bebé',
  cenarios: 'Cenários de festa completos: aluguer e venda',
};

/* Os títulos das peças que o nome não diz bem. As outras: «Nome para alugar ou comprar», «Nome para alugar» ou, nas
   que só se vendem e levam o nome de quem compra, «Nome com nome» («Quadro do Primeiro Ano com nome»: é o que se
   procura, e não depende do género da peça). */
const PECAS = {
  'nome-personalizado': 'Nome em MDF personalizado para festas',
};

export function resumir(texto, max = 160) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  return corte.slice(0, corte.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…';
}
const comPonto = (s) => { const t = String(s ?? '').trim(); return t && !/[.!?…]$/.test(t) ? t + '.' : t; };

/** O preço de uma peça pode subir com as escolhas (tamanhos com preços diferentes, letras a mais)? Só então «desde». */
export function variaPreco(prod, modo) {
  const campo = modo === 'aluguer' ? 'aluguer' : 'venda';
  const precos = (prod.tamanhos || []).map((t) => t[campo]).filter((x) => x != null);
  if (new Set(precos).size > 1) return true;
  return modo === 'compra' && !!(prod.personalizavel && prod.venda?.porLetra);
}

export function tituloDaCategoria(cat, produtosDela = []) {
  if (CATEGORIAS[cat.id]) return CATEGORIAS[cat.id];
  const aluga = produtosDela.some(podeAlugar);
  const vende = produtosDela.some(podeComprar);
  return `${cat.nome}${aluga ? ` para alugar${vende ? ' ou comprar' : ''}` : ''}`;
}

export function descricaoDaCategoria(cat, produtosDela = []) {
  const aluga = produtosDela.some(podeAlugar);
  const fim = aluga ? 'Aluguer para o dia da festa ou compra, com entrega e montagem no Norte.' : 'Feitos por encomenda em Esposende, com envio para todo o país.';
  return resumir(`${comPonto(cat.frase)} ${fim}`);
}

export function tituloDaPeca(prod) {
  if (PECAS[prod.id]) return PECAS[prod.id];
  const aluga = podeAlugar(prod), vende = podeComprar(prod);
  if (aluga) return `${prod.nome} para alugar${vende ? ' ou comprar' : ''}`;
  if (prod.personalizavel && !/nome|personaliz/i.test(prod.nome)) return `${prod.nome} com nome`;
  return prod.nome;
}

/* A descrição de uma peça: o resumo, o preço e como se recebe. Para o Google (`max` 160) entram as frases que cabem
   inteiras, por esta ordem; sem limite (o JSON-LD), todas. */
export function descricaoDaPeca(prod, max = 160) {
  const aluga = podeAlugar(prod), vende = podeComprar(prod);
  const pa = precoDesde(prod, 'aluguer'), pv = precoDesde(prod, 'compra');
  const partes = [];
  if (aluga) partes.push(`Aluguer desde ${euros(pa)} por evento${vende ? `; compra ${variaPreco(prod, 'compra') ? 'desde ' : ''}${euros(pv)}` : ''}.`, 'Entrega e montagem no Norte.');
  else if (vende) partes.push(`${variaPreco(prod, 'compra') ? 'Desde ' : ''}${euros(pv)}, feito por encomenda em ${prod.venda.prazo} dias úteis.`, 'Envio para todo o país.');
  let texto = resumir(comPonto(prod.resumo), max);
  for (const parte of partes) if (`${texto} ${parte}`.length <= max) texto = `${texto} ${parte}`;
  return texto;
}

// ── Imagens de partilha (og:image) ──────────────────────────────────────────
/* A ficha de cada peça, cada categoria e cada artigo partilham a fotografia deles; o início e as páginas gerais, o
   cartão com o logótipo. A imagem sai da MESMA escolha que faz a capa da página (a cor da peça, a capa e a cor da
   categoria, a capa do artigo), num JPEG 1200×630 no fundo da página. O scripts/partilha.py faz os JPEG a partir
   desta lista (scripts/lista-partilhas.mjs); sem o JPEG, a página partilha a fotografia WebP e o testar.mjs avisa. */
export const partilhaFicheiro = ({ produto, cor, fundo, cena }) => (cena ? `/media/partilha/cena-${cena}.jpg` : `/media/partilha/${produto}-${cor}-${fundo || 'areia'}.jpg`);

export function partilhasPrecisas(dados) {
  const { produtos, categorias, artigos, porId } = dados;
  const tresD = (id) => porId[id] && porId[id]._tresD !== false;
  const lista = [
    ...produtos.filter((p) => tresD(p.id)).map((p) => ({ produto: p.id, cor: p.cor, fundo: p.fundo })),
    ...categorias.filter((c) => tresD(c.capa)).map((c) => ({ produto: c.capa, cor: c.capaCor || porId[c.capa].cor, fundo: c.fundo })),
    ...artigos.filter((a) => a.capa?.produto && tresD(a.capa.produto)).map((a) => ({ produto: a.capa.produto, cor: a.capa.cor || porId[a.capa.produto].cor, fundo: porId[a.capa.produto].fundo })),
    ...artigos.filter((a) => a.capa?.cena).map((a) => ({ cena: a.capa.cena })),
  ];
  const vistos = new Set();
  return lista.filter((x) => { const k = partilhaFicheiro(x); if (vistos.has(k)) return false; vistos.add(k); return true; });
}

// ── Dados estruturados (schema.org) ─────────────────────────────────────────
const id = (site, marca) => `${site.url}/#${marca}`;
const so = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** O site: o nome que o Google mostra por cima dos resultados (só no início). */
export const ldSite = (site) => ({
  '@type': 'WebSite', '@id': id(site, 'site'), name: site.nome,
  // a forma colada, como se escreve no domínio (o Google aprende o nome do site por aqui)
  alternateName: site.nome.replace(/\s+/g, ''), url: `${site.url}/`, inLanguage: 'pt-PT', publisher: { '@id': id(site, 'loja') },
});

/* As devoluções das compras: 14 dias de livre resolução (DL 24/2014). Quem paga os portes da devolução não vai aqui:
   os termos não o dizem. As peças personalizadas não têm livre resolução (art. 17.º, n.º 1, c)): política própria
   no Offer. O aluguer não é uma compra: não leva política de devolução. */
const devolucoes = (site) => ({
  '@type': 'MerchantReturnPolicy', applicableCountry: 'PT', returnPolicyCountry: 'PT',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 14,
  returnMethod: 'https://schema.org/ReturnByMail', merchantReturnLink: `${site.url}/termos/`,
});
const semDevolucao = (site) => ({
  '@type': 'MerchantReturnPolicy', applicableCountry: 'PT', returnPolicyCountry: 'PT',
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted', merchantReturnLink: `${site.url}/termos/`,
});

/** A loja. Os dados da empresa e os contactos só entram quando estão escritos (para abrir a loja são obrigatórios). */
export function ldLoja(site, entregas) {
  const e = site.empresa || {};
  const nif = so(e.nif)?.replace(/\s/g, '');
  const redes = [site.instagram, site.facebook].map(so).filter(Boolean);
  const zonas = (entregas?.zonas || []).flatMap((z) => String(z.descricao || '').split(',')).map((s) => s.trim()).filter(Boolean);
  return {
    '@type': 'OnlineStore', '@id': id(site, 'loja'), name: site.nome, url: `${site.url}/`, description: site.descricao,
    logo: `${site.url}/media/marca/icone-512.png`, image: `${site.url}/media/marca/encanto-real-decoracao-de-festas-partilha.jpg`,
    address: { '@type': 'PostalAddress', ...(so(e.morada) ? { streetAddress: so(e.morada) } : {}), ...(so(e.codigoPostal) ? { postalCode: so(e.codigoPostal) } : {}), addressLocality: so(e.localidade) || site.localidade, addressCountry: 'PT' },
    areaServed: zonas.length ? zonas.map((name) => ({ '@type': 'City', name })) : site.regiao,
    ...(redes.length ? { sameAs: redes } : {}),
    ...(so(e.nome) ? { legalName: so(e.nome) } : {}),
    ...(nif ? { vatID: 'PT' + nif } : {}),
    ...(so(site.email) ? { email: so(site.email) } : {}),
    ...(so(site.telefone) ? { telephone: so(site.telefone) } : {}),
    hasMerchantReturnPolicy: devolucoes(site),
  };
}

/** As migalhas: [[nome, caminho], …], do início à página. */
export const ldMigalhas = (site, itens) => ({
  '@type': 'BreadcrumbList',
  itemListElement: itens.map(([name, caminho], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${site.url}${caminho}` })),
});

/* Uma peça. O Offer é o da COMPRA (o que o Google Shopping entende): o preço mais baixo que se pode pagar, o mesmo que
   a ficha mostra quando abre. O aluguer fica no título e na descrição; um segundo Offer com o preço do aluguer
   apareceria no Google como o preço da peça. Imagens: as vistas que a ficha mostra (WebP, que o Google lê).
   Uma peça só de aluguer (o que o painel cria por omissão) não tem Product: sem um preço de compra, o Google só via um
   Product incompleto (um erro na Search Console) ou um preço que não se pode pagar. A ficha fica com as migalhas. */
export function ldPeca(site, entregas, prod, cat, imagens) {
  const url = `${site.url}/loja/${prod.id}/`;
  const pv = precoDesde(prod, 'compra');
  if (pv == null) return null;
  const envio = entregas?.envioCompra;
  const portes = typeof envio?.preco === 'number' && pv != null ? (typeof envio.gratisAcima === 'number' && pv >= envio.gratisAcima ? 0 : envio.preco) : null;
  return {
    '@type': 'Product', '@id': `${url}#peca`, name: prod.nome, description: descricaoDaPeca(prod, Infinity), sku: prod.id,
    brand: { '@type': 'Brand', name: site.nome }, ...(cat ? { category: cat.nome } : {}), ...(prod.material ? { material: prod.material } : {}),
    image: imagens.map((i) => `${site.url}${i}`),
    ...(prod.medidas ? { width: { '@type': 'QuantitativeValue', value: prod.medidas.l, unitCode: 'CMT' }, height: { '@type': 'QuantitativeValue', value: prod.medidas.a, unitCode: 'CMT' }, ...(prod.medidas.p ? { depth: { '@type': 'QuantitativeValue', value: prod.medidas.p, unitCode: 'CMT' } } : {}) } : {}),
    ...(pv != null ? {
      offers: {
        '@type': 'Offer', url, price: pv.toFixed(2), priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', seller: { '@id': id(site, 'loja') },
        ...(portes != null ? { shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: portes.toFixed(2), currency: 'EUR' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PT' } } } : {}),
        ...(prod.personalizavel ? { hasMerchantReturnPolicy: semDevolucao(site) } : {}),
      },
    } : {}),
  };
}

/** Um artigo da Inspiração. */
export const ldArtigo = (site, a, imagem, modificado) => ({
  '@type': 'Article', '@id': `${site.url}/inspiracao/${a.id}/#artigo`, headline: a.titulo, description: a.resumo,
  image: imagem, datePublished: a.data, ...(modificado ? { dateModified: modificado } : {}), inLanguage: 'pt-PT',
  mainEntityOfPage: `${site.url}/inspiracao/${a.id}/`,
  author: { '@type': 'Organization', name: site.nome, url: `${site.url}/` }, publisher: { '@id': id(site, 'loja') },
});

/** Um grafo JSON-LD com vários nós. */
export const grafo = (...nos) => ({ '@context': 'https://schema.org', '@graph': nos.filter(Boolean) });

// ── As datas do mapa do site ────────────────────────────────────────────────
/* O <lastmod> sai do git (a data e a hora do último commit que mexeu nos ficheiros de que a página é feita, mais os
   que entram em todas), nunca do relógio do build. No CI é preciso o histórico todo (fetch-depth: 0): numa clonagem
   rasa todas as páginas saíam com a mesma data, sem aviso. Sem git (um zip), não há datas. */
export function dataGit(raiz, caminhos) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', '--', ...caminhos], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch { return null; }
}
export function historicoRaso(raiz) {
  try { return execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'true'; } catch { return false; }
}

/* Os ficheiros de que cada página é feita (para a data dela no mapa). COMUNS entram em todas: o cabeçalho, o rodapé,
   o menu com as categorias, os preços (regras.js) e o <head>. Os relacionados de uma ficha (outras peças) ficam de
   fora: mudam pouco a página, e com eles todas as fichas mudavam a cada peça. */
const COMUNS = ['src/templates/base.mjs', 'src/templates/icones.mjs', 'src/lib/html.mjs', 'src/lib/seo.mjs', 'src/scripts/regras.js', 'content/site.json', 'content/categorias.json'];
export function fontesDaPagina(caminho, dados) {
  const loja = caminho.match(/^\/loja\/([^/]+)\/$/)?.[1];
  const artigo = caminho.match(/^\/inspiracao\/([^/]+)\/$/)?.[1];
  let proprias;
  if (caminho === '/') proprias = ['src/templates/inicio.mjs', 'content/produtos', 'content/ocasioes.json', 'media/cenas'];
  else if (caminho === '/loja/' || (loja && dados.categorias.some((c) => c.id === loja))) proprias = ['src/templates/loja.mjs', 'content/produtos', 'content/ocasioes.json'];
  else if (loja) proprias = ['src/templates/loja.mjs', `content/produtos/${loja}.json`, `media/produtos/${loja}`];
  else if (caminho === '/monta/') proprias = ['src/templates/monta.mjs', 'content/produtos'];
  else if (caminho === '/inspiracao/') proprias = ['src/templates/conteudo.mjs', 'content/inspiracao'];
  else if (artigo) proprias = ['src/templates/conteudo.mjs', `content/inspiracao/${artigo}.json`];
  else proprias = ['src/templates/conteudo.mjs', 'content/entregas.json'];
  return [...proprias, ...COMUNS];
}

export function mapaDoSite(site, entradas) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entradas.map(({ caminho, data }) => `  <url><loc>${site.url}${caminho}</loc>${data ? `<lastmod>${data}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}
