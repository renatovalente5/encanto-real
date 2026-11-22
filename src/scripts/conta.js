// A conta de pré-visualização (neste browser): entrar, criar, recuperar, painel, apagar com dupla confirmação.
// Na loja a sério, isto passa para o servidor (Cloudflare): senhas cifradas, sessões e encomendas na base de dados.
import { guardado, guardar, BASE, catalogo, aviso } from './estado.js';
import { euros, dataLonga, dataCurta, janelaAluguer, iso } from './regras.js';
import { juntar } from './carrinho.js';
import { srcDaPeca, extraDaImagem } from './imagens.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const contas = () => guardado('contas', {});

async function cifrar(senha, salHex) {
  const sal = salHex ? Uint8Array.from(salHex.match(/../g).map((x) => parseInt(x, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: sal, iterations: 120000, hash: 'SHA-256' }, chave, 256);
  const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  return { sal: hex(sal), hash: hex(bits) };
}

function destino() {
  const v = new URLSearchParams(location.search).get('voltar');
  return v && /^\/[a-z0-9/-]*$/.test(v) ? `${BASE}${v}` : `${BASE}/conta/`;
}

function erroCampo(form, nome, msg) {
  const input = form.elements[nome];
  const el = input && form.querySelector(`#${input.id}-erro`);
  if (!input) return;
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (el) { el.textContent = msg || ''; el.hidden = !msg; }
}

// mostrar/esconder a senha
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ver-senha]');
  if (!b) return;
  const input = b.parentElement.querySelector('input');
  const ver = input.type === 'password';
  input.type = ver ? 'text' : 'password';
  b.textContent = ver ? 'Esconder' : 'Mostrar';
  b.setAttribute('aria-pressed', String(ver));
  b.setAttribute('aria-label', ver ? 'Esconder a senha' : 'Mostrar a senha');
});

// ------------------------------------------------------------------------------------------- entrar
const fEntrar = document.querySelector('[data-form-entrar]');
if (fEntrar) {
  if (guardado('sessao', null)) location.replace(destino());
  fEntrar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = fEntrar.email.value.trim().toLowerCase();
    const senha = fEntrar.senha.value;
    const erro = fEntrar.querySelector('[data-erro]');
    erroCampo(fEntrar, 'email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? null : 'Escreva o email completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !senha) { (email ? fEntrar.senha : fEntrar.email).focus(); return; }
    const c = contas()[email];
    const ok = c && (await cifrar(senha, c.sal)).hash === c.hash;
    if (!ok) { erro.textContent = 'O email ou a senha não estão certos.'; erro.hidden = false; return; }
    guardar('sessao', { email, nome: c.nome, desde: Date.now() });
    location.href = destino();
  });
}

// ------------------------------------------------------------------------------------------- criar
const fCriar = document.querySelector('[data-form-criar]');
if (fCriar) {
  if (location.hash === '#da-encomenda') {
    const n = guardado('ultima-encomenda', null);
    const e = guardado('encomendas', []).find((x) => x.numero === n);
    if (e) { fCriar.nome.value = e.nome; fCriar.email.value = e.email; }
  }
  fCriar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = fCriar.nome.value.trim();
    const email = fCriar.email.value.trim().toLowerCase();
    const senha = fCriar.senha.value;
    const erros = [];
    const checar = (campo, ok, msg) => { erroCampo(fCriar, campo, ok ? null : msg); if (!ok) erros.push(campo); };
    checar('nome', nome.length >= 2, 'Escreva o seu nome.');
    checar('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), 'Escreva o email completo, por exemplo ana@gmail.com.');
    checar('senha', senha.length >= 8 && /\d/.test(senha) && /[a-zA-Z]/.test(senha), 'Use 8 ou mais caracteres, com letras e números.');
    if (erros.length) { fCriar.elements[erros[0]].focus(); return; }
    const todas = contas();
    if (todas[email]) { const erro = fCriar.querySelector('[data-erro]'); erro.innerHTML = `Já há uma conta com este email. <a href="${BASE}/conta/entrar/">Entrar</a>`; erro.hidden = false; return; }
    const { sal, hash } = await cifrar(senha);
    todas[email] = { nome, email, sal, hash, criada: new Date().toISOString(), novidades: fCriar.novidades.checked };
    guardar('contas', todas);
    guardar('sessao', { email, nome, desde: Date.now() });
    location.href = destino();
  });
}

