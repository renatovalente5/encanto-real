// A loja (todas as peças e cada categoria) e a ficha de cada peça.
import { h, raw, attrs, json } from '../lib/html.mjs';
import { icone } from './icones.mjs';
import { u, cartao, imgProduto, srcProduto, srcFoto, fundoDe, pagina, linhaInfo, ogDaFotografia } from './base.mjs';
import { grafo, ldMigalhas, ldPeca, tituloDaCategoria, descricaoDaCategoria, tituloDaPeca, descricaoDaPeca } from '../lib/seo.mjs';
import { euros, precoDesde, precoUnitario, podeAlugar, podeComprar } from '../scripts/regras.js';
import { ACABAMENTOS } from '../3d/acabamentos.js';
import { opcoesDeCor } from '../lib/dados.mjs';
import { entradaCatalogo } from '../lib/catalogo.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// ------------------------------------------------------------------------------------------- a loja
function barraDaLoja(ctx, { categoria }) {
  const { categorias, ocasioes } = ctx.dados;
  const cores = ['branco', 'marfim', 'rosa', 'lilas', 'azul', 'salvia', 'verde', 'dourado', 'madeira'];
  return h`<div class="loja__barra" data-loja-barra>
  <nav class="separadores" aria-label="Categorias" data-separadores>
    <ul>
      <li><a class="pilula" href="${u(ctx, '/loja/')}"${attrs({ 'aria-current': !categoria ? 'page' : null })}>Tudo</a></li>
      ${categorias.map((c) => h`<li><a class="pilula" href="${u(ctx, `/loja/${c.id}/`)}"${attrs({ 'aria-current': categoria?.id === c.id ? 'page' : null })}>${c.nome}</a></li>`)}
    </ul>
  </nav>
  <div class="festa-barra">
    <div class="festa-barra__data">
      <button type="button" class="campo-data" data-abrir-calendario="loja" aria-haspopup="dialog">
        ${icone('calendario')}<span><small>Data da festa</small><strong data-data-texto>Escolher</strong></span>
      </button>
      <label class="interruptor" data-so-livres hidden><input type="checkbox" checked data-filtro-livres><span>Só o que está livre</span></label>
    </div>
    <div class="modos modos--compacto" role="radiogroup" aria-label="Ver preços de">
      <label class="modo"><input type="radio" name="modo-loja" value="aluguer" checked><span>Alugar</span></label>
      <label class="modo"><input type="radio" name="modo-loja" value="compra"><span>Comprar</span></label>
    </div>
    <button type="button" class="botao-filtros" data-abrir-filtros aria-expanded="false" aria-controls="filtros">${icone('menu')}Filtros<span class="contador contador--escuro" data-n-filtros hidden></span></button>
  </div>
  <div class="filtros" id="filtros" data-filtros hidden>
    <fieldset class="filtros__grupo">
      <legend>Festa</legend>
      <div class="pilulas pilulas--pequenas">
        ${ocasioes.map((o) => h`<button type="button" class="pilula" data-ocasiao="${o.id}" aria-pressed="false">${o.nome}</button>`)}
      </div>
    </fieldset>
    <fieldset class="filtros__grupo">
      <legend>Cor</legend>
      <div class="amostras amostras--filtro">
        ${cores.map((c) => h`<button type="button" class="amostra" data-cor-filtro="${c}" aria-pressed="false" title="${ACABAMENTOS[c].nome}" style="--amostra:${ACABAMENTOS[c].hex}"><span class="so-leitor">${ACABAMENTOS[c].nome}</span></button>`)}
      </div>
    </fieldset>
    <div class="filtros__grupo filtros__ordem">
      <label for="ordenar">Ordenar</label>
      <select id="ordenar" data-ordenar>
        <option value="pedidos">Mais pedidos</option>
        <option value="preco-asc">Preço: mais baixo</option>
        <option value="preco-desc">Preço: mais alto</option>
        <option value="nome">Nome</option>
      </select>
    </div>
    <button type="button" class="ligacao-simples" data-limpar-filtros>Limpar filtros</button>
  </div>
</div>`;
}

