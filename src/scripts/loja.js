// A loja: data da festa (o que está livre), alugar/comprar, festa, cor, ordem, procura, e os separadores que
// mudam de página sem voltar ao topo. O estado dos filtros vai no fragmento (#ocasiao=…), nunca em ?parâmetros.
import { guardado, guardar, BASE, catalogo, ouvir } from './estado.js';
import { euros, disponiveis, dataCurta, eDiaDeSemana, DESCONTO_SEMANA } from './regras.js';
import { escolherData } from './calendario.js';

const loja = document.querySelector('[data-loja]');
const grelha = loja?.querySelector('[data-grelha]');
const cartoes = grelha ? [...grelha.querySelectorAll('.cartao')] : [];
const ordemOriginal = new Map(cartoes.map((c, i) => [c, i]));
const filtros = { ocasiao: null, cores: new Set(), ordem: 'pedidos', livres: true, q: new URLSearchParams(location.search).get('q') || '' };
const normalizar = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function lerFragmento() {
  const p = new URLSearchParams(location.hash.slice(1));
  filtros.ocasiao = p.get('ocasiao');
  filtros.cores = new Set((p.get('cor') || '').split(',').filter(Boolean));
  filtros.ordem = p.get('ordem') || 'pedidos';
}
function escreverFragmento() {
  const p = new URLSearchParams();
  if (filtros.ocasiao) p.set('ocasiao', filtros.ocasiao);
  if (filtros.cores.size) p.set('cor', [...filtros.cores].join(','));
  if (filtros.ordem !== 'pedidos') p.set('ordem', filtros.ordem);
  const h = p.toString();
  history.replaceState(null, '', location.pathname + location.search + (h ? '#' + h : ''));
}

