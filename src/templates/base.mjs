// O esqueleto das páginas: <head>, cabeçalho, rodapé, gavetas e o cartão de produto.
import { h, raw, attrs, json, esc } from '../lib/html.mjs';
import { sprite, icone } from './icones.mjs';
import { euros, precoDesde, podeAlugar, podeComprar } from '../scripts/regras.js';
import { ACABAMENTOS } from '../3d/acabamentos.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { partilhaFicheiro } from '../lib/seo.mjs';

export const u = (ctx, caminho) => `${ctx.base}${caminho}`;
export const ano = () => new Date().getFullYear();

// ------------------------------------------------------------------------------------------- imagens
export function srcProduto(ctx, id, vista, cor, w) {
  return u(ctx, `/media/produtos/${id}/${vista}-${cor}-${w}.webp`);
}

export function imgProduto(ctx, prod, { vista = 'principal', cor = prod.cor, sizes = '(min-width: 1000px) 25vw, 50vw', prioridade = false, alt, classe } = {}) {
  const ws = [480, 800, 1200];
  const nomeCor = prod.combinacoes ? prod.combinacoes.find((c) => c.id === cor)?.nome : ACABAMENTOS[cor]?.nome;
  const texto = alt ?? (prod.categoria === 'cenarios' ? `${prod.nome}: ${prod.resumo}` : `${prod.nome}${nomeCor ? ', ' + nomeCor.toLowerCase() : ''}`);
  return h`<img${attrs({
    class: classe,
    src: srcProduto(ctx, prod.id, vista, cor, 800),
    srcset: ws.map((w) => `${srcProduto(ctx, prod.id, vista, cor, w)} ${w}w`).join(', '),
    sizes,
    width: 800,
    height: 1000,
    alt: texto,
    loading: prioridade ? 'eager' : 'lazy',
    fetchpriority: prioridade ? 'high' : null,
    decoding: 'async',
  })}>`;
}

export function imgCena(ctx, nome, formato, { sizes = '100vw', prioridade = false, alt = '', classe } = {}) {
  const ws = formato === 'largo' ? [800, 1600, 2400] : [600, 1000, 1600];
  const [w, hh] = { largo: [1600, 1000], quadrado: [1000, 1000], retrato: [1000, 1667], alto: [1000, 1250] }[formato];
  return h`<img${attrs({
    class: classe,
    src: u(ctx, `/media/cenas/${nome}-${formato}-${ws[1]}.webp`),
    srcset: ws.map((x) => `${u(ctx, `/media/cenas/${nome}-${formato}-${x}.webp`)} ${x}w`).join(', '),
    sizes, width: w, height: hh, alt,
    loading: prioridade ? 'eager' : 'lazy', fetchpriority: prioridade ? 'high' : null, decoding: 'async',
  })}>`;
}

// ------------------------------------------------------------------------------------------- cartão
const FUNDOS = { rosa: 'var(--azulejo-rosa)', salvia: 'var(--azulejo-salvia)', lilas: 'var(--azulejo-lilas)', azul: 'var(--azulejo-azul)', champanhe: 'var(--azulejo-champanhe)', areia: 'var(--azulejo-areia)', verde: 'var(--azulejo-verde)' };
export const fundoDe = (prod) => FUNDOS[prod.fundo] || FUNDOS.areia;

// A imagem de partilha de uma página com fotografia (a peça, a capa da categoria, a capa do artigo): o JPEG 1200×630
// feito pelo scripts/partilha.py; enquanto não existir, a fotografia WebP 1200×1500 (o testar.mjs avisa).
export function ogDaFotografia(ctx, { produto, cor, fundo, cena, alt }) {
  const jpg = partilhaFicheiro({ produto, cor, fundo, cena });
  if (existsSync(join(ctx.raiz, jpg))) return { imagem: `${ctx.siteUrl}${ctx.base}${jpg}`, largura: 1200, altura: 630, alt };
  if (cena) return { imagem: `${ctx.siteUrl}${ctx.base}/media/cenas/${cena}-largo-1600.webp`, largura: 1600, altura: 900, alt };
  return { imagem: `${ctx.siteUrl}${ctx.base}/media/produtos/${produto}/principal-${cor}-1200.webp`, largura: 1200, altura: 1500, alt };
}

export function linhaInfo(prod) {
  if (prod.categoria === 'cenarios') return `${prod.componentes?.length || 0} peças a condizer`;
  const partes = [];
  if (podeAlugar(prod) && podeComprar(prod)) partes.push(`Compra ${euros(precoDesde(prod, 'compra'))}`);
  else if (!podeAlugar(prod)) partes.push(prod.personalizavel ? 'Personalizado · só venda' : 'Só venda');
  const n = prod.combinacoes?.length || prod.cores?.length || 0;
  if (n > 1) partes.push(`${n} ${prod.combinacoes ? 'combinações' : 'cores'}`);
  if (prod.tamanhos?.length > 1) partes.push(`${prod.tamanhos.length} tamanhos`);
  return partes.join(' · ');
}