// ------------------------------------------------------------------------------------------- recuperar
const fRec = document.querySelector('[data-form-recuperar]');
fRec?.addEventListener('submit', (e) => { e.preventDefault(); fRec.querySelector('[data-certo]').hidden = false; });

// ------------------------------------------------------------------------------------------- janela de confirmação
function confirmar({ titulo, texto, sim, perigo = false }) {
  return new Promise((resolver) => {
    const d = document.createElement('dialog');
    d.className = 'janela';
    d.setAttribute('aria-labelledby', 'j-titulo');
    d.innerHTML = `<div class="janela__caixa"><h2 id="j-titulo">${esc(titulo)}</h2><p>${texto}</p><div class="janela__botoes"><button type="button" class="botao botao--contorno" data-nao>Cancelar</button><button type="button" class="botao ${perigo ? 'botao--perigo' : 'botao--verde'}" data-sim>${esc(sim)}</button></div></div>`;
    document.body.append(d);
    const fim = (v) => { d.close(); d.remove(); resolver(v); };
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-nao]')) fim(false); if (e.target.closest('[data-sim]')) fim(true); });
    d.addEventListener('cancel', (e) => { e.preventDefault(); fim(false); });
    d.showModal();
    d.querySelector('[data-nao]').focus();
  });
}

// ------------------------------------------------------------------------------------------- painel
const painel = document.querySelector('[data-conta]');
if (painel) {
  const sessao = guardado('sessao', null);
  const conta = sessao && contas()[sessao.email];
  if (!sessao || !conta) location.replace(`${BASE}/conta/entrar/?voltar=/conta/`);
  else desenharPainel(conta);
}

const ESTADOS = {
  aluguer: ['Reservada', 'Entregue', 'Devolvida'],
  compra: ['Paga', 'Em produção', 'Pronta', 'Entregue'],
};

async function desenharPainel(conta) {
  const cat = await catalogo();
  painel.querySelector('[data-ola]').textContent = `Olá, ${conta.nome.split(' ')[0]}`;
  const encomendas = guardado('encomendas', []).filter((e) => e.email === conta.email);
  const hoje = iso(new Date());
  const enc = painel.querySelector('[data-encomendas]');
  if (!encomendas.length) {
    enc.innerHTML = `<div class="vazio vazio--pequeno"><p><strong>Ainda não há festas aqui.</strong></p><p>Quando encomendar com este email, cada festa aparece aqui, com as datas e a fatura.</p><a class="botao botao--verde" href="${BASE}/loja/">Ir à loja</a></div>`;
  } else {
    enc.innerHTML = encomendas.map((e) => {
      const aluguer = !!e.festa;
      const passos = aluguer ? ESTADOS.aluguer : ESTADOS.compra;
      const j = aluguer ? janelaAluguer(e.festa.data) : null;
      const atual = aluguer ? (hoje > j.devolver ? 2 : hoje >= j.levantar ? 1 : 0) : 1;
      return `<article class="festa-cartao">
        <header class="festa-cartao__cabeca">
          <div><h3>${esc(e.festa?.nome || (aluguer ? `Festa de ${dataCurta(e.festa.data)}` : 'Compra'))}</h3><p>${esc(e.numero)} · ${aluguer ? dataLonga(e.festa.data) : new Date(e.criada).toLocaleDateString('pt-PT')}</p></div>
          <strong>${euros(e.totais.total, { semCentimosRedondos: false })}</strong>
        </header>
        <ol class="estado-linha" aria-label="Estado">${passos.map((p, i) => `<li class="${i < atual ? 'feito' : i === atual ? 'atual' : ''}"${i === atual ? ' aria-current="step"' : ''}>${p}</li>`).join('')}</ol>
        <ul class="festa-cartao__pecas">${e.linhas.map((l) => `<li><img src="${l.img || srcDaPeca(cat.porId[l.id] || { id: l.id, cor: l.cor || 'base' }, l.cor, 480)}"${extraDaImagem(cat.porId[l.id])} alt="" width="48" height="60" style="--fundo:var(--azulejo-${cat.porId[l.id]?.fundo || 'areia'})"><span>${l.qtd} × ${esc(l.nome)}${l.corNome ? ` · ${esc(l.corNome)}` : ''}</span></li>`).join('')}</ul>
        ${e.pagamento.falta > 0 ? `<p class="festa-cartao__nota">Sinal pago. Faltam ${euros(e.pagamento.falta, { semCentimosRedondos: false })} a 7 dias da festa.</p>` : ''}
        <div class="festa-cartao__accoes">
          <button type="button" class="botao botao--contorno botao--pequeno" data-repetir="${esc(e.numero)}">${aluguer ? 'Repetir esta festa' : 'Encomendar outra vez'}</button>
          <button type="button" class="ligacao-simples" data-fatura>Fatura (PDF)</button>
        </div>
      </article>`;
    }).join('');
  }
  // cupões
  const usados = encomendas.map((e) => e.totais.cupao).filter(Boolean);
  const disponiveisCupoes = cat.cupoes.filter((c) => !usados.includes(c.codigo) && (!c.primeiraEncomenda || !encomendas.length) && (!c.soClientes || encomendas.length) && (!c.validade || hoje <= c.validade));
  painel.querySelector('[data-cupoes]').innerHTML = `<ul class="cupoes">${disponiveisCupoes.map((c) => `<li class="cupao-cartao"><span class="cupao-cartao__codigo">${esc(c.codigo)}</span><span>${esc(c.descricao)}${c.validade ? ` · até ${dataCurta(c.validade)} de ${c.validade.slice(0, 4)}` : ''}</span><button type="button" class="ligacao-simples" data-copiar="${esc(c.codigo)}">Copiar</button></li>`).join('')}</ul>`;
  // dados
  const f = painel.querySelector('[data-form-dados]');
  f.nome.value = conta.nome || '';
  f.email.value = conta.email;
  f.telemovel.value = conta.telemovel || '';
  f.nif.value = conta.nif || '';
  f.morada.value = conta.morada?.morada || '';
  f.cp.value = conta.morada?.cp || '';
  f.localidade.value = conta.morada?.localidade || '';
  f.novidades.checked = !!conta.novidades;
  f.onsubmit = (e) => {
    e.preventDefault();
    const todas = contas();
    const c = todas[conta.email];
    Object.assign(c, { nome: f.nome.value.trim() || c.nome, telemovel: f.telemovel.value.trim(), nif: f.nif.value.trim(), morada: { morada: f.morada.value.trim(), cp: f.cp.value.trim(), localidade: f.localidade.value.trim() }, novidades: f.novidades.checked });
    guardar('contas', todas);
    guardar('sessao', { ...guardado('sessao', {}), nome: c.nome });
    aviso('Dados guardados');
  };
}

