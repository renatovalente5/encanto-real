// A página inicial. Três capas (as propostas A «Montra», B «Veludo», C «Palco»); o resto é comum.
import { grafo, ldSite, ldLoja } from '../lib/seo.mjs';
import { h, raw, attrs } from '../lib/html.mjs';
import { icone } from './icones.mjs';
import { u, cartao, imgProduto, imgCena, fundoDe, pagina } from './base.mjs';
import { euros } from '../scripts/regras.js';

const CONFIANCA = [
  ['calendario', 'Reserva pela data da festa'],
  ['camiao', 'Entrega e montagem no Norte'],
  ['escudo', 'MB WAY, cartão ou Multibanco'],
];

function confianca() {
  return h`<ul class="confianca">${CONFIANCA.map(([i, t]) => h`<li>${icone(i)}<span>${t}</span></li>`)}</ul>`;
}

// ------------------------------------------------------------------------------------------- capa A
// A referência que o Kelvin mandou (a capa «Most Wanted» da Catawiki): texto à esquerda, mosaico à direita,
// e diapositivos com o indicador em barras. Não avança sozinho: muda-se com as barras ou com a seta.
function capaMontra(ctx) {
  const P = ctx.dados.porId;
  const slides = [
    {
      sobre: 'Reservas de dezembro abertas',
      titulo: 'Cenários de festa que encantam',
      frase: 'Arcos, painéis, cilindros e figuras em MDF, feitos por nós. Alugue para o dia da festa ou compre para ficar.',
      botao: ['Explorar a loja', '/loja/'],
      mosaico: [
        { p: 'arco-triplo-real', cor: 'rosa', fundo: 'var(--azulejo-champanhe)' },
        { cena: 'palco-rosa', fundo: 'var(--azulejo-rosa)', alto: true },
        { p: 'coroa-real', fundo: 'var(--azulejo-verde)' },
        { marca: 'Novidades', linha: 'Cilindro vazado e trio de painéis' },
        { p: 'trio-cilindros', cor: 'branco', fundo: 'var(--azulejo-salvia)' },
      ],
    },
    {
      sobre: 'Baby shower e batizados',
      titulo: 'Nuvens, luas e estrelas para dar as boas-vindas',
      frase: 'Painéis em azul e branco, figuras douradas e um cenário que já vem a condizer.',
      botao: ['Ver o Cenário Nuvem', '/loja/cenario-nuvem/'],
      mosaico: [
        { p: 'nuvem', cor: 'azul', fundo: 'var(--azulejo-azul)' },
        { p: 'cenario-nuvem', fundo: 'var(--azulejo-champanhe)', alto: true },
        { p: 'lua-e-estrela', cor: 'dourado', fundo: 'var(--azulejo-verde)' },
        { marca: 'Para os mais pequenos', linha: 'Tudo em tons suaves' },
        { p: 'trio-paineis-romanos', cor: 'azul-branco-azul', fundo: 'var(--azulejo-azul)' },
      ],
    },
    {
      sobre: 'Casamentos e pedidos',
      titulo: 'O fundo das fotografias do grande dia',
      frase: 'Arco triplo em marfim, letras LOVE de um metro e o aparador para o bolo.',
      botao: ['Ver o Cenário Amor', '/loja/cenario-amor/'],
      mosaico: [
        { p: 'arco-triplo-real', cor: 'marfim', fundo: 'var(--azulejo-areia)' },
        { p: 'cenario-amor', fundo: 'var(--azulejo-champanhe)', alto: true },
        { p: 'letras-love', cor: 'marfim', fundo: 'var(--azulejo-verde)' },
        { marca: 'Casamentos', linha: 'Branco, marfim e dourado' },
        { p: 'aparador-arco', cor: 'branco', fundo: 'var(--azulejo-salvia)' },
      ],
    },
  ];
  const azulejo = (t, i, s) => {
    if (t.marca) {
      return h`<div class="mosaico__azulejo mosaico__azulejo--marca"><img src="${u(ctx, '/media/marca/coroa-champanhe.svg')}" width="98" height="109" alt="" loading="lazy"><strong>${t.marca}</strong><span>${t.linha}</span></div>`;
    }
    const classe = `mosaico__azulejo${t.alto ? ' mosaico__azulejo--alto' : ''}`;
    const prio = s === 0 && t.alto;
    if (t.cena) {
      return h`<div class="${classe}" style="--fundo:${raw(t.fundo)}">${imgCena(ctx, t.cena, 'retrato', { sizes: '(min-width: 1000px) 22vw, 45vw', prioridade: prio, alt: 'Cenário montado: arco triplo rosa, balões, cilindros e mesa de ripas' })}</div>`;
    }
    const prod = P[t.p];
    return h`<a class="${classe}" href="${u(ctx, `/loja/${prod.id}/`)}" style="--fundo:${raw(t.fundo)}" aria-label="${prod.nome}">${imgProduto(ctx, prod, { cor: t.cor || prod.cor, sizes: t.alto ? '(min-width: 1000px) 22vw, 45vw' : '(min-width: 1000px) 15vw, 30vw', prioridade: prio })}</a>`;
  };
  return h`<section class="capa capa--montra contentor" data-diapositivos aria-roledescription="carrossel" aria-label="Destaques">
  ${slides.map((s, i) => h`<div class="capa__diapositivo" data-diapositivo="${i}"${attrs({ hidden: i > 0, 'aria-roledescription': 'diapositivo', 'aria-label': `${i + 1} de ${slides.length}` })}>
    <div class="capa__texto">
      <p class="sobretitulo">${s.sobre}</p>
      ${i === 0 ? h`<h1 class="capa__titulo">${s.titulo}</h1>` : h`<h2 class="capa__titulo">${s.titulo}</h2>`}
      <p class="capa__frase">${s.frase}</p>
      <div class="capa__accoes">
        <a class="botao botao--contorno" href="${u(ctx, s.botao[1])}">${s.botao[0]}</a>
        <a class="ligacao-seta" href="${u(ctx, '/monta/')}">Monta o teu cenário ${icone('seta')}</a>
      </div>
      <div class="capa__controlos">
        <div class="barras" role="group" aria-label="Escolher o destaque">
          ${slides.map((x, j) => h`<button type="button" class="barras__barra" data-ir="${j}" aria-current="${j === i ? 'true' : 'false'}" aria-label="${x.sobre}"><span></span></button>`)}
        </div>
        <button type="button" class="botao-redondo" data-seguinte aria-label="Destaque seguinte">${icone('chevron')}</button>
      </div>
    </div>
    <div class="mosaico">${s.mosaico.map((t) => azulejo(t, i, i))}</div>
  </div>`)}
  ${confianca()}
</section>`;
}

