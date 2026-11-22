// Finalizar: dados, entrega (zona pelo código postal), data da festa, sinal ou tudo, forma de pagamento.
// Na pré-visualização não se cobra nada: o «Pagar» abre uma janela que o explica e simula o pagamento.
import { guardado, guardar, BASE, catalogo, ouvir, escreverTexto, escreverHtml } from './estado.js';
import { calcular, euros, zonaDoCodigoPostal, validarCodigoPostal, dataLonga, dataCurta, janelaAluguer } from './regras.js';
import { escolherData } from './calendario.js';
import { itens, festa, totaisHtml } from './carrinho.js';
import { srcDaPeca, extraDaImagem } from './imagens.js';

const raiz = document.querySelector('[data-finalizar]');
const form = raiz?.querySelector('[data-form-finalizar]');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let ultimo = null;

function valor(nome) { return (form.elements[nome]?.value || '').trim(); }
function escolhido(nome) { return form.querySelector(`input[name="${nome}"]:checked`)?.value; }

function entregaAtual() {
  const modo = escolhido('entrega');
  const cp = valor('codigo-postal');
  const zona = zonaDoCodigoPostal(cp);
  return {
    modo: modo === 'montagem' ? 'entrega' : modo,
    montagem: modo === 'montagem',
    zona: zona && zona !== 'fora' ? zona : null,
    fora: zona === 'fora',
    escolha: modo,
  };
}