export function cartao(ctx, prod, { prioridade = false, sizes, titulo = 'h3' } = {}) {
  const alugar = podeAlugar(prod);
  const preco = alugar ? precoDesde(prod, 'aluguer') : precoDesde(prod, 'compra');
  const desde = (prod.tamanhos?.length > 1) ? 'desde ' : '';
  const url = u(ctx, `/loja/${prod.id}/`);
  const selo = prod.selo;
  return h`<article class="cartao" data-produto="${prod.id}" data-categoria="${prod.categoria}" data-ocasioes="${(prod.ocasioes || []).join(' ')}" data-aluguer="${alugar ? precoDesde(prod, 'aluguer') : ''}" data-compra="${podeComprar(prod) ? precoDesde(prod, 'compra') : ''}">
  <div class="cartao__imagem" style="--fundo:${raw(fundoDe(prod))}">
    ${imgProduto(ctx, prod, { prioridade, sizes })}
    ${selo ? h`<span class="cartao__selo">${selo}</span>` : ''}
    <span class="cartao__preco">${desde ? h`<small>${desde}</small>` : ''}<strong>${euros(preco)}</strong>${alugar ? h`<small>/evento</small>` : ''}</span>
    <button class="cartao__favorito" type="button" data-favorito="${prod.id}" aria-pressed="false" aria-label="Guardar ${prod.nome} nos favoritos">${icone('coracao')}</button>
    <span class="cartao__aviso" data-disponibilidade hidden></span>
  </div>
  ${raw(`<${titulo} class="cartao__nome">`)}<a href="${url}">${prod.nome}</a>${raw(`</${titulo}>`)}
  <p class="cartao__info">${linhaInfo(prod)}</p>
</article>`;
}

// ------------------------------------------------------------------------------------------- cabeçalho
const NAV = [
  { href: '/loja/', nome: 'Loja', id: 'loja' },
  { href: '/loja/cenarios/', nome: 'Cenários', id: 'cenarios' },
  { href: '/monta/', nome: 'Monta o teu', id: 'monta' },
  { href: '/inspiracao/', nome: 'Inspiração', id: 'inspiracao' },
];

export function cabecalho(ctx, { atual } = {}) {
  return h`<header class="topo" data-topo>
  <div class="topo__barra contentor">
    <button class="topo__botao topo__menu" type="button" data-abrir="menu" aria-label="Abrir o menu" aria-haspopup="dialog">${icone('menu')}</button>
    <a class="topo__marca" href="${u(ctx, '/')}" aria-label="Encanto Real — página inicial">
      <picture>
        <source media="(max-width: 600px)" srcset="${u(ctx, '/media/marca/logotipo-compacto-champanhe.svg')}" width="398" height="149">
        <img src="${u(ctx, '/media/marca/logotipo-horizontal-champanhe.svg')}" width="597" height="109" alt="Encanto Real">
      </picture>
    </a>
    <nav class="topo__nav" aria-label="Principal">
      ${NAV.map((n) => h`<a href="${u(ctx, n.href)}"${attrs({ 'aria-current': atual === n.id ? 'page' : null })}>${n.nome}</a>`)}
    </nav>
    <form class="topo__procura" role="search" action="${u(ctx, '/loja/')}" data-procura>
      <label class="so-leitor" for="procura-topo">Procurar na loja</label>
      ${icone('procurar')}
      <input id="procura-topo" type="search" name="q" placeholder="Procurar arcos, cilindros, números…" autocomplete="off" enterkeyhint="search" spellcheck="false">
      <div class="procura__resultados" data-resultados hidden></div>
    </form>
    <div class="topo__accoes">
      <button class="topo__botao topo__lupa" type="button" data-abrir="procura" aria-label="Procurar">${icone('procurar')}</button>
      <a class="topo__botao topo__favoritos" href="${u(ctx, '/favoritos/')}" aria-label="Favoritos">${icone('coracao')}<span class="contador" data-contador="favoritos" hidden></span></a>
      <div class="conta-menu" data-conta-menu>
        <a class="topo__botao" href="${u(ctx, '/conta/')}" aria-label="A minha conta" data-conta-botao>${icone('pessoa')}</a>
      </div>
      <button class="topo__botao topo__carrinho" type="button" data-abrir="carrinho" aria-label="Carrinho" aria-haspopup="dialog">${icone('saco')}<span class="contador" data-contador="carrinho" hidden></span></button>
    </div>
  </div>
</header>`;
}

