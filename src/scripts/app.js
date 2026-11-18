// O que todas as páginas fazem: gavetas (menu, carrinho, procura), favoritos, contadores, carrossel da capa,
// filas que deslizam, procura instantânea, menu da conta e as entradas ao descer.
import { guardado, guardar, BASE, catalogo, aviso, ouvir } from './estado.js';

// ------------------------------------------------------------------------------------------- gavetas
const gavetas = Object.fromEntries([...document.querySelectorAll('[data-gaveta]')].map((d) => [d.dataset.gaveta, d]));

export function abrirGaveta(nome) {
  const d = gavetas[nome];
  if (!d || d.open) return;
  d.showModal();
  document.documentElement.classList.add('com-gaveta');
  if (nome === 'carrinho') import('./carrinho.js').then((m) => m.desenharGaveta(d.querySelector('[data-carrinho-gaveta]')));
  if (nome === 'procura') d.querySelector('input')?.focus();
}
window.abrirGaveta = abrirGaveta;

for (const d of Object.values(gavetas)) {
  d.addEventListener('click', (e) => {
    if (e.target === d) d.close(); // toque fora (no fundo)
    if (e.target.closest('[data-fechar]')) d.close();
  });
  d.addEventListener('close', () => document.documentElement.classList.remove('com-gaveta'));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-abrir]');
  if (b) { e.preventDefault(); abrirGaveta(b.dataset.abrir); }
});

// ------------------------------------------------------------------------------------------- favoritos
export function favoritos() { return guardado('favoritos', []); }

function pintarFavoritos() {
  const f = new Set(favoritos());
  document.querySelectorAll('[data-favorito]').forEach((b) => {
    const sim = f.has(b.dataset.favorito);
    b.setAttribute('aria-pressed', sim ? 'true' : 'false');
  });
  contador('favoritos', f.size);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-favorito]');
  if (!b) return;
  e.preventDefault();
  const id = b.dataset.favorito;
  const f = favoritos();
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.unshift(id);
  guardar('favoritos', f);
  pintarFavoritos();
  if (i < 0) aviso('Guardado nos favoritos', { acao: 'Ver', href: `${BASE}/favoritos/` });
  else aviso('Tirado dos favoritos', { acao: 'Desfazer', fn: () => { const g = favoritos(); g.unshift(id); guardar('favoritos', g); pintarFavoritos(); } });
});

// ------------------------------------------------------------------------------------------- contadores
function contador(nome, n) {
  document.querySelectorAll(`[data-contador="${nome}"]`).forEach((c) => {
    c.textContent = n > 99 ? '99+' : String(n);
    c.hidden = !n;
  });
}
export function pintarCarrinho() {
  const itens = guardado('carrinho', []);
  contador('carrinho', itens.reduce((s, i) => s + (i.qtd || 1), 0));
}
ouvir((chave) => {
  if (chave === 'carrinho') pintarCarrinho();
  if (chave === 'favoritos') pintarFavoritos();
  if (chave === 'sessao') pintarConta();
});