async function recalcular() {
  const cat = await catalogo();
  const lista = itens();
  const resumoEl = raiz.querySelector('[data-resumo-finalizar]');
  if (!lista.length) {
    raiz.querySelector('.finalizar__grelha').innerHTML = `<div class="carrinho__vazio"><p><strong>O carrinho está vazio.</strong></p><a class="botao botao--verde" href="${BASE}/loja/">Ir à loja</a></div>`;
    return;
  }
  const ent = entregaAtual();
  const r = calcular(lista, {
    produtosPorId: cat.porId, entregas: cat.entregas, cupoes: cat.cupoes, codigo: guardado('cupao', null), festa: festa(),
    entrega: ent, pagamento: escolhido('pagamento') || 'total',
    primeiraEncomenda: !(guardado('encomendas', []).some((e) => e.email === valor('email'))),
  });
  ultimo = { r, cat, ent };
  // o que aparece consoante o carrinho
  raiz.querySelectorAll('[data-so-aluguer]').forEach((el) => { el.hidden = !r.temAluguer; });
  raiz.querySelectorAll('[data-so-compra]').forEach((el) => { el.hidden = r.temAluguer; });
  escreverTexto(raiz.querySelector('[data-n-pagamento]'), r.temAluguer ? '4' : '3');
  raiz.querySelector('[data-opcoes-sinal]').hidden = !r.sinalPossivel;
  if (!r.sinalPossivel && escolhido('pagamento') === 'sinal') form.querySelector('input[name="pagamento"][value="total"]').checked = true;
  raiz.querySelector('[data-morada]').hidden = !['entrega', 'montagem'].includes(ent.escolha);
  // zona
  const zonaEl = raiz.querySelector('[data-zona]');
  const cp = valor('codigo-postal');
  if (['entrega', 'montagem'].includes(ent.escolha) && validarCodigoPostal(cp)) {
    if (ent.fora) { zonaEl.className = 'zona zona--fora'; escreverTexto(zonaEl, 'Esta morada fica fora das nossas zonas. Escolha levantar em Esposende, ou fale connosco para um orçamento.'); }
    else { const z = cat.entregas.zonas.find((x) => x.id === ent.zona); zonaEl.className = 'zona'; escreverTexto(zonaEl, `${z.nome} (${z.descricao}): ${r.envio === 0 ? 'entrega grátis' : euros(r.envio)}${ent.montagem ? ', com montagem' : ''}.`); }
  } else escreverTexto(zonaEl, '');
  // data
  const f = festa();
  if (r.temAluguer) {
    escreverTexto(raiz.querySelector('[data-data-texto]'), f ? dataLonga(f) : 'Escolher a data');
    const j = f ? janelaAluguer(f) : null;
    escreverTexto(raiz.querySelector('[data-janela]'), j ? `${ent.escolha === 'levantamento' ? 'Levanta' : 'Entregamos'} ${dataCurta(j.levantar)} · ${ent.escolha === 'levantamento' ? 'devolve' : 'recolhemos'} ${dataCurta(j.devolver)}` : 'Levanta na véspera e devolve no dia a seguir');
  }
  // sinal
  escreverTexto(raiz.querySelector('[data-valor-total]'), euros(r.total, { semCentimosRedondos: false }));
  escreverTexto(raiz.querySelector('[data-valor-sinal]'), euros(Math.round((r.subtotalAluguer - r.desconto) * 50) / 100, { semCentimosRedondos: false }));
  // resumo
  const entregaTexto = ent.escolha === 'levantamento' ? 'Levantamento' : ent.escolha === 'transportadora' ? 'Envio' : ent.montagem ? 'Entrega e montagem' : 'Entrega e recolha';
  const linhasHtml = r.linhas.map((l) => {
    const p = cat.porId[l.id];
    const corNome = p.combinacoes ? p.combinacoes.find((c) => c.id === l.cor)?.nome : (l.cor && l.cor !== 'base' ? cat.acabamentos[l.cor]?.nome : '');
    return `<li class="mini-linha"><span class="mini-linha__imagem" style="--fundo:var(--azulejo-${p.fundo || 'areia'})"><img src="${srcDaPeca(p, l.cor, 480)}"${extraDaImagem(p)} alt="" width="56" height="70"><b>${l.qtd}</b></span><span><strong>${esc(p.nome)}</strong><small>${[l.modo === 'aluguer' ? 'Aluguer' : 'Compra', corNome, l.texto ? `«${esc(l.texto)}»` : '', l.digito != null && p.digitos ? `n.º ${l.digito}` : ''].filter(Boolean).join(' · ')}</small></span><span>${euros(l.total)}</span></li>`;
  }).join('');
  const cupaoHtml = `<form class="cupao cupao--compacto" data-cupao-finalizar><label for="cupao-f" class="so-leitor">Código de desconto</label><div class="cupao__campo"><input class="campo" id="cupao-f" placeholder="Código de desconto" autocomplete="off" autocapitalize="characters" value="${esc(guardado('cupao', '') || '')}"><button type="submit" class="botao botao--contorno">Aplicar</button></div>${r.erroCupao ? `<p class="cupao__erro" role="alert">${esc(r.erroCupao)}</p>` : r.cupao && r.motivoDesconto === 'cupao' ? `<p class="cupao__certo">${esc(r.cupao.descricao)}.</p>` : ''}</form>`;
  const agora = r.aPagarAgora < r.total ? `<p class="totais__agora">Agora: <strong>${euros(r.aPagarAgora, { semCentimosRedondos: false })}</strong> · a ${f ? dataCurta(new Date(new Date(f).getTime() - 7 * 864e5).toISOString().slice(0, 10)) : '7 dias da festa'}: ${euros(r.total - r.aPagarAgora, { semCentimosRedondos: false })}</p>` : '';
  escreverHtml(resumoEl, `<h2 class="finalizar__resumo-titulo">A sua encomenda</h2><ul class="mini-linhas">${linhasHtml}</ul>${cupaoHtml}${totaisHtml(r, { comEntrega: true, entregaTexto })}${agora}`);
  escreverHtml(raiz.querySelector('[data-resumo-linhas-movel]'), `<ul class="mini-linhas">${linhasHtml}</ul>${totaisHtml(r, { comEntrega: true, entregaTexto })}`);
  escreverTexto(raiz.querySelector('[data-total-movel]'), euros(r.total, { semCentimosRedondos: false }));
  escreverHtml(raiz.querySelector('[data-total-botao]'), `<span>Total</span><strong>${euros(r.total, { semCentimosRedondos: false })}</strong>${r.aPagarAgora < r.total ? `<small>Agora ${euros(r.aPagarAgora, { semCentimosRedondos: false })}</small>` : ''}`);
  escreverTexto(raiz.querySelector('[data-pagar]'), `Pagar ${euros(r.aPagarAgora, { semCentimosRedondos: false })}`);
  // métodos
  const m = escolhido('metodo');
  raiz.querySelector('[data-metodo-mbway]').hidden = m !== 'mbway';
  raiz.querySelector('[data-metodo-cartao]').hidden = m !== 'cartao';
  raiz.querySelector('[data-metodo-multibanco]').hidden = m !== 'multibanco';
}