// ------------------------------------------------------------------------------------------- capa B
// Verde da marca de ponta a ponta, com o cenário em 3D à direita: roda com o dedo e muda de cor ao vivo.
function capaVeludo(ctx) {
  // o branco abre o cenário e vem em primeiro (pedido do Renato, 18 nov 2026)
  const paletas = [
    ['branco', 'Branco', '#F3F1EC'], ['rosa', 'Rosa', '#E9BDBB'], ['salvia', 'Sálvia', '#A7B596'], ['lilas', 'Lilás', '#C9BADB'],
  ];
  return h`<section class="capa capa--veludo">
  <div class="capa__interior contentor">
    <div class="capa__texto">
      <p class="sobretitulo">Aluguer e venda · ${ctx.dados.site.regiao}</p>
      <h1 class="capa__titulo">A festa começa no cenário</h1>
      <p class="capa__frase">Arcos, painéis, cilindros e figuras em MDF, feitos por nós. Alugue para o dia da festa ou compre para ficar.</p>
      <div class="capa__accoes">
        <a class="botao botao--champanhe" href="${u(ctx, '/loja/')}">Ver a loja</a>
        <a class="botao botao--fantasma" href="${u(ctx, '/monta/')}">Monta o teu cenário</a>
      </div>
      ${confianca()}
    </div>
    <div class="capa__palco" data-palco-3d>
      <div class="visor3d" data-visor>
        ${imgCena(ctx, 'palco-branco', 'quadrado', { sizes: '(min-width: 1000px) 46vw, 92vw', prioridade: true, alt: 'Cenário montado: arco triplo branco, balões, cilindros e mesa de ripas', classe: 'visor3d__poster' })}
      </div>
      <div class="paletas" role="radiogroup" aria-label="Cor do cenário">
        ${paletas.map(([id, nome, hex], i) => h`<button type="button" class="paleta" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}" data-paleta="${id}" style="--amostra:${hex}"><span class="paleta__amostra"></span>${nome}</button>`)}
      </div>
      <p class="capa__dica">${icone('girar')} Arraste para rodar</p>
    </div>
  </div>