painel?.addEventListener('click', async (e) => {
  const rep = e.target.closest('[data-repetir]');
  if (rep) {
    const enc = guardado('encomendas', []).find((x) => x.numero === rep.dataset.repetir);
    enc?.linhas.forEach((l) => juntar({ id: l.id, modo: l.modo, cor: l.cor, tamanho: l.tamanho, digito: l.digito, texto: l.texto, qtd: l.qtd }));
    guardar('festa', null);
    aviso('As peças estão no carrinho. Falta escolher a data.', { acao: 'Ver', href: `${BASE}/carrinho/` });
  }
  if (e.target.closest('[data-fatura]')) aviso('Na loja a sério, a fatura chega por email e fica aqui.');
  const cop = e.target.closest('[data-copiar]');
  if (cop) { try { await navigator.clipboard.writeText(cop.dataset.copiar); aviso(`Código ${cop.dataset.copiar} copiado`); } catch { aviso(cop.dataset.copiar); } }
  if (e.target.closest('[data-sair-todos]')) {
    if (await confirmar({ titulo: 'Terminar a sessão em todos os aparelhos?', texto: 'Tem de voltar a entrar em todos, incluindo neste.', sim: 'Terminar todas' })) {
      guardar('sessao', null);
      location.href = `${BASE}/conta/entrar/`;
    }
  }
  if (e.target.closest('[data-apagar-conta]')) {
    const ok = await confirmar({
      titulo: 'Apagar a conta?',
      texto: 'Apagamos o nome, o email, a senha e as moradas. As faturas ficam guardadas 10 anos, como a lei obriga. Isto não se desfaz.',
      sim: 'Apagar a conta',
      perigo: true,
    });
    if (!ok) return;
    const s = guardado('sessao', null);
    const todas = contas();
    delete todas[s.email];
    guardar('contas', todas);
    guardar('sessao', null);
    try { sessionStorage.setItem('er:aviso', 'A conta foi apagada.'); } catch { /* sem armazenamento */ }
    location.href = `${BASE}/`;
  }
});