function erroEm(nome, msg) {
  const input = form.elements[nome];
  const el = form.querySelector(`#${nome}-erro`);
  if (!input || !el) return;
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (msg) { el.textContent = msg; el.hidden = false; input.setAttribute('aria-errormessage', `${nome}-erro`); }
  else { el.hidden = true; input.removeAttribute('aria-errormessage'); }
}

function validar() {
  const erros = [];
  const email = valor('email');
  const tel = valor('telemovel').replace(/\s+/g, '');
  const checar = (nome, ok, msg) => { erroEm(nome, ok ? null : msg); if (!ok) erros.push(nome); };
  checar('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), 'Escreva o email completo, por exemplo ana@gmail.com.');
  checar('nome', valor('nome').length >= 2, 'Escreva o seu nome.');
  checar('telemovel', /^(\+351)?[29]\d{8}$/.test(tel), 'Escreva o telemóvel com 9 algarismos.');
  if (valor('nif')) checar('nif', /^\d{9}$/.test(valor('nif')), 'O NIF tem 9 algarismos.');
  const ent = entregaAtual();
  if (['entrega', 'montagem'].includes(ent.escolha)) {
    checar('morada', valor('morada').length >= 4, 'Escreva a morada.');
    const cp = valor('codigo-postal');
    checar('codigo-postal', validarCodigoPostal(cp) && !ent.fora, validarCodigoPostal(cp) ? 'Fora das nossas zonas: escolha levantar em Esposende.' : 'O código postal tem este formato: 4740-000.');
    checar('localidade', valor('localidade').length >= 2, 'Escreva a localidade.');
  }
  if (escolhido('metodo') === 'mbway') checar('telemovel-mbway', /^9\d{8}$/.test(valor('telemovel-mbway').replace(/\s+/g, '')), 'O MB WAY usa um telemóvel começado por 9, com 9 algarismos.');
  const termos = form.querySelector('[data-termos]');
  form.querySelector('[data-erro-termos]').hidden = termos.checked;
  if (!termos.checked) erros.push('termos');
  if (ultimo?.r.temAluguer && !festa()) erros.push('festa');
  return erros;
}

function janelaPreVisualizacao(r, metodo) {
  return new Promise((resolver) => {
    const d = document.createElement('dialog');
    d.className = 'janela';
    const textos = {
      mbway: `Na loja a sério, chegava agora um pedido de ${euros(r.aPagarAgora, { semCentimosRedondos: false })} à app MB WAY do telemóvel ${esc(valor('telemovel-mbway'))}.`,
      cartao: 'Na loja a sério, abria agora a página segura do banco para os dados do cartão.',
      multibanco: 'Na loja a sério, aparecia agora a entidade e a referência Multibanco, e o mesmo por email.',
      apple: 'Na loja a sério, abria agora a folha do Apple Pay.',
    };
    d.innerHTML = `<div class="janela__caixa">
      <h2>Pré-visualização</h2>
      <p>${textos[metodo] || textos.cartao}</p>
      <p>Este site ainda não cobra nada. Pode simular o pagamento para ver o que acontece depois.</p>
      <div class="janela__botoes"><button type="button" class="botao botao--contorno" data-nao>Cancelar</button><button type="button" class="botao botao--verde" data-sim>Simular pagamento aceite</button></div>
    </div>`;
    document.body.append(d);
    const fim = (v) => { d.close(); d.remove(); resolver(v); };
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-nao]')) fim(false); if (e.target.closest('[data-sim]')) fim(true); });
    d.addEventListener('cancel', (e) => { e.preventDefault(); fim(false); });
    d.showModal();
    d.querySelector('[data-nao]').focus();
  });
}

