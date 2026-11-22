// «Monta o teu cenário»: as escolhas viram peças 3D (com lugar no palco), o preço soma-se e tudo vai para o
// carrinho de uma vez. O estado vai no fragmento (#cena=…), para se poder partilhar.
import { guardado, guardar, BASE, catalogo, aviso, ouvir } from './estado.js';
import { euros, precoUnitario, caucaoUnitaria, dataCurta, disponiveis } from './regras.js';
import { escolherData } from './calendario.js';
import { juntar } from './carrinho.js';

const raiz = document.querySelector('[data-monta]');
const form = raiz?.querySelector('[data-monta-form]');
const config = JSON.parse(document.getElementById('dados-monta')?.textContent || '{}');
let visor = null;
let cenas = null;

function estado() {
  const fd = new FormData(form);
  return {
    fundo: fd.get('fundo'),
    pedestais: fd.get('pedestais'),
    mesa: fd.get('mesa'),
    detalhes: fd.getAll('detalhes'),
    cores: { fundo: fd.get('cor-fundo'), pedestais: fd.get('cor-pedestais'), mesa: fd.get('cor-mesa') },
    digito: Number(fd.get('digito') || 1),
    baloes: raiz.querySelector('[data-baloes]').checked,
  };
}

const corValida = (produto, cor) => (config.produtos[produto]?.cores || []).includes(cor) ? cor : config.produtos[produto]?.cor;

// as peças escolhidas: [{ produto, cor, tamanho, digito, item3d }]
function pecas(e) {
  const lista = [];
  const comAparador = e.mesa === 'aparador-arco';
  const fundo = config.escolhas.fundo.find((x) => x.id === e.fundo);
  if (fundo?.produto) {
    const cor = corValida(fundo.produto, e.cores.fundo);
    const opcoes = fundo.id === 'painel-redondo' ? { cor, diametro: 1.5 } : { cor };
    const modelo = fundo.id === 'painel-redondo' ? 'painel-redondo' : fundo.id === 'painel-romano' ? 'painel-romano' : fundo.id;
    lista.push({ produto: fundo.produto, cor, tamanho: fundo.tamanho || null, item: { modelo, opcoes, pos: [0, 0, -0.45] } });
  }
  const ped = e.pedestais;
  if (ped === 'trio-cilindros' || ped === 'os-dois') {
    const cor = corValida('trio-cilindros', e.cores.pedestais);
    lista.push({ produto: 'trio-cilindros', cor, item: { modelo: 'trio-cilindros', opcoes: { cores: [cor, cor, cor], medidas: [[0.5, 0.7], [0.4, 0.5], [0.34, 0.35]] }, pos: [comAparador ? 1.05 : 0.45, 0, 0.15] } });
  }
  if (ped === 'cilindro-vazado' || ped === 'os-dois') {
    const cor = corValida('cilindro-vazado', e.cores.pedestais);
    lista.push({ produto: 'cilindro-vazado', cor, item: { modelo: 'cilindro-vazado', opcoes: { cor }, pos: [comAparador ? -0.98 : -0.52, 0, 0.2] } });
  }
  if (e.mesa === 'mesa-ripas') {
    const cor = corValida('mesa-ripas', e.cores.mesa);
    lista.push({ produto: 'mesa-ripas', cor, item: { modelo: 'mesa-ripas', opcoes: { cor, diametro: 0.5, altura: 0.46 }, pos: [1.12, 0, 0.6] } });
  }
  if (comAparador) {
    const cor = corValida('aparador-arco', e.cores.mesa);
    lista.push({ produto: 'aparador-arco', cor, item: { modelo: 'aparador-arco', opcoes: { cor }, pos: [0, 0, 0.25] } });
  }
  const lugares = { borboleta: [-1.15, 0.8, 0.35], nuvem: [-0.45, 1.0, 0], numero: [0.12, 1.0, 0], coroa: [0.7, 1.0, -0.15], lua: [1.45, 0.85, -0.25] };
  for (const d of e.detalhes) {
    const esc = config.escolhas.detalhes.find((x) => x.id === d);
    const [x, z, rot] = lugares[d];
    const cor = config.produtos[esc.produto].cor;
    if (d === 'numero') lista.push({ produto: esc.produto, cor, digito: e.digito, item: { texto: { fonte: '/media/fontes-3d/LilitaOne-Regular.ttf', texto: String(e.digito), altura: 0.75, espessura: 0.05, comBase: false, cor }, pos: [x, 0, z], rot } });
    else if (d === 'lua') {
      lista.push({ produto: esc.produto, cor, item: { modelo: 'lua', opcoes: { altura: 0.55, cor }, pos: [x, 0, z], rot } });
      lista.push({ item: { modelo: 'estrela', opcoes: { altura: 0.38, cor }, pos: [x + 0.42, 0, z + 0.12], rot } });
    } else {
      const modelo = { borboleta: 'borboleta', coroa: 'coroa', nuvem: 'nuvem' }[d];
      const opcoes = { borboleta: { largura: 0.6, cor }, coroa: { largura: 0.5, cor }, nuvem: { largura: 0.7, cor } }[d];
      lista.push({ produto: esc.produto, cor, item: { modelo, opcoes, pos: [x, 0, z], rot } });
    }
  }
  return lista;
}

