// O que fica guardado neste browser (carrinho, favoritos, conta de pré-visualização), o catálogo e os avisos.
// Na loja a sério, a conta e as encomendas vivem no servidor; o carrinho e os favoritos continuam aqui.
export const BASE = document.documentElement.dataset.base || '';
const PREFIXO = 'er:';
const ouvintes = new Set();

export function guardado(chave, padrao) {
  try {
    const v = localStorage.getItem(PREFIXO + chave);
    return v == null ? padrao : JSON.parse(v);
  } catch { return padrao; }
}

export function guardar(chave, valor) {
  try {
    if (valor == null) localStorage.removeItem(PREFIXO + chave);
    else localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch { /* sem armazenamento (modo privado): segue sem guardar */ }
  ouvintes.forEach((f) => f(chave, valor));
}

export function ouvir(f) { ouvintes.add(f); return () => ouvintes.delete(f); }

// Escrever num elemento só quando o texto muda, e no nó de texto que já lá está. Sair de um campo dispara «change»;
// se isso reescrever o botão em que se está a tocar («Juntar ao carrinho», «Pagar»), o Safari (também no iPhone)
// perde o clique: o nó por baixo do dedo saiu da página entre o toque e o largar, e era preciso tocar outra vez.
export function escreverTexto(el, texto) {
  if (!el) return;
  const t = String(texto ?? '');
  if (el.textContent === t) return;
  if (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE) el.firstChild.data = t;
  else el.textContent = t;
}

// O mesmo para blocos em HTML: só se refazem quando mudam (o resto do tempo ficam os mesmos nós).
const htmlEscrito = new WeakMap();
export function escreverHtml(el, html) {
  if (!el || htmlEscrito.get(el) === html) return;
  htmlEscrito.set(el, html);
  el.innerHTML = html;
}

// outra aba mudou alguma coisa
addEventListener('storage', (e) => {
  if (!e.key?.startsWith(PREFIXO)) return;
  const chave = e.key.slice(PREFIXO.length);
  ouvintes.forEach((f) => f(chave, guardado(chave, null)));
});

let pedidoCatalogo = null;
export function catalogo() {
  pedidoCatalogo ||= fetch(`${BASE}/assets/catalogo.json?v=${document.documentElement.dataset.v || ''}`).then((r) => r.json()).then((c) => {
    c.porId = Object.fromEntries(c.produtos.map((p) => [p.id, p]));
    return c;
  });
  return pedidoCatalogo;
}

let temporizador;
export function aviso(texto, { acao, href, fn, ms = 4200 } = {}) {
  const el = document.querySelector('[data-aviso]');
  if (!el) return;
  clearTimeout(temporizador);
  el.replaceChildren(Object.assign(document.createElement('span'), { textContent: texto }));
  if (acao) {
    const b = document.createElement(href ? 'a' : 'button');
    b.textContent = acao;
    if (href) { b.href = href; b.style.color = 'inherit'; b.style.fontWeight = '700'; } else { b.type = 'button'; b.addEventListener('click', () => { fn?.(); el.hidden = true; }); }
    el.append(b);
  }
  el.hidden = false;
  temporizador = setTimeout(() => { el.hidden = true; }, ms);
}