function novoNumero() {
  const n = (guardado('sequencia', 41) || 41) + 1;
  guardar('sequencia', n);
  return `ER-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

if (form) {
  // preencher com a sessão ou com o rascunho
  const sessao = guardado('sessao', null);
  const contas = guardado('contas', {});
  const conta = sessao ? contas[sessao.email] : null;
  const rasc = guardado('rascunho-finalizar', {});
  const pre = { email: conta?.email || rasc.email, nome: conta?.nome || rasc.nome, telemovel: conta?.telemovel || rasc.telemovel, nif: conta?.nif || rasc.nif, morada: conta?.morada?.morada || rasc.morada, 'codigo-postal': conta?.morada?.cp || rasc['codigo-postal'], localidade: conta?.morada?.localidade || rasc.localidade };
  for (const [k, v] of Object.entries(pre)) if (v && form.elements[k]) form.elements[k].value = v;
  if (sessao) raiz.querySelector('[data-sem-sessao]').hidden = true;
  if (window.ApplePaySession?.canMakePayments?.()) raiz.querySelector('[data-apple-pay]').hidden = false;

  form.addEventListener('input', (e) => {
    if (e.target.name === 'codigo-postal') {
      const so = e.target.value.replace(/\D/g, '').slice(0, 7);
      e.target.value = so.length > 4 ? `${so.slice(0, 4)}-${so.slice(4)}` : so;
    }
    const guardaveis = ['email', 'nome', 'telemovel', 'nif', 'morada', 'codigo-postal', 'localidade'];
    if (guardaveis.includes(e.target.name)) guardar('rascunho-finalizar', Object.fromEntries(guardaveis.map((k) => [k, valor(k)])));
    if (['codigo-postal', 'email'].includes(e.target.name)) recalcular();
  });
  form.addEventListener('change', () => recalcular());
  form.addEventListener('focusout', (e) => {
    // validar ao sair do campo, só se já tem alguma coisa escrita (sem apagar nada)
    if (e.target.matches('input.campo') && e.target.value && e.target.getAttribute('aria-invalid') === 'true') validar();
  });
  raiz.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-abrir-calendario]')) return;
    const nova = await escolherData({ atual: festa() });
    if (nova) guardar('festa', nova);
  });
  raiz.addEventListener('submit', (e) => {
    if (!e.target.closest('[data-cupao-finalizar]')) return;
    e.preventDefault();
    guardar('cupao', e.target.querySelector('input').value.trim().toUpperCase() || null);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await recalcular();
    const erros = validar();
    if (erros.length) {
      if (erros[0] === 'festa') { const nova = await escolherData({ atual: null }); if (nova) guardar('festa', nova); return; }
      const alvo = erros[0] === 'termos' ? form.querySelector('[data-termos]') : form.elements[erros[0]];
      alvo?.focus();
      return;
    }
    const { r, cat, ent } = ultimo;
    const metodo = escolhido('metodo');
    if (!(await janelaPreVisualizacao(r, metodo))) return;
    const encomenda = {
      numero: novoNumero(),
      criada: new Date().toISOString(),
      email: valor('email').toLowerCase(), nome: valor('nome'), telemovel: valor('telemovel'), nif: valor('nif') || null,
      entrega: { escolha: ent.escolha, zona: ent.zona, morada: valor('morada'), cp: valor('codigo-postal'), localidade: valor('localidade'), janela: escolhido('janela') },
      festa: r.temAluguer ? { data: festa(), nome: valor('nome-festa') || null } : null,
      pagamento: { metodo, modo: escolhido('pagamento') || 'total', pago: r.aPagarAgora, falta: Math.round((r.total - r.aPagarAgora) * 100) / 100 },
      linhas: r.linhas.map((l) => ({ ...l, img: srcDaPeca(cat.porId[l.id], l.cor, 480), nome: cat.porId[l.id].nome, corNome: cat.porId[l.id].combinacoes ? cat.porId[l.id].combinacoes.find((c) => c.id === l.cor)?.nome : cat.acabamentos[l.cor]?.nome || null })),
      totais: { subtotal: r.subtotal, desconto: r.desconto, motivoDesconto: r.motivoDesconto, cupao: r.motivoDesconto === 'cupao' ? r.cupao?.codigo : null, envio: r.envio, caucao: r.caucao, total: r.total },
      notas: valor('notas') || null,
      estado: r.aPagarAgora < r.total ? 'sinal' : 'paga',
    };
    const todas = guardado('encomendas', []);
    todas.unshift(encomenda);
    guardar('encomendas', todas);
    guardar('carrinho', []);
    guardar('cupao', null);
    guardar('ultima-encomenda', encomenda.numero);
    location.href = `${BASE}/obrigado/#${encomenda.numero}`;
  });
  ouvir((chave) => { if (['carrinho', 'festa', 'cupao'].includes(chave)) recalcular(); });
  recalcular();
}
