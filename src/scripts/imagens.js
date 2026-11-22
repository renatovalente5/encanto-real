// A imagem de uma peça no browser: a do estúdio 3D na cor pedida, ou, numa peça sem 3D (as que se criam no painel, com
// fotografias), a primeira fotografia. A mesma escolha do gerador (imgProduto em src/templates/base.mjs).
import { BASE } from './estado.js';

export function srcDaPeca(p, cor, w = 480) {
  if (p?.imagem?.tipo === 'foto') {
    const f = p.imagem.ficheiros;
    return `${BASE}/assets/fotos/${f[String(w)] || f['480']}`;
  }
  const c = !p || p.cor === 'base' ? 'base' : (cor || p.cor);
  return `${BASE}/media/produtos/${p?.id}/principal-${c}-${w}.webp`;
}

// o resto do <img> de uma fotografia (cortada à volta do ponto de foco); vazio numa imagem do estúdio
export const extraDaImagem = (p) => (p?.imagem?.tipo === 'foto' ? ` class="img-foto" style="object-position:${p.imagem.foco || '50% 50%'}"` : '');
