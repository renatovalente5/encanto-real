// O carrinho: guardar, mudar e desenhar (gaveta e página /carrinho/). Os preços vêm sempre das regras.
import { guardado, guardar, BASE, catalogo, aviso, ouvir } from './estado.js';
import { calcular, euros, dataLonga, dataCurta, janelaAluguer, eDiaDeSemana, DESCONTO_SEMANA } from './regras.js';
import { escolherData } from './calendario.js';
import { srcDaPeca, extraDaImagem } from './imagens.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const chaveDe = (it) => [it.id, it.modo, it.cor, it.tamanho || '', it.digito ?? '', it.texto || ''].join('|');

export function itens() { return guardado('carrinho', []); }
export function festa() { return guardado('festa', null); }

export function juntar(item) {
  const lista = itens();
  const chave = chaveDe(item);
  const existente = lista.find((x) => chaveDe(x) === chave);
  if (existente) existente.qtd = Math.min(20, (existente.qtd || 1) + (item.qtd || 1));
  else lista.unshift({ ...item, qtd: item.qtd || 1 });
  guardar('carrinho', lista);
}

export function mudarQtd(chave, qtd) {
  const lista = itens();
  const it = lista.find((x) => chaveDe(x) === chave);
  if (!it) return;
  it.qtd = Math.max(1, Math.min(20, qtd));
  guardar('carrinho', lista);
}

export function tirar(chave) {
  const lista = itens();
  const i = lista.findIndex((x) => chaveDe(x) === chave);
  if (i < 0) return;
  const [tirado] = lista.splice(i, 1);
  guardar('carrinho', lista);
  aviso('Tirado do carrinho', { acao: 'Desfazer', fn: () => { const l = itens(); l.splice(i, 0, tirado); guardar('carrinho', l); } });
}

export async function resumo(extra = {}) {
  const cat = await catalogo();
  return calcular(itens(), { produtosPorId: cat.porId, entregas: cat.entregas, cupoes: cat.cupoes, festa: festa(), codigo: guardado('cupao', null), ...extra });
}

function descricaoOpcoes(p, it, cat) {
  const partes = [];
  if (p.combinacoes) partes.push(p.combinacoes.find((c) => c.id === it.cor)?.nome);
  else if (p.cores && it.cor && it.cor !== 'base') partes.push(cat.acabamentos[it.cor]?.nome);
  if (it.tamanho && p.tamanhos) partes.push(p.tamanhos.find((t) => t.id === it.tamanho)?.nome);
  if (it.digito != null && p.digitos) partes.push(`Número ${it.digito}`);
  if (it.texto) partes.push(`«${it.texto}»`);
  return partes.filter(Boolean).join(' · ');
}

function linhaHtml(l, cat, { compacta }) {
  const p = cat.porId[l.id];
  const chave = chaveDe(l);
  const img = srcDaPeca(p, l.cor, 480);
  const modo = l.modo === 'aluguer' ? 'Aluguer' : `Compra · pronto em ${p.venda?.prazo || 10} dias úteis`;
  return `<li class="linha" data-chave="${esc(chave)}">
    <a class="linha__imagem" href="${BASE}/loja/${p.id}/" style="--fundo:var(--azulejo-${p.fundo || 'areia'})"><img src="${img}"${extraDaImagem(p)} alt="" width="96" height="120" loading="lazy"></a>
    <div class="linha__corpo">
      <a class="linha__nome" href="${BASE}/loja/${p.id}/">${esc(p.nome)}</a>
      <p class="linha__opcoes">${esc(descricaoOpcoes(p, l, cat))}</p>
      <p class="linha__modo linha__modo--${l.modo}">${modo}</p>
      <div class="linha__fim">
        <div class="quantidade quantidade--pequena">
          <button type="button" data-qtd="-1" aria-label="Menos uma de ${esc(p.nome)}"${l.qtd <= 1 ? ' disabled' : ''}><svg class="icone"><use href="#i-menos"/></svg></button>
          <span aria-live="polite" aria-label="Quantidade">${l.qtd}</span>
          <button type="button" data-qtd="1" aria-label="Mais uma de ${esc(p.nome)}"><svg class="icone"><use href="#i-mais"/></svg></button>
        </div>
        <strong class="linha__preco">${euros(l.total)}</strong>
      </div>
    </div>
    <button type="button" class="linha__tirar" data-tirar aria-label="Tirar ${esc(p.nome)} do carrinho"><svg class="icone"><use href="#i-${compacta ? 'fechar' : 'lixo'}"/></svg></button>
  </li>`;
}

function blocoFesta(r) {
  if (!r.temAluguer) return '';
  const f = festa();
  if (!f) {
    return `<div class="carrinho__festa carrinho__festa--falta"><svg class="icone"><use href="#i-calendario"/></svg><div><strong>Falta a data da festa</strong><span>As peças alugadas reservam-se para um dia.</span></div><button type="button" class="botao botao--contorno botao--pequeno" data-mudar-data>Escolher</button></div>`;
  }
  const j = janelaAluguer(f);
  return `<div class="carrinho__festa"><svg class="icone"><use href="#i-calendario"/></svg><div><strong>Festa: ${dataLonga(f)}</strong><span>Levanta ${dataCurta(j.levantar)} · devolve ${dataCurta(j.devolver)}${eDiaDeSemana(f) ? ` · −${DESCONTO_SEMANA} % de dia de semana` : ''}</span></div><button type="button" class="ligacao-simples" data-mudar-data>Mudar</button></div>`;
}