function paginaLoja(ctx, categoria = null) {
  const { produtos } = ctx.dados;
  const lista = categoria ? produtos.filter((p) => p.categoria === categoria.id) : produtos;
  const titulo = categoria ? categoria.nome : 'Loja';
  const frase = categoria ? categoria.frase : 'Escolha a data da festa e veja o que está livre. Tudo se aluga para o dia ou se compra para ficar.';
  const corpo = h`<div class="loja contentor" data-loja data-categoria="${categoria?.id || ''}">
  <header class="pagina__cabeca">
    <h1 class="pagina__titulo">${titulo}</h1>
    <p class="pagina__frase">${frase}</p>
  </header>
  ${barraDaLoja(ctx, { categoria })}
  <p class="loja__contagem" aria-live="polite" data-contagem>${lista.length} ${lista.length === 1 ? 'peça' : 'peças'}</p>
  <div class="grelha-produtos" data-grelha>
    ${lista.map((p, i) => cartao(ctx, p, { prioridade: i < 4, sizes: '(min-width: 1200px) 300px, (min-width: 700px) 30vw, 46vw', titulo: 'h2' }))}
  </div>
  <div class="loja__vazia" data-vazia hidden>
    <p><strong>Nada com estes filtros.</strong></p>
    <p>Experimente outra data ou tire um filtro.</p>
    <button type="button" class="botao botao--contorno" data-limpar-filtros>Limpar filtros</button>
  </div>
</div>
<script>
// separadores que são páginas: repor o sítio da barra antes da primeira pintura (não voltar ao topo)
(function () { try {
  var l = JSON.parse(sessionStorage.getItem('er:lugar-loja') || 'null');
  if (!l || l.para !== location.pathname || Date.now() - l.t > 15000) return;
  document.documentElement.dataset.lugarDaLoja = '1';
  var repor = function () { var b = document.querySelector('[data-loja-barra]'); if (!b) return; var st = document.documentElement.style.scrollBehavior; document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, b.getBoundingClientRect().top + scrollY - l.topo); document.documentElement.style.scrollBehavior = st; var s = document.querySelector('[data-separadores] ul'); if (s) s.scrollLeft = l.esq; };
  repor(); var parar = false; ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (e) { addEventListener(e, function () { parar = true; }, { once: true, passive: true }); });
  var de = function () { if (!parar) repor(); }; document.addEventListener('DOMContentLoaded', de); addEventListener('load', de); if (document.fonts) document.fonts.ready.then(de);
} catch (e) {} })();
</script>`;
  const { site, porId } = ctx.dados;
  const capa = categoria && porId[categoria.capa];
  return pagina(ctx, {
    titulo: categoria ? tituloDaCategoria(categoria, lista) : 'Loja: aluguer e venda de decoração de festas',
    descricao: categoria ? descricaoDaCategoria(categoria, lista) : 'Arcos, painéis, cilindros, mesas e figuras em MDF para alugar ou comprar. Escolha a data da festa e veja o que está livre.',
    caminho: categoria ? `/loja/${categoria.id}/` : '/loja/',
    corpo,
    atual: categoria?.id === 'cenarios' ? 'cenarios' : 'loja',
    classe: 'pagina-loja',
    scripts: ['loja.js'],
    // a categoria partilha a fotografia da capa dela (a mesma do cartão da categoria no início)
    og: capa ? ogDaFotografia(ctx, { produto: capa.id, cor: categoria.capaCor || capa.cor, fundo: categoria.fundo, alt: categoria.nome }) : undefined,
    esquema: grafo(ldMigalhas(site, [['Início', '/'], ['Loja', '/loja/'], ...(categoria ? [[categoria.nome, `/loja/${categoria.id}/`]] : [])])),
  });
}

