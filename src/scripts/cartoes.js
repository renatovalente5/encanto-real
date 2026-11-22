// O cartão de produto desenhado no browser (vistos há pouco, favoritos, montar): igual ao do gerador.
import { BASE } from './estado.js';
import { euros, precoDesde } from './regras.js';
import { srcDaPeca, extraDaImagem } from './imagens.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function info(p) {
  if (p.categoria === 'cenarios') return `${p.componentes?.length || 0} peças a condizer`;
  const partes = [];
  if (p.aluguer && p.venda) partes.push(`Compra ${euros(precoDesde(p, 'compra'))}`);
  else if (!p.aluguer) partes.push(p.personalizavel ? 'Personalizado · só venda' : 'Só venda');
  const n = p.combinacoes?.length || p.cores?.length || 0;
  if (n > 1) partes.push(`${n} ${p.combinacoes ? 'combinações' : 'cores'}`);
  return partes.join(' · ');
}

export function cartaoHtml(p, { cor = p.cor } = {}) {
  const alugar = !!p.aluguer;
  const preco = alugar ? precoDesde(p, 'aluguer') : precoDesde(p, 'compra');
  const src = (w) => srcDaPeca(p, cor, w);
  return `<article class="cartao" data-produto="${p.id}">
  <div class="cartao__imagem" style="--fundo:var(--azulejo-${p.fundo || 'areia'})">
    <img src="${src(800)}" srcset="${src(480)} 480w, ${src(800)} 800w" sizes="(min-width: 1100px) 22vw, 44vw" width="800" height="1000"${extraDaImagem(p)} alt="${esc(p.nome)}" loading="lazy" decoding="async">
    ${p.selo ? `<span class="cartao__selo">${esc(p.selo)}</span>` : ''}
    <span class="cartao__preco">${p.tamanhos?.length > 1 ? '<small>desde </small>' : ''}<strong>${euros(preco)}</strong>${alugar ? '<small>/evento</small>' : ''}</span>
    <button class="cartao__favorito" type="button" data-favorito="${p.id}" aria-pressed="false" aria-label="Guardar ${esc(p.nome)} nos favoritos"><svg class="icone" aria-hidden="true"><use href="#i-coracao"/></svg></button>
  </div>
  <h3 class="cartao__nome"><a href="${BASE}/loja/${p.id}/">${esc(p.nome)}</a></h3>
  <p class="cartao__info">${esc(info(p))}</p>
</article>`;
}

export function pintarFavoritosEm(raiz, favoritos) {
  const f = new Set(favoritos);
  raiz.querySelectorAll('[data-favorito]').forEach((b) => b.setAttribute('aria-pressed', f.has(b.dataset.favorito) ? 'true' : 'false'));
}
