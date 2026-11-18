// Capa B: troca a fotografia do cenário pelo 3D ao vivo (depois de a página estar pronta) e muda as cores.
import { BASE } from './estado.js';

const zona = document.querySelector('[data-palco-3d]');
const contentor = zona?.querySelector('[data-visor]');
const botoes = zona ? [...zona.querySelectorAll('[data-paleta]')] : [];
let visor = null;
let paletaAtual = 'rosa';
let cenas = null;

function escolher(id) {
  paletaAtual = id;
  botoes.forEach((b) => b.setAttribute('aria-checked', b.dataset.paleta === id ? 'true' : 'false'));
  const poster = contentor.querySelector('.visor3d__poster');
  if (!visor && poster) {
    // sem 3D (ainda): troca a fotografia pela da mesma paleta
    poster.srcset = poster.srcset.replace(/palco-\w+-/g, `palco-${id}-`);
    poster.src = poster.src.replace(/palco-\w+-/, `palco-${id}-`);
    return;
  }
  if (visor && cenas) visor.trocar(cenas.palco(cenas.PALETAS_PALCO[id]), { reenquadrar: false });
}

zona?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-paleta]');
  if (b) escolher(b.dataset.paleta);
});
zona?.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key) || !e.target.closest('[data-paleta]')) return;
  e.preventDefault();
  const i = botoes.findIndex((b) => b.dataset.paleta === paletaAtual);
  const n = botoes[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + botoes.length) % botoes.length];
  escolher(n.dataset.paleta);
  n.focus();
});

async function arrancar() {
  const { temWebGL, criarVisor } = await import(`${BASE}/assets/3d/visor.js`);
  if (!temWebGL()) return;
  cenas = await import(`${BASE}/assets/3d/cenas.js`);
  window.__opentypeUrl = `${BASE}/assets/3d/opentype.module.js`;
  const p = cenas.PALETAS_PALCO[paletaAtual];
  visor = await criarVisor(contentor, { itens: cenas.palco(p), vista: { az: 14, el: 7, margem: 0.05 }, raiz: BASE });
}

if (zona && !navigator.connection?.saveData) {
  const quando = window.requestIdleCallback || ((f) => setTimeout(f, 300));
  addEventListener('load', () => quando(() => arrancar().catch((e) => console.warn('3D indisponível', e))), { once: true });
}