// ------------------------------------------------------------------------------------------- a ficha
function opcoesHtml(ctx, prod) {
  const out = [];
  const cores = opcoesDeCor(prod, ACABAMENTOS);
  if (cores.length > 1) {
    const atual = cores.find((c) => c.id === prod.cor) || cores[0];
    out.push(h`<fieldset class="opcao">
      <legend>${prod.combinacoes ? 'Combinação' : (prod.rotuloCor || 'Cor')}: <strong data-nome-cor>${atual.nome}</strong></legend>
      <div class="amostras">
        ${cores.map((c) => h`<label class="amostra-opcao" title="${c.nome}">
          <input type="radio" name="cor" value="${c.id}"${attrs({ checked: c.id === atual.id })} data-nome="${c.nome}">
          <span class="amostra amostra--grande" style="--amostra:${c.amostras[0]}${c.amostras.length > 1 ? raw(`;--amostra2:${c.amostras[1]};--amostra3:${c.amostras[2] || c.amostras[1]}`) : ''}"${attrs({ 'data-tripla': c.amostras.length > 1 ? '' : null })}></span>
          <span class="so-leitor">${c.nome}</span>
        </label>`)}
      </div>
    </fieldset>`);
  }
  if (prod.tamanhos?.length > 1) {
    out.push(h`<fieldset class="opcao">
      <legend>Tamanho</legend>
      <div class="pilulas pilulas--opcao">
        ${prod.tamanhos.map((t, i) => h`<label class="pilula-opcao"><input type="radio" name="tamanho" value="${t.id}"${attrs({ checked: i === 0 })}><span>${t.nome}</span></label>`)}
      </div>
    </fieldset>`);
  }
  if (prod.digitos) {
    out.push(h`<fieldset class="opcao">
      <legend>Número: <strong data-nome-digito>1</strong></legend>
      <div class="pilulas pilulas--digitos">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => h`<label class="pilula-opcao pilula-opcao--digito"><input type="radio" name="digito" value="${d}"${attrs({ checked: d === 1 })}><span>${d}</span></label>`)}
      </div>
    </fieldset>`);
  }
  if (prod.personalizavel) {
    out.push(h`<div class="opcao">
      <label class="opcao__rotulo" for="texto-nome">O nome <span class="opcao__nota">(até ${prod.personalizavel.maxLetras} letras${prod.venda.porLetra ? `; ${prod.venda.letrasIncluidas} incluídas, depois ${euros(prod.venda.porLetra)} cada` : ''})</span></label>
      <input class="campo" id="texto-nome" name="texto" type="text" maxlength="${prod.personalizavel.maxLetras}" value="${prod.personalizavel.exemplo}" autocomplete="off" autocapitalize="words" spellcheck="false" data-texto required>
      <p class="opcao__ajuda">Veja-o em 3D antes de encomendar. Um nome feito à medida não tem devolução.</p>
    </div>`);
  }
  return out;
}

function compraHtml(ctx, prod) {
  const alugar = podeAlugar(prod);
  const comprar = podeComprar(prod);
  const pa = alugar ? precoUnitario(prod, 'aluguer', { tamanho: prod.tamanhos?.[0]?.id }) : null;
  const pv = comprar ? precoUnitario(prod, 'compra', { tamanho: prod.tamanhos?.[0]?.id, texto: prod.personalizavel?.exemplo }) : null;
  const { entregas } = ctx.dados;
  const primeiraZona = Math.min(...entregas.zonas.map((z) => z.preco));
  return h`<form class="compra" data-compra novalidate>
  ${alugar && comprar ? h`<div class="modos" role="radiogroup" aria-label="Alugar ou comprar">
    <label class="modo"><input type="radio" name="modo" value="aluguer" checked><span class="modo__nome">Alugar</span><span class="modo__preco"><strong data-preco="aluguer">${euros(pa)}</strong> <small>por evento</small></span></label>
    <label class="modo"><input type="radio" name="modo" value="compra"><span class="modo__nome">Comprar</span><span class="modo__preco"><strong data-preco="compra">${euros(pv)}</strong> <small>fica para si</small></span></label>
  </div>` : h`<input type="hidden" name="modo" value="${alugar ? 'aluguer' : 'compra'}">
  <p class="compra__preco-unico"><strong data-preco="${alugar ? 'aluguer' : 'compra'}">${euros(alugar ? pa : pv)}</strong> <small data-nota-preco>${alugar ? 'por evento' : prod.personalizavel && prod.venda.porLetra ? `com ${prod.personalizavel.exemplo.length} letras` : ''}</small></p>`}
  ${opcoesHtml(ctx, prod)}
  ${alugar ? h`<div class="data-festa" data-so-modo="aluguer">
    <span class="opcao__rotulo" id="rot-data">Data da festa</span>
    <button type="button" class="campo-data campo-data--grande" data-abrir-calendario="produto" aria-haspopup="dialog" aria-describedby="rot-data">
      ${icone('calendario')}<span><strong data-data-texto>Escolher a data</strong><small data-janela>Levanta na véspera e devolve no dia a seguir</small></span>${icone('chevronBaixo')}
    </button>
    <p class="disponibilidade" data-disponibilidade aria-live="polite"></p>
  </div>` : ''}
  ${comprar ? h`<p class="prazo" data-so-modo="compra"${attrs({ hidden: alugar })}>${icone('relogio')}<span>Feito por nós em ${prod.venda.prazo} dias úteis. <span data-chega-a-tempo></span></span></p>` : ''}
  <div class="compra__fim">
    <div class="quantidade" data-quantidade>
      <button type="button" data-menos aria-label="Menos uma">${icone('menos')}</button>
      <label class="so-leitor" for="qtd">Quantidade</label>
      <input id="qtd" name="qtd" type="number" inputmode="numeric" min="1" max="${alugar ? prod.aluguer.stock : 20}" value="1">
      <button type="button" data-mais aria-label="Mais uma">${icone('mais')}</button>
    </div>
    <button class="botao botao--verde botao--largo" type="submit" data-botao-juntar>${alugar ? 'Reservar' : 'Juntar ao carrinho'}</button>
  </div>
  <p class="compra__erro" data-erro role="alert" hidden></p>
  <ul class="ficha__linhas">
    <li>${icone('camiao')}<span>Levantamento grátis em ${ctx.dados.site.localidade}, ou entrega desde ${euros(primeiraZona)}. <a href="${u(ctx, '/ajuda/entregas/')}">Zonas e preços</a></span></li>
    ${alugar ? h`<li data-so-modo="aluguer">${icone('escudo')}<span>Caução de ${euros(prod.aluguer.caucao)}, devolvida depois da recolha. <a href="${u(ctx, '/ajuda/como-alugar/')}">Como funciona</a></span></li>` : ''}
    ${alugar && comprar ? h`<li data-so-modo="aluguer">${icone('etiqueta')}<span>Gostou? Se a comprar até 30 dias depois, desconta o aluguer.</span></li>` : ''}
    ${comprar && !prod.personalizavel ? h`<li data-so-modo="compra"${attrs({ hidden: alugar })}>${icone('girar')}<span>Tem 14 dias para desistir da compra. Garantia de 3 anos.</span></li>` : ''}
  </ul>
</form>`;
}