function itens3d(e, lista) {
  const its = lista.map((p) => p.item);
  if (e.baloes && e.fundo !== 'nenhum' && cenas) {
    const cor = e.cores.fundo;
    const paleta = cenas.PALETAS_PALCO[cor] || { baloes: [cor || 'branco', 'branco', 'marfim'] };
    const garland = cenas.palco(paleta).find((i) => i.modelo === 'baloes');
    if (garland) its.push(garland);
  }
  return its;
}

function amostrasHtml(grupo, produto, atual) {
  const cores = config.produtos[produto]?.cores || [];
  return `<div class="amostras amostras--monta">${cores.map((c) => `<label class="amostra-opcao" title="${window.__acabamentos?.[c]?.nome || c}"><input type="radio" name="cor-${grupo}" value="${c}"${c === atual ? ' checked' : ''}><span class="amostra amostra--grande" style="--amostra:${window.__acabamentos?.[c]?.hex || '#ccc'}"></span><span class="so-leitor">${window.__acabamentos?.[c]?.nome || c}</span></label>`).join('')}</div>`;
}

function atualizarAmostras(e) {
  const fundo = config.escolhas.fundo.find((x) => x.id === e.fundo);
  const zonaFundo = raiz.querySelector('[data-cor-de="fundo"]');
  zonaFundo.hidden = !fundo?.produto;
  if (fundo?.produto) zonaFundo.innerHTML = amostrasHtml('fundo', fundo.produto, corValida(fundo.produto, e.cores.fundo));
  const ped = e.pedestais === 'nenhum' ? null : e.pedestais === 'cilindro-vazado' ? 'cilindro-vazado' : 'trio-cilindros';
  const zonaPed = raiz.querySelector('[data-cor-de="pedestais"]');
  zonaPed.hidden = !ped;
  if (ped) zonaPed.innerHTML = amostrasHtml('pedestais', ped, corValida(ped, e.cores.pedestais));
  const zonaMesa = raiz.querySelector('[data-cor-de="mesa"]');
  zonaMesa.hidden = e.mesa === 'nenhuma';
  if (e.mesa !== 'nenhuma') zonaMesa.innerHTML = amostrasHtml('mesa', e.mesa, corValida(e.mesa, e.cores.mesa));
  raiz.querySelector('[data-digito]').hidden = !e.detalhes.includes('numero');
}

async function atualizar({ amostras = false } = {}) {
  const cat = await catalogo();
  window.__acabamentos = cat.acabamentos;
  let e = estado();
  if (amostras) { atualizarAmostras(e); e = estado(); }
  const lista = pecas(e);
  const venda = lista.filter((p) => p.produto && cat.porId[p.produto]); // uma peça fora do site não se reserva
  const festa = guardado('festa', null);
  const total = venda.reduce((s, p) => s + (precoUnitario(cat.porId[p.produto], 'aluguer', { tamanho: p.tamanho }) || 0), 0);
  const caucao = venda.reduce((s, p) => s + caucaoUnitaria(cat.porId[p.produto]), 0);
  const esgotadas = festa ? venda.filter((p) => disponiveis(cat.porId[p.produto], festa) <= 0).map((p) => cat.porId[p.produto].nome) : [];
  raiz.querySelector('[data-monta-pecas]').textContent = `${venda.length} ${venda.length === 1 ? 'peça' : 'peças'}${esgotadas.length ? ` · esgotado a ${dataCurta(festa)}: ${esgotadas.join(', ')}` : ''}`;
  raiz.querySelector('[data-monta-preco]').textContent = venda.length ? euros(total) : '—';
  raiz.querySelector('[data-monta-caucao]').textContent = euros(caucao);
  raiz.querySelector('[data-data-texto]').textContent = festa ? dataCurta(festa) : 'Escolher';
  // fragmento para partilhar
  const frag = new URLSearchParams({ f: e.fundo, cf: e.cores.fundo || '', p: e.pedestais, cp: e.cores.pedestais || '', m: e.mesa, cm: e.cores.mesa || '', d: e.detalhes.join('.'), n: e.digito });
  history.replaceState(null, '', `${location.pathname}#${frag}`);
  if (visor) {
    clearTimeout(atualizar.t);
    atualizar.t = setTimeout(() => visor.trocar(itens3d(e, lista), { reenquadrar: true }), 120);
  }
  return { e, lista, venda, esgotadas };
}