// ------------------------------------------------------------------------------------------- rodapé
export function rodape(ctx) {
  const { categorias, site } = ctx.dados;
  const redes = [
    site.instagram && { nome: 'Instagram', href: site.instagram, icone: 'instagram' },
    site.facebook && { nome: 'Facebook', href: site.facebook, icone: 'facebook' },
    site.whatsapp && { nome: 'WhatsApp', href: `https://wa.me/${site.whatsapp}`, icone: 'whatsapp' },
  ].filter(Boolean);
  return h`<footer class="rodape">
  <div class="rodape__corpo contentor">
    <div class="rodape__marca">
      <img src="${u(ctx, '/media/marca/logotipo-champanhe.svg')}" width="261" height="176" alt="Encanto Real — Decoração de Festas" loading="lazy">
      <p>Peças de festa feitas por nós, para alugar no dia da festa ou comprar para ficar.</p>
      ${redes.length ? h`<ul class="rodape__redes">${redes.map((r) => h`<li><a href="${r.href}" rel="noopener" aria-label="${r.nome}">${icone(r.icone)}</a></li>`)}</ul>` : ''}
    </div>
    <nav class="rodape__coluna" aria-labelledby="rod-loja">
      <h2 id="rod-loja">A loja</h2>
      <ul>
        ${categorias.map((c) => h`<li><a href="${u(ctx, `/loja/${c.id}/`)}">${c.nome}</a></li>`)}
        <li><a href="${u(ctx, '/monta/')}">Monta o teu cenário</a></li>
      </ul>
    </nav>
    <nav class="rodape__coluna" aria-labelledby="rod-ajuda">
      <h2 id="rod-ajuda">Ajuda</h2>
      <ul>
        <li><a href="${u(ctx, '/ajuda/como-alugar/')}">Como funciona o aluguer</a></li>
        <li><a href="${u(ctx, '/ajuda/entregas/')}">Entregas e montagem</a></li>
        <li><a href="${u(ctx, '/ajuda/perguntas/')}">Perguntas frequentes</a></li>
        <li><a href="${u(ctx, '/sobre/')}">A Encanto Real</a></li>
        <li><a href="${u(ctx, '/contactos/')}">Contactos</a></li>
      </ul>
    </nav>
    <div class="rodape__coluna rodape__encomendas">
      <h2>Encomendas</h2>
      <ul>
        <li>${icone('calendario', 'icone icone--circulo')}<span>Aluguer para o dia da festa</span></li>
        <li>${icone('camiao', 'icone icone--circulo')}<span>Entrega e montagem no Norte</span></li>
        <li>${icone('casa', 'icone icone--circulo')}<span>Levantamento em ${site.localidade}</span></li>
        <li>${icone('escudo', 'icone icone--circulo')}<span>MB WAY, cartão e Multibanco</span></li>
      </ul>
    </div>
  </div>
  <div class="rodape__legal contentor">
    <p>© ${ano()} Encanto Real</p>
    <ul>
      <li><a href="${u(ctx, '/termos/')}">Termos e condições</a></li>
      <li><a href="${u(ctx, '/privacidade/')}">Privacidade</a></li>
      <li><a href="${u(ctx, '/ajuda/litigios/')}">Resolução de litígios</a></li>
      <li><a class="lr-discreto" href="https://www.livroreclamacoes.pt/inicio" rel="noopener">${icone('livro')}Livro de Reclamações</a></li>
    </ul>
  </div>
</footer>`;
}