function detalhesHtml(ctx, prod) {
  const m = prod.medidas;
  const linhas = [
    m && ['Medidas', m.p ? `${m.l} × ${m.a} × ${m.p} cm (largura × altura × profundidade)` : `${m.l} × ${m.a} cm (largura × altura)`],
    prod.conteudo && ['Inclui', prod.conteudo.join(' · ')],
    ['Material', prod.material],
    prod.transporte && ['Transporte', prod.transporte],
    prod.montagem && ['Montagem', prod.montagem],
  ].filter(Boolean);
  return h`<dl class="detalhes">${linhas.map(([k, v]) => h`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>`;
}

function regrasAluguerHtml(ctx) {
  return h`<aside class="regras" aria-labelledby="t-regras">
  <h2 id="t-regras" class="regras__titulo">O aluguer em cinco linhas</h2>
  <ul>
    <li>${icone('calendario')}<span><strong>Período:</strong> levanta (ou entregamos) na véspera e devolve no dia a seguir à festa.</span></li>
    <li>${icone('escudo')}<span><strong>Caução:</strong> paga com a reserva e devolvida até 2 dias úteis depois da recolha.</span></li>
    <li>${icone('check')}<span><strong>Limpeza:</strong> não precisa de lavar. Só pedimos as peças sem fita-cola nem pregos.</span></li>
    <li>${icone('info')}<span><strong>Danos:</strong> riscos de uso não se pagam; uma peça partida desconta-se da caução.</span></li>
    <li>${icone('girar')}<span><strong>Desistir:</strong> devolvemos tudo até 30 dias antes, metade até 7 dias, e uma troca de data é grátis.</span></li>
  </ul>
  <a class="ligacao-seta" href="${u(ctx, '/ajuda/como-alugar/')}">Todas as regras ${icone('seta')}</a>
</aside>`;
}

function paginaProduto(ctx, prod) {
  const { categorias, porId, produtos, site } = ctx.dados;
  const cat = categorias.find((c) => c.id === prod.categoria);
  const alugar = podeAlugar(prod);
  // as vistas da galeria; uma peça pode tirar uma («vistas»: { escala: false }) ou dar-lhe outro nome
  // numa peça sem 3D, só as fotografias (que se juntam no painel); numa com 3D, as fotografias vêm depois das vistas
  const vistas = prod._tresD ? ['principal', 'frente', 'lado', 'escala'].filter((v) => prod.vistas?.[v] !== false).map((v) => [v, prod.cor]) : [];
  const fotos = prod._fotos || [];
  const miniaturas = vistas.length + fotos.length + (prod._tresD ? 1 : 0);
  const rotuloVista = (v) => prod.vistas?.[v]?.rotulo || { principal: 'Vista principal', frente: 'De frente', lado: 'De lado', escala: 'Ao lado de uma pessoa de 1,70 m' }[v];
  const relacionados = (prod.categoria === 'cenarios'
    ? produtos.filter((p) => p.categoria === 'cenarios' && p.id !== prod.id)
    : [...produtos.filter((p) => p.categoria !== prod.categoria && p.categoria !== 'cenarios' && (p.ocasioes || []).some((o) => (prod.ocasioes || []).includes(o))), ...produtos.filter((p) => p.categoria === 'cenarios' && p.componentes?.some((c) => c.id === prod.id))]
  ).slice(0, 8);
  const dadosFicha = entradaCatalogo(prod, { nomeCat: { [cat.id]: cat.nome } });
  const corpo = h`<div class="ficha contentor" data-ficha data-id="${prod.id}">
  <nav class="migalhas" aria-label="Está aqui">
    <ol>
      <li><a href="${u(ctx, '/loja/')}">Loja</a></li>
      <li><a href="${u(ctx, `/loja/${cat.id}/`)}">${cat.nome}</a></li>
      <li aria-current="page">${prod.nome}</li>
    </ol>
  </nav>
  <div class="ficha__grelha">
    <div class="ficha__galeria">
      <div class="galeria${prod.fundo === 'verde' ? ' galeria--escura' : ''}" style="--fundo:${raw(fundoDe(prod))}">
        <div class="galeria__principal" data-galeria>
          ${imgProduto(ctx, prod, { prioridade: true, sizes: '(min-width: 1000px) 54vw, 100vw', classe: 'galeria__imagem' })}
          ${prod._tresD ? h`<div class="visor3d visor3d--ficha" data-visor hidden></div>
          <button type="button" class="galeria__3d" data-ver-3d>${icone('cubo')}<span>Ver em 3D</span></button>
          <p class="galeria__dica" data-dica-3d hidden>${icone('girar')} Arraste para rodar</p>` : ''}
        </div>
        ${miniaturas > 1 ? h`<ul class="galeria__miniaturas" aria-label="Fotografias">
          ${vistas.map(([v, c], i) => h`<li><button type="button" data-vista="${v}" aria-pressed="${i === 0 ? 'true' : 'false'}" aria-label="${rotuloVista(v)}"><img src="${srcProduto(ctx, prod.id, v, c, 480)}" alt="" loading="lazy" width="480" height="${v === 'escala' ? 384 : 600}"></button></li>`)}
          ${fotos.map((f, i) => h`<li><button type="button" data-vista="foto" data-foto="${f.nome}" data-src="${srcFoto(ctx, f, 800)}" data-srcset="${[480, 800, 1200].map((w) => `${srcFoto(ctx, f, w)} ${w}w`).join(', ')}" data-foco="${f.foco}" data-alt="${f.alt}" aria-pressed="${!vistas.length && i === 0 ? 'true' : 'false'}" aria-label="Fotografia: ${f.alt}"><img class="img-foto" src="${srcFoto(ctx, f, 480)}" alt="" loading="lazy" width="480" height="600" style="object-position:${f.foco}"></button></li>`)}
          ${prod._tresD ? h`<li><button type="button" data-vista="3d" aria-pressed="false" aria-label="Ver em 3D" class="miniatura-3d">${icone('cubo')}<span>3D</span></button></li>` : ''}
        </ul>` : ''}
      </div>
    </div>
    <div class="ficha__compra">
      <p class="ficha__etiqueta">${cat.nome}${prod.selo ? h` · <span>${prod.selo}</span>` : ''}</p>
      <h1 class="ficha__titulo">${prod.nome}</h1>
      <p class="ficha__resumo">${prod.resumo}</p>
      ${compraHtml(ctx, prod)}
      <div class="ficha__accoes">
        <button type="button" class="ligacao-simples" data-favorito="${prod.id}" aria-pressed="false">${icone('coracao')}<span>Guardar</span></button>
        <button type="button" class="ligacao-simples" data-partilhar>${icone('partilhar')}<span>Partilhar</span></button>
      </div>
    </div>
  </div>

  ${prod.componentes ? h`<section class="ficha__seccao" aria-labelledby="t-inclui">
    <h2 class="seccao__titulo seccao__titulo--pequeno" id="t-inclui">Neste cenário</h2>
    ${prod.poupanca ? h`<p class="seccao__frase">Separadas, as peças custavam ${euros(prod.aluguer.preco + prod.poupanca)} no aluguer. Juntas, poupa ${euros(prod.poupanca)}.</p>` : ''}
    <ul class="componentes">
      ${prod.componentes.map((c) => {
        const p = porId[c.id];
        if (!p) return '';
        const nomeCor = p.combinacoes ? p.combinacoes.find((x) => x.id === c.cor)?.nome : ACABAMENTOS[c.cor]?.nome;
        const tam = c.tamanho ? p.tamanhos?.find((t) => t.id === c.tamanho)?.nome : null;
        const dentro = h`<span class="componente__imagem" style="--fundo:${raw(fundoDe(p))}">${imgProduto(ctx, p, { cor: c.cor, sizes: '120px', alt: '' })}</span><span><strong>${p.nome}</strong><small>${[nomeCor, tam].filter(Boolean).join(' · ')}</small></span>`;
        // uma peça que saiu do site continua no cenário, mas sem ligação (a página dela não existe)
        return p._noSite === false ? h`<li><span class="componente">${dentro}</span></li>` : h`<li><a class="componente" href="${u(ctx, `/loja/${p.id}/`)}">${dentro}${icone('chevron')}</a></li>`;
      })}
    </ul>
  </section>` : ''}

  <section class="ficha__seccao ficha__duas" aria-labelledby="t-detalhes">
    <div>
      <h2 class="seccao__titulo seccao__titulo--pequeno" id="t-detalhes">Medidas e detalhes</h2>
      ${detalhesHtml(ctx, prod)}
    </div>
    ${alugar ? regrasAluguerHtml(ctx) : ''}
  </section>

  ${relacionados.length ? h`<section class="ficha__seccao" aria-labelledby="t-completa">
    <div class="seccao__cabeca"><h2 class="seccao__titulo seccao__titulo--pequeno" id="t-completa">${prod.categoria === 'cenarios' ? 'Outros cenários' : 'Completa o cenário'}</h2></div>
    <div class="fila fila--ficha" data-fila><div class="fila__lista">${relacionados.map((p) => cartao(ctx, p, { sizes: '(min-width: 1100px) 22vw, 44vw' }))}</div>
    <button class="fila__seta fila__seta--esq botao-redondo" type="button" data-fila-anterior aria-label="Anteriores" hidden>${icone('chevronEsq')}</button>
    <button class="fila__seta fila__seta--dir botao-redondo" type="button" data-fila-seguinte aria-label="Seguintes" hidden>${icone('chevron')}</button></div>
  </section>` : ''}
  <section class="ficha__seccao" aria-labelledby="t-vistos" data-vistos hidden>
    <div class="seccao__cabeca"><h2 class="seccao__titulo seccao__titulo--pequeno" id="t-vistos">Vistos há pouco</h2></div>
    <div class="fila fila--ficha"><div class="fila__lista" data-vistos-lista></div></div>
  </section>
</div>
<div class="barra-compra" data-barra-compra hidden>
  <div class="barra-compra__texto"><strong>${prod.nome}</strong><span data-barra-preco></span></div>
  <button type="button" class="botao botao--verde" data-barra-botao>${alugar ? 'Reservar' : 'Juntar'}</button>
</div>
<script type="application/json" id="dados-ficha">${json(dadosFicha)}</script>`;
  return pagina(ctx, {
    titulo: tituloDaPeca(prod),
    descricao: descricaoDaPeca(prod),
    caminho: `/loja/${prod.id}/`,
    corpo,
    atual: prod.categoria === 'cenarios' ? 'cenarios' : 'loja',
    classe: 'pagina-ficha',
    scripts: ['produto.js'],
    og: { ...ogDaFotografia(ctx, { produto: prod.id, cor: prod.cor, fundo: prod.fundo, alt: prod.nome }), tipo: 'product' },
    esquema: grafo(
      ldPeca(site, ctx.dados.entregas, prod, cat, [
        ...vistas.map(([v, c]) => `/media/produtos/${prod.id}/${v}-${c}-1200.webp`).filter((f) => existsSync(join(ctx.raiz, f))),
        ...fotos.map((f) => `/assets/fotos/${f.ficheiros['1200']}`),
      ]),
      ldMigalhas(site, [['Início', '/'], ['Loja', '/loja/'], [cat.nome, `/loja/${cat.id}/`], [prod.nome, `/loja/${prod.id}/`]]),
    ),
  });
}

export function gerarLoja(ctx) {
  const out = [['/loja/', paginaLoja(ctx)]];
  for (const c of ctx.dados.categorias) out.push([`/loja/${c.id}/`, paginaLoja(ctx, c)]);
  for (const p of ctx.dados.produtos) out.push([`/loja/${p.id}/`, paginaProduto(ctx, p)]);
  return out;
}
