// Ícones (24×24, traço 1,5): desenhados aqui, num sprite que vai no topo de cada página.
import { raw } from '../lib/html.mjs';

const I = {
  procurar: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  coracao: '<path d="M12 20.2c-.3 0-.5-.1-.7-.3C8.3 17.5 4 14.2 4 9.8 4 7.3 6 5.3 8.4 5.3c1.5 0 2.8.7 3.6 1.9.8-1.2 2.1-1.9 3.6-1.9C18 5.3 20 7.3 20 9.8c0 4.4-4.3 7.7-7.3 10.1-.2.2-.4.3-.7.3z"/>',
  saco: '<path d="M5.5 8.5h13l-1.1 11.2a1.5 1.5 0 0 1-1.5 1.3H8.1a1.5 1.5 0 0 1-1.5-1.3L5.5 8.5z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
  pessoa: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20.2c1.1-3.6 3.9-5.4 7.2-5.4s6.1 1.8 7.2 5.4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  setaEsq: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevron: '<path d="M9.5 6l6 6-6 6"/>',
  chevronEsq: '<path d="M14.5 6l-6 6 6 6"/>',
  chevronBaixo: '<path d="M6 9.5l6 6 6-6"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  camiao: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4.2l3.3 3.4v3.1h-7.5"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  escudo: '<path d="M12 3l7 2.8v5.4c0 4.3-2.9 7.7-7 9.8-4.1-2.1-7-5.5-7-9.8V5.8L12 3z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
  cubo: '<path d="M12 2.8l8 4.5v9.4l-8 4.5-8-4.5V7.3l8-4.5z"/><path d="M12 12l8-4.6M12 12v9.2M12 12L4 7.4"/>',
  girar: '<path d="M20 12.5a8 8 0 1 1-2.4-5.8"/><path d="M20 4.5v4.2h-4.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  lixo: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/>',
  partilhar: '<path d="M12 3.5v11M7.5 8L12 3.5 16.5 8M5 13.5v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  regua: '<path d="M3.5 15.5L15.5 3.5l5 5-12 12-5-5z"/><path d="M7 12l2 2M10 9l1.5 1.5M13 6l2 2"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  etiqueta: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0L3.5 12.2z"/><circle cx="8.3" cy="8.3" r="1.4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
  casa: '<path d="M3.5 10.5L12 4l8.5 6.5V20H14.5v-5.5h-5V20H3.5z"/>',
  pacote: '<path d="M12 3l8 4v10l-8 4-8-4V7l8-4z"/><path d="M4 7l8 4 8-4M12 11v10M8 5l8 4"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  email: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  sair: '<path d="M14 4.5h4.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h10"/>',
  whatsapp: '<path d="M4.5 19.5l1.2-3.7A8 8 0 1 1 8.6 18.6L4.5 19.5z"/><path d="M9.2 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.1.3 0 .5.5.9 1.3 1.7 2.3 2.2.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .5-.2 1.1-.7 1.4-.6.4-1.5.5-2.6.1-1.9-.7-3.6-2.3-4.4-4.1-.4-1-.5-2-.1-2.6z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8v.1"/>',
  facebook: '<path d="M14 21v-7.5h2.6l.4-3H14V8.6c0-.9.3-1.5 1.5-1.5H17V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9v2.3H8.5v3H11V21"/>',
  livro: '<path d="M4.5 5.5c2.5-1 5-1 7.5.5v13c-2.5-1.5-5-1.5-7.5-.5v-13zM19.5 5.5c-2.5-1-5-1-7.5.5v13c2.5-1.5 5-1.5 7.5-.5v-13z"/>',
  estrela: '<path d="M12 3.8l2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.8l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6L12 3.8z"/>',
  festa: '<path d="M4 20l4.5-12 7.5 7.5L4 20z"/><path d="M14.5 4.5c0 1.5 1 2 2 2M19.5 9.5c-1.5 0-2 1-2 2M17 3v1.5M21 7h-1.5"/>',
  copiar: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  tela: '<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M8.5 20h7M12 17v3"/>',
};

export function sprite() {
  return raw(`<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs>${Object.entries(I)
    .map(([id, d]) => `<symbol id="i-${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`)
    .join('')}</defs></svg>`);
}

export function icone(nome, classe = 'icone') {
  if (!I[nome]) throw new Error('ícone desconhecido: ' + nome);
  return raw(`<svg class="${classe}" aria-hidden="true" focusable="false"><use href="#i-${nome}"/></svg>`);
}

export const NOMES_ICONES = Object.keys(I);