</section>`;
}

// ------------------------------------------------------------------------------------------- capa C
// Ao jeito de uma página de produto da Apple: título grande ao centro, dois caminhos, e o palco por baixo.
function capaPalco(ctx) {
  return h`<section class="capa capa--palco">
  <div class="contentor capa__texto">
    <p class="sobretitulo">Aluguer e venda de peças de festa</p>
    <h1 class="capa__titulo">Cenários que encantam.</h1>
    <p class="capa__frase">Feitos por nós em MDF. Alugue para o dia da festa ou compre para ficar.</p>
    <div class="capa__accoes">
      <a class="botao botao--verde" href="${u(ctx, '/loja/')}">Ver a loja</a>
      <a class="ligacao-seta" href="${u(ctx, '/monta/')}">Monta o teu cenário ${icone('seta')}</a>
    </div>
  </div>
  <div class="capa__palco contentor">
    <div class="capa__imagem">
      <picture>
        <source media="(max-width: 699px)" srcset="${u(ctx, '/media/cenas/palco-rosa-quadrado-600.webp')} 600w, ${u(ctx, '/media/cenas/palco-rosa-quadrado-1000.webp')} 1000w" sizes="92vw" width="1000" height="1000">
        ${imgCena(ctx, 'palco-rosa', 'largo', { sizes: '(min-width: 1400px) 1320px, 94vw', prioridade: true, alt: 'Cenário montado: arco triplo rosa, balões, cilindros e mesa de ripas' })}
      </picture>
    </div>
    ${confianca()}
  </div>
</section>`;
}

// ------------------------------------------------------------------------------------------- secções comuns
function fila(ctx, { id, titulo, frase, mais, produtos, classe = '' }) {
  return h`<section class="seccao ${classe}" aria-labelledby="${id}">
  <div class="contentor seccao__cabeca">
    <div>
      <h2 class="seccao__titulo" id="${id}">${titulo}</h2>
      ${frase ? h`<p class="seccao__frase">${frase}</p>` : ''}
    </div>
    ${mais ? h`<a class="ligacao-seta" href="${u(ctx, mais[1])}">${mais[0]} ${icone('seta')}</a>` : ''}
  </div>
  <div class="fila" data-fila>
    <div class="fila__lista">${produtos.map((p) => cartao(ctx, p, { sizes: '(min-width: 1100px) 22vw, (min-width: 700px) 30vw, 44vw' }))}</div>
    <button class="fila__seta fila__seta--esq botao-redondo" type="button" data-fila-anterior aria-label="Anteriores" hidden>${icone('chevronEsq')}</button>
    <button class="fila__seta fila__seta--dir botao-redondo" type="button" data-fila-seguinte aria-label="Seguintes" hidden>${icone('chevron')}</button>
  </div>