// ------------------------------------------------------------------------------------------- carrossel da capa
for (const caixa of document.querySelectorAll('[data-diapositivos]')) {
  const slides = [...caixa.querySelectorAll('[data-diapositivo]')];
  let atual = 0;
  const ir = (n, foco) => {
    atual = (n + slides.length) % slides.length;
    slides.forEach((s, i) => { s.hidden = i !== atual; });
    caixa.querySelectorAll('[data-ir]').forEach((b) => b.setAttribute('aria-current', Number(b.dataset.ir) === atual ? 'true' : 'false'));
    if (foco) slides[atual].querySelector(foco)?.focus();
  };
  caixa.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]');
    if (b) ir(Number(b.dataset.ir), `[data-ir="${b.dataset.ir}"]`);
    if (e.target.closest('[data-seguinte]')) ir(atual + 1, '[data-seguinte]');
  });
  // deslizar com o dedo no mosaico
  let x0 = null;
  caixa.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  caixa.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 60 && e.target.closest('.mosaico')) ir(atual + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

// ------------------------------------------------------------------------------------------- filas
for (const fila of document.querySelectorAll('[data-fila]')) {
  const lista = fila.querySelector('.fila__lista');
  const ant = fila.querySelector('[data-fila-anterior]');
  const seg = fila.querySelector('[data-fila-seguinte]');
  if (!lista || !ant || !seg) continue;
  const atualizar = () => {
    const max = lista.scrollWidth - lista.clientWidth;
    ant.hidden = lista.scrollLeft < 8;
    seg.hidden = lista.scrollLeft > max - 8 || max < 8;
  };
  const passo = () => lista.clientWidth * 0.75;
  ant.addEventListener('click', () => lista.scrollBy({ left: -passo(), behavior: 'smooth' }));
  seg.addEventListener('click', () => lista.scrollBy({ left: passo(), behavior: 'smooth' }));
  lista.addEventListener('scroll', atualizar, { passive: true });
  new ResizeObserver(atualizar).observe(lista);
  atualizar();
}

// ------------------------------------------------------------------------------------------- procura instantânea
const normalizar = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
for (const form of document.querySelectorAll('[data-procura]')) {
  const campo = form.querySelector('input[type="search"]');
  const caixa = form.querySelector('[data-resultados]');
  let lista = null;
  const mostrar = async () => {
    const q = normalizar(campo.value.trim());
    if (q.length < 2) { caixa.hidden = true; return; }
    const cat = await catalogo();
    lista = cat.produtos.filter((p) => normalizar(`${p.nome} ${p.resumo} ${p.categoriaNome} ${(p.ocasioesNomes || []).join(' ')}`).includes(q)).slice(0, 6);
    caixa.innerHTML = lista.length
      ? lista.map((p) => `<a class="procura__item" href="${BASE}/loja/${p.id}/"><img src="${BASE}/media/produtos/${p.id}/principal-${p.cor}-480.webp" alt="" style="--fundo:var(--azulejo-${p.fundo || 'areia'})" loading="lazy"><span><strong>${p.nome}</strong><small>${p.categoriaNome}</small></span><span>${p.precoTexto}</span></a>`).join('') + `<a class="procura__todos" href="${BASE}/loja/?q=${encodeURIComponent(campo.value.trim())}">Ver todos os resultados</a>`
      : `<p class="procura__nada">Nada com «${campo.value.trim().replace(/[<>&]/g, '')}». Experimente «arco», «cilindro» ou «número».</p>`;
    caixa.hidden = false;
  };
  campo.addEventListener('input', mostrar);
  campo.addEventListener('focus', mostrar);
  campo.addEventListener('keydown', (e) => { if (e.key === 'Escape') { caixa.hidden = true; } });
  document.addEventListener('click', (e) => { if (!form.contains(e.target)) caixa.hidden = true; });
}

// ------------------------------------------------------------------------------------------- menu da conta
function pintarConta() {
  const zona = document.querySelector('[data-conta-menu]');
  if (!zona) return;
  const sessao = guardado('sessao', null);
  zona.querySelector('.conta-menu__painel')?.remove();
  const botao = zona.querySelector('[data-conta-botao]');
  botao.setAttribute('aria-label', sessao ? `A minha conta (${sessao.nome || sessao.email})` : 'Entrar na conta');
  botao.toggleAttribute('aria-expanded', false);
  if (!sessao) { botao.removeAttribute('aria-expanded'); return; }
  botao.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (e) => {
  const zona = document.querySelector('[data-conta-menu]');
  const botao = e.target.closest('[data-conta-botao]');
  const painel = zona?.querySelector('.conta-menu__painel');
  if (painel && !zona.contains(e.target)) { painel.remove(); zona.querySelector('[data-conta-botao]').setAttribute('aria-expanded', 'false'); return; }
  if (!botao) return;
  const sessao = guardado('sessao', null);
  if (!sessao) return; // sem sessão, é a ligação para entrar
  e.preventDefault();
  if (painel) { painel.remove(); botao.setAttribute('aria-expanded', 'false'); return; }
  const div = document.createElement('div');
  div.className = 'conta-menu__painel';
  div.innerHTML = `<div class="conta-menu__quem"><strong>Olá, ${(sessao.nome || '').split(' ')[0] || 'olá'}</strong><span>${sessao.email}</span></div>
    <a href="${BASE}/conta/"><svg class="icone"><use href="#i-pessoa"/></svg>A minha conta</a>
    <a href="${BASE}/conta/#encomendas"><svg class="icone"><use href="#i-pacote"/></svg>As minhas encomendas</a>
    <a href="${BASE}/favoritos/"><svg class="icone"><use href="#i-coracao"/></svg>Favoritos</a>
    <button type="button" data-sair><svg class="icone"><use href="#i-sair"/></svg>Sair</button>`;
  zona.appendChild(div);
  botao.setAttribute('aria-expanded', 'true');
  div.querySelector('a').focus();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const painel = document.querySelector('.conta-menu__painel');
  if (painel) { painel.remove(); const b = document.querySelector('[data-conta-botao]'); b.setAttribute('aria-expanded', 'false'); b.focus(); }
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-sair]')) return;
  guardar('sessao', null);
  location.href = `${BASE}/conta/entrar/`;
});

// ------------------------------------------------------------------------------------------- entradas ao descer
if (matchMedia('(prefers-reduced-motion: no-preference)').matches && 'IntersectionObserver' in window) {
  const alvos = [...document.querySelectorAll('.seccao__cabeca, .seccao .fila, .monta-faixa, .pilulas, .grelha-produtos > *, [data-revelar]')]
    .filter((el) => el.getBoundingClientRect().top >= innerHeight && el.getBoundingClientRect().width > 0)
    .filter((el, _, todos) => !todos.some((o) => o !== el && o.contains(el)));
  const io = new IntersectionObserver((entradas) => {
    let d = 0;
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.style.setProperty('--d', `${Math.min(d, 0.5)}s`);
      e.target.classList.add('revelar--visto');
      d += 0.08;
      io.unobserve(e.target);
      e.target.addEventListener('transitionend', () => e.target.classList.remove('revelar', 'revelar--visto'), { once: true });
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  alvos.forEach((el) => { el.classList.add('revelar'); io.observe(el); });
}

pintarFavoritos();
pintarCarrinho();
pintarConta();
try {
  const pendente = sessionStorage.getItem('er:aviso');
  if (pendente) { sessionStorage.removeItem('er:aviso'); aviso(pendente); }
} catch { /* sem armazenamento */ }