// ------------------------------------------------------------------------------------------- gavetas
export function gavetas(ctx) {
  const { categorias } = ctx.dados;
  return h`<dialog class="gaveta gaveta--menu" data-gaveta="menu" aria-label="Menu">
  <div class="gaveta__topo"><img src="${u(ctx, '/media/marca/logotipo-horizontal-champanhe.svg')}" width="597" height="109" alt="Encanto Real" class="gaveta__marca"><button class="topo__botao" type="button" data-fechar aria-label="Fechar o menu">${icone('fechar')}</button></div>
  <nav class="gaveta__corpo menu-movel" aria-label="Menu">
    <ul class="menu-movel__principal">
      <li><a href="${u(ctx, '/loja/')}">Toda a loja</a></li>
      ${categorias.map((c) => h`<li><a href="${u(ctx, `/loja/${c.id}/`)}">${c.nome}</a></li>`)}
      <li><a href="${u(ctx, '/monta/')}">Monta o teu cenário</a></li>
      <li><a href="${u(ctx, '/inspiracao/')}">Inspiração</a></li>
    </ul>
    <ul class="menu-movel__ajuda">
      <li><a href="${u(ctx, '/conta/')}">${icone('pessoa')}A minha conta</a></li>
      <li><a href="${u(ctx, '/favoritos/')}">${icone('coracao')}Favoritos</a></li>
      <li><a href="${u(ctx, '/ajuda/como-alugar/')}">${icone('info')}Como funciona o aluguer</a></li>
      <li><a href="${u(ctx, '/contactos/')}">${icone('email')}Contactos</a></li>
    </ul>
  </nav>
</dialog>
<dialog class="gaveta gaveta--carrinho" data-gaveta="carrinho" aria-labelledby="carrinho-titulo">
  <div class="gaveta__topo"><h2 id="carrinho-titulo">Carrinho</h2><button class="topo__botao" type="button" data-fechar aria-label="Fechar o carrinho">${icone('fechar')}</button></div>
  <div class="gaveta__corpo" data-carrinho-gaveta><p class="carrinho__vazio">A carregar…</p></div>
</dialog>
<dialog class="folha-procura" data-gaveta="procura" aria-label="Procurar">
  <form class="folha-procura__campo" role="search" action="${u(ctx, '/loja/')}" data-procura>
    ${icone('procurar')}
    <label class="so-leitor" for="procura-folha">Procurar na loja</label>
    <input id="procura-folha" type="search" name="q" placeholder="Procurar peças…" autocomplete="off" enterkeyhint="search" spellcheck="false">
    <button class="topo__botao" type="button" data-fechar aria-label="Fechar a procura">${icone('fechar')}</button>
    <div class="procura__resultados" data-resultados hidden></div>
  </form>
</dialog>
<div class="aviso-flutuante" role="status" aria-live="polite" data-aviso hidden></div>`;
}

// ------------------------------------------------------------------------------------------- página
export function pagina(ctx, { titulo, descricao, caminho, corpo, atual, classe = '', og, indexar = true, cabecaExtra = '', scripts = [], esquema }) {
  const { site } = ctx.dados;
  const tituloCompleto = caminho === '/' ? titulo : `${titulo} | Encanto Real`;
  const url = `${ctx.siteUrl}${ctx.base}${caminho}`;
  const ogImg = og?.imagem || `${ctx.siteUrl}${ctx.base}/media/marca/encanto-real-decoracao-de-festas-partilha.jpg`;
  // Fora do Google: tudo na pré-visualização; com a loja aberta, as legais e as de utilidade (noindex, mas as ligações
  // contam). As do Google deixam mostrar a imagem grande nos resultados.
  const robots = ctx.preVisualizacao ? 'noindex, nofollow' : indexar ? 'max-image-preview:large' : 'noindex, follow';
  ctx.paginas?.set(caminho, { indexar }); // para o mapa do site (as que ficam no Google com a loja aberta)
  return `<!doctype html>
<html lang="pt-PT" data-base="${esc(ctx.base)}" data-v="${ctx.versao}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto; } }</style>
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descricao || site.descricao)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${og?.tipo || 'website'}">
<meta property="og:site_name" content="Encanto Real">
<meta property="og:locale" content="pt_PT">
<meta property="og:title" content="${esc(og?.titulo || tituloCompleto)}">
<meta property="og:description" content="${esc(descricao || site.descricao)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:image:width" content="${og?.largura || 1200}">
<meta property="og:image:height" content="${og?.altura || 630}">
<meta property="og:image:alt" content="${esc(og?.alt || 'Encanto Real, decoração de festas')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#54603C">
<link rel="icon" href="${u(ctx, '/media/marca/favicon.svg')}" type="image/svg+xml">
<link rel="icon" href="${u(ctx, '/media/marca/favicon-48.png')}" sizes="48x48" type="image/png">
<link rel="icon" href="${u(ctx, '/media/marca/favicon-32.png')}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${u(ctx, '/media/marca/apple-touch-icon.png')}">
<link rel="preload" href="${u(ctx, '/media/fontes/raleway-400-700-normal.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${u(ctx, `/assets/site.css?v=${ctx.versao}`)}">
${ctx.temaCss ? `<link rel="stylesheet" href="${u(ctx, ctx.temaCss)}?v=${ctx.versao}">` : ''}
${cabecaExtra}
${esquema ? `<script type="application/ld+json">${json(esquema)}</script>` : ''}
<script type="importmap">{"imports":{"three":"${u(ctx, '/assets/3d/three.module.min.js')}","three/addons/":"${u(ctx, '/assets/3d/addons/')}"}}</script>
<script type="module" src="${u(ctx, `/assets/js/app.js?v=${ctx.versao}`)}"></script>
${scripts.map((s) => `<script type="module" src="${u(ctx, `/assets/js/${s}?v=${ctx.versao}`)}"></script>`).join('\n')}
</head>
<body class="${esc(classe)}">
<a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
${sprite()}
${cabecalho(ctx, { atual })}
<main id="conteudo" tabindex="-1">
${corpo}
</main>
${rodape(ctx)}
${gavetas(ctx)}
</body>
</html>
`;
}