function lerFragmento() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (!p.has('f')) return;
  const marcar = (nome, valor) => { const i = form.querySelector(`input[name="${nome}"][value="${valor}"]`); if (i) i.checked = true; };
  marcar('fundo', p.get('f')); marcar('pedestais', p.get('p')); marcar('mesa', p.get('m'));
  form.querySelectorAll('input[name="detalhes"]').forEach((i) => { i.checked = (p.get('d') || '').split('.').includes(i.value); });
  if (p.get('n')) form.querySelector('[name="digito"]').value = p.get('n');
  return { fundo: p.get('cf'), pedestais: p.get('cp'), mesa: p.get('cm') };
}

if (raiz) {
  const coresIniciais = lerFragmento();
  (async () => {
    await atualizar({ amostras: true });
    if (coresIniciais) {
      for (const [g, c] of Object.entries(coresIniciais)) { const i = form.querySelector(`input[name="cor-${g}"][value="${c}"]`); if (i) i.checked = true; }
    }
    const { e, lista } = await atualizar();
    // o 3D chega depois da página
    try {
      const m = await import(`${BASE}/assets/3d/visor.js`);
      if (!m.temWebGL()) return;
      cenas = await import(`${BASE}/assets/3d/cenas.js`);
      window.__opentypeUrl = `${BASE}/assets/3d/opentype.module.js`;
      visor = await m.criarVisor(raiz.querySelector('[data-visor]'), { itens: itens3d(e, lista), vista: { az: 16, el: 9, margem: 0.06 }, raiz: BASE, balanco: false });
    } catch (err) { console.warn('3D indisponível', err); }
  })();
  form.addEventListener('change', (ev) => atualizar({ amostras: ['fundo', 'pedestais', 'mesa', 'detalhes'].includes(ev.target.name) }));
  raiz.querySelector('[data-baloes]').addEventListener('change', () => atualizar());
  raiz.addEventListener('click', async (ev) => {
    if (ev.target.closest('[data-abrir-calendario]')) {
      const nova = await escolherData({ atual: guardado('festa', null) });
      if (nova) guardar('festa', nova);
    }
    if (ev.target.closest('[data-guardar-imagem]') && visor) {
      const a = document.createElement('a');
      a.href = visor.imagem();
      a.download = 'o-meu-cenario-encanto-real.png';
      a.click();
    }
    if (ev.target.closest('[data-partilhar-cena]')) {
      try {
        if (navigator.share) await navigator.share({ title: 'O meu cenário · Encanto Real', url: location.href });
        else { await navigator.clipboard.writeText(location.href); aviso('Ligação do cenário copiada'); }
      } catch { /* cancelado */ }
    }
  });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    let { venda, esgotadas } = await atualizar();
    if (!venda.length) { aviso('Escolha pelo menos uma peça.'); return; }
    if (!guardado('festa', null)) {
      const nova = await escolherData({ atual: null });
      if (!nova) return;
      guardar('festa', nova);
      ({ venda, esgotadas } = await atualizar());
    }
    if (esgotadas.length) { aviso(`Esgotado nesse dia: ${esgotadas.join(', ')}. Troque a peça ou a data.`); return; }
    for (const p of venda) juntar({ id: p.produto, modo: 'aluguer', cor: p.cor, tamanho: p.tamanho || null, digito: p.digito ?? null, qtd: 1 });
    window.abrirGaveta?.('carrinho');
  });
  ouvir((chave) => { if (chave === 'festa') atualizar(); });
}