</section>`;
}

function categorias(ctx) {
  const { categorias, porId } = ctx.dados;
  return h`<section class="seccao" aria-labelledby="t-categorias">
  <div class="contentor seccao__cabeca"><h2 class="seccao__titulo" id="t-categorias">O que procura?</h2></div>
  <div class="fila fila--categorias" data-fila>
    <ul class="fila__lista categorias">
      ${categorias.map((c) => {
        const p = porId[c.capa];
        return h`<li><a class="categoria" href="${u(ctx, `/loja/${c.id}/`)}" style="--fundo:${raw(fundoDe({ fundo: c.fundo || p.fundo }))}">
          <span class="categoria__imagem">${imgProduto(ctx, p, { cor: c.capaCor || p.cor, sizes: '(min-width: 1100px) 22vw, 44vw', alt: '' })}</span>
          <span class="categoria__nome">${c.nome}</span>
        </a></li>`;
      })}
    </ul>
  </div>
</section>`;
}

function montaTeu(ctx) {
  return h`<section class="seccao" aria-labelledby="t-monta">
  <div class="contentor">
    <div class="monta-faixa">
      <div class="monta-faixa__texto">
        <p class="sobretitulo">Novo · em 3D</p>
        <h2 class="seccao__titulo" id="t-monta">Monta o teu cenário</h2>
        <p>Escolhe o arco, os cilindros e as figuras, troca as cores e vê tudo montado antes de reservar. O preço acompanha cada escolha.</p>
        <a class="botao botao--champanhe" href="${u(ctx, '/monta/')}">${icone('cubo')} Começar a montar</a>
      </div>
      <div class="monta-faixa__imagem">${imgCena(ctx, 'palco-salvia', 'quadrado', { sizes: '(min-width: 1000px) 40vw, 90vw', alt: 'Cenário em verde-sálvia: arco triplo, balões, cilindros e mesa de ripas' })}</div>
    </div>
  </div>
</section>`;
}

function ocasioes(ctx) {
  return h`<section class="seccao seccao--curta" aria-labelledby="t-ocasioes">
  <div class="contentor">
    <h2 class="seccao__titulo seccao__titulo--pequeno" id="t-ocasioes">Procurar pela festa</h2>
    <ul class="pilulas">
      ${ctx.dados.ocasioes.map((o) => h`<li><a class="pilula" href="${u(ctx, `/loja/#ocasiao=${o.id}`)}">${o.nome}</a></li>`)}
    </ul>
  </div>
</section>`;
}

// `proposta`: as três propostas da capa ficam em /propostas/a|b|c/, fora do Google (repetem o início).
export function paginaInicio(ctx, variante = 'a', { proposta = false } = {}) {
  const { produtos } = ctx.dados;
  const maisAlugados = produtos.filter((p) => p.destaque && p.categoria !== 'cenarios');
  const cenarios = produtos.filter((p) => p.categoria === 'cenarios');
  const capa = { a: capaMontra, b: capaVeludo, c: capaPalco }[variante](ctx);
  const corpo = h`${capa}
${fila(ctx, { id: 't-mais', titulo: 'Os mais pedidos', mais: ['Ver tudo', '/loja/'], produtos: maisAlugados })}
${categorias(ctx)}
${montaTeu(ctx)}
${fila(ctx, { id: 't-cenarios', titulo: 'Cenários completos', frase: 'Peças que já combinam, num só aluguer e mais em conta.', mais: ['Todos os cenários', '/loja/cenarios/'], produtos: cenarios })}
${ocasioes(ctx)}`;
  const { site, entregas } = ctx.dados;
  return pagina(ctx, {
    titulo: 'Encanto Real — Decoração de festas: aluguer e venda no Norte',
    descricao: site.descricao,
    caminho: proposta ? `/propostas/${variante}/` : '/',
    indexar: !proposta,
    corpo,
    classe: `inicio inicio--${variante}`,
    scripts: variante === 'b' ? ['capa-3d.js'] : [],
    esquema: proposta ? null : grafo(ldSite(site), ldLoja(site, entregas)),
  });
}