export function totaisHtml(r, { comEntrega = false, entregaTexto } = {}) {
  const linhas = [`<div><dt>Subtotal</dt><dd>${euros(r.subtotal, { semCentimosRedondos: false })}</dd></div>`];
  if (r.desconto) linhas.push(`<div class="totais__desconto"><dt>${r.motivoDesconto === 'semana' ? `Festa em dia de semana (−${DESCONTO_SEMANA} %)` : `Cupão ${esc(r.cupao?.codigo)}`}</dt><dd>−${euros(r.desconto, { semCentimosRedondos: false })}</dd></div>`);
  if (comEntrega) linhas.push(`<div><dt>${entregaTexto || 'Entrega'}</dt><dd>${r.envio == null ? 'a combinar' : r.envio === 0 ? 'Grátis' : euros(r.envio, { semCentimosRedondos: false })}</dd></div>`);
  if (r.caucao) linhas.push(`<div><dt>Caução <small>(devolvida)</small></dt><dd>${euros(r.caucao, { semCentimosRedondos: false })}</dd></div>`);
  linhas.push(`<div class="totais__total"><dt>Total</dt><dd>${euros(r.total, { semCentimosRedondos: false })}</dd></div>`);
  return `<dl class="totais">${linhas.join('')}</dl>${comEntrega ? '' : '<p class="totais__nota">A entrega calcula-se no passo seguinte, pelo código postal. Levantar em Esposende é grátis.</p>'}`;
}

async function desenhar(el, { compacta }) {
  const cat = await catalogo();
  const r = await resumo();
  if (!r.linhas.length) {
    el.innerHTML = `<div class="carrinho__vazio"><svg class="icone icone--grande"><use href="#i-saco"/></svg><p><strong>O carrinho está vazio.</strong></p><p>Comece pela data da festa e veja o que está livre.</p><a class="botao botao--verde" href="${BASE}/loja/">Ir à loja</a></div>`;
    return;
  }
  el.innerHTML = `${blocoFesta(r)}
    <ul class="linhas">${r.linhas.map((l) => linhaHtml(l, cat, { compacta })).join('')}</ul>
    ${compacta ? '' : `<form class="cupao" data-cupao><label for="cupao">Código de desconto</label><div class="cupao__campo"><input class="campo" id="cupao" name="cupao" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(guardado('cupao', '') || '')}" placeholder="Ex.: BEMVINDO10"><button class="botao botao--contorno" type="submit">Aplicar</button></div>${r.erroCupao ? `<p class="cupao__erro" role="alert">${esc(r.erroCupao)}</p>` : r.cupao ? `<p class="cupao__certo">${esc(r.cupao.descricao)}.</p>` : ''}</form>`}
    <div class="carrinho__resumo">
      ${totaisHtml(r)}
      <a class="botao botao--verde botao--largo" href="${BASE}/finalizar/" data-finalizar>Finalizar encomenda</a>
      ${compacta ? `<a class="botao botao--contorno botao--largo" href="${BASE}/carrinho/">Ver o carrinho</a>` : '<p class="carrinho__seguro"><svg class="icone"><use href="#i-escudo"/></svg>Pagamento seguro com MB WAY, cartão ou Multibanco.</p>'}
    </div>`;
}

function ligar(el, compacta) {
  if (el.dataset.ligado) return;
  el.dataset.ligado = '1';
  el.addEventListener('click', async (e) => {
    const linha = e.target.closest('[data-chave]');
    if (e.target.closest('[data-tirar]') && linha) tirar(linha.dataset.chave);
    const q = e.target.closest('[data-qtd]');
    if (q && linha) {
      const it = itens().find((x) => chaveDe(x) === linha.dataset.chave);
      if (it) mudarQtd(linha.dataset.chave, (it.qtd || 1) + Number(q.dataset.qtd));
    }
    if (e.target.closest('[data-mudar-data]')) {
      const cat = await catalogo();
      const alugados = itens().filter((x) => x.modo === 'aluguer').map((x) => cat.porId[x.id]);
      const nova = await escolherData({ atual: festa(), produto: alugados.length === 1 ? alugados[0] : null });
      if (nova) guardar('festa', nova);
    }
  });
  el.addEventListener('submit', (e) => {
    if (!e.target.closest('[data-cupao]')) return;
    e.preventDefault();
    const v = e.target.querySelector('input').value.trim().toUpperCase();
    guardar('cupao', v || null);
  });
  ouvir((chave) => { if (['carrinho', 'festa', 'cupao'].includes(chave)) desenhar(el, { compacta }); });
}

export function desenharGaveta(el) {
  ligar(el, true);
  return desenhar(el, { compacta: true });
}

export function desenharPagina(el) {
  ligar(el, false);
  return desenhar(el, { compacta: false });
}

const pagina = document.querySelector('[data-carrinho-pagina]');
if (pagina) desenharPagina(pagina);