async function aplicar() {
  if (!loja) return;
  const cat = await catalogo();
  const modo = guardado('modo', 'aluguer');
  const festa = guardado('festa', null);
  loja.querySelectorAll('input[name="modo-loja"]').forEach((r) => { r.checked = r.value === modo; });
  // data da festa
  const txt = loja.querySelector('[data-data-texto]');
  txt.textContent = festa ? `${dataCurta(festa)}${eDiaDeSemana(festa) ? ` · −${DESCONTO_SEMANA} %` : ''}` : 'Escolher';
  const zonaLivres = loja.querySelector('[data-so-livres]');
  zonaLivres.hidden = !festa || modo !== 'aluguer';
  filtros.livres = zonaLivres.querySelector('input').checked;

  let visiveis = 0;
  const q = normalizar(filtros.q);
  for (const c of cartoes) {
    const p = cat.porId[c.dataset.produto];
    if (!p) continue;
    // preço do modo
    const preco = c.querySelector('.cartao__preco');
    const valor = modo === 'compra' ? (c.dataset.compra || c.dataset.aluguer) : (c.dataset.aluguer || c.dataset.compra);
    const eAluguer = modo === 'aluguer' ? !!c.dataset.aluguer : !c.dataset.compra;
    preco.innerHTML = `${p.tamanhos?.length > 1 ? '<small>desde </small>' : ''}<strong>${euros(Number(valor))}</strong>${eAluguer ? '<small>/evento</small>' : ''}`;
    // disponibilidade
    const av = c.querySelector('[data-disponibilidade]');
    let livre = true;
    if (festa && modo === 'aluguer' && p.aluguer) {
      const n = disponiveis(p, festa);
      livre = n > 0;
      av.hidden = false;
      av.textContent = livre ? (n === 1 ? 'Última' : 'Livre') : 'Esgotado';
      av.className = `cartao__aviso${livre ? '' : ' cartao__aviso--esgotado'}`;
    } else av.hidden = true;
    // filtros
    let ok = true;
    if (filtros.ocasiao && !(p.ocasioes || []).includes(filtros.ocasiao)) ok = false;
    if (filtros.cores.size) {
      const cores = new Set([...(p.cores || []), ...((p.combinacoes || []).flatMap((x) => x.cores || []))]);
      if (![...filtros.cores].some((x) => cores.has(x))) ok = false;
    }
    if (q && !normalizar(`${p.nome} ${p.resumo} ${p.categoriaNome} ${(p.ocasioesNomes || []).join(' ')}`).includes(q)) ok = false;
    if (festa && modo === 'aluguer' && filtros.livres && !livre) ok = false;
    c.hidden = !ok;
    if (ok) visiveis++;
  }
  // ordem
  const precoDe = (c) => Number((guardado('modo', 'aluguer') === 'compra' ? c.dataset.compra || c.dataset.aluguer : c.dataset.aluguer || c.dataset.compra) || 0);
  const ord = [...cartoes].sort((a, b) => {
    if (filtros.ordem === 'preco-asc') return precoDe(a) - precoDe(b);
    if (filtros.ordem === 'preco-desc') return precoDe(b) - precoDe(a);
    if (filtros.ordem === 'nome') return a.querySelector('.cartao__nome').textContent.localeCompare(b.querySelector('.cartao__nome').textContent, 'pt');
    return ordemOriginal.get(a) - ordemOriginal.get(b);
  });
  ord.forEach((c) => grelha.append(c));
  // contagem e estado dos botões
  loja.querySelector('[data-contagem]').textContent = `${visiveis} ${visiveis === 1 ? 'peça' : 'peças'}${filtros.q ? ` com «${filtros.q}»` : ''}${festa && modo === 'aluguer' && filtros.livres ? ` livres a ${dataCurta(festa)}` : ''}`;
  loja.querySelector('[data-vazia]').hidden = visiveis > 0;
  loja.querySelectorAll('[data-ocasiao]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.ocasiao === filtros.ocasiao ? 'true' : 'false'));
  loja.querySelectorAll('[data-cor-filtro]').forEach((b) => b.setAttribute('aria-pressed', filtros.cores.has(b.dataset.corFiltro) ? 'true' : 'false'));
  loja.querySelector('[data-ordenar]').value = filtros.ordem;
  const n = (filtros.ocasiao ? 1 : 0) + filtros.cores.size + (filtros.ordem !== 'pedidos' ? 1 : 0);
  const cont = loja.querySelector('[data-n-filtros]');
  cont.hidden = !n;
  cont.textContent = n;
  if (n && loja.querySelector('[data-filtros]').hidden && !aplicar.jaAbriu) {
    loja.querySelector('[data-filtros]').hidden = false;
    loja.querySelector('[data-abrir-filtros]').setAttribute('aria-expanded', 'true');
  }
  aplicar.jaAbriu = true;
}

if (loja) {
  lerFragmento();
  if (filtros.q) document.querySelectorAll('input[type="search"]').forEach((i) => { i.value = filtros.q; });
  loja.addEventListener('click', async (e) => {
    const oc = e.target.closest('[data-ocasiao]');
    if (oc) { filtros.ocasiao = filtros.ocasiao === oc.dataset.ocasiao ? null : oc.dataset.ocasiao; escreverFragmento(); aplicar(); }
    const cor = e.target.closest('[data-cor-filtro]');
    if (cor) { const c = cor.dataset.corFiltro; filtros.cores.has(c) ? filtros.cores.delete(c) : filtros.cores.add(c); escreverFragmento(); aplicar(); }
    if (e.target.closest('[data-limpar-filtros]')) { filtros.ocasiao = null; filtros.cores.clear(); filtros.ordem = 'pedidos'; filtros.q = ''; history.replaceState(null, '', location.pathname); aplicar(); }
    const bf = e.target.closest('[data-abrir-filtros]');
    if (bf) { const f = loja.querySelector('[data-filtros]'); f.hidden = !f.hidden; bf.setAttribute('aria-expanded', String(!f.hidden)); }
    if (e.target.closest('[data-abrir-calendario]')) {
      const nova = await escolherData({ atual: guardado('festa', null) });
      if (nova) guardar('festa', nova);
    }
    // separadores: guardar onde a barra estava no ecrã, para a página seguinte abrir no mesmo sítio
    const sep = e.target.closest('[data-separadores] a');
    if (sep && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && sep.pathname !== location.pathname) {
      const barra = loja.querySelector('[data-loja-barra]');
      sessionStorage.setItem('er:lugar-loja', JSON.stringify({ para: sep.pathname, topo: barra.getBoundingClientRect().top, esq: loja.querySelector('[data-separadores] ul').scrollLeft, t: Date.now() }));
    }
  });
  loja.addEventListener('change', (e) => {
    if (e.target.name === 'modo-loja') guardar('modo', e.target.value);
    if (e.target.matches('[data-ordenar]')) { filtros.ordem = e.target.value; escreverFragmento(); aplicar(); }
    if (e.target.matches('[data-filtro-livres]')) aplicar();
  });
  addEventListener('hashchange', () => { lerFragmento(); aplicar(); });
  ouvir((chave) => { if (chave === 'festa' || chave === 'modo') aplicar(); });
  // o separador aberto fica à vista na fila (telemóvel), excepto quando se veio de outro separador
  if (!document.documentElement.dataset.lugarDaLoja) {
    const atual = loja.querySelector('[data-separadores] [aria-current="page"]');
    const ul = loja.querySelector('[data-separadores] ul');
    if (atual && ul && ul.scrollWidth > ul.clientWidth) ul.scrollLeft = atual.offsetLeft - 16;
  }
  aplicar();
}
