// Favoritos: a lista deste browser, e a partilha por ligação (#f=id1,id2) para a família ou os padrinhos.
import { guardado, guardar, catalogo, aviso, ouvir } from './estado.js';
import { cartaoHtml, pintarFavoritosEm } from './cartoes.js';

const raiz = document.querySelector('[data-favoritos-pagina]');

async function desenhar() {
  const cat = await catalogo();
  const partilhada = new URLSearchParams(location.hash.slice(1)).get('f');
  const ids = (partilhada ? partilhada.split(',') : guardado('favoritos', [])).filter((id) => cat.porId[id]);
  const lista = raiz.querySelector('[data-lista-favoritos]');
  lista.innerHTML = ids.map((id) => cartaoHtml(cat.porId[id])).join('');
  pintarFavoritosEm(lista, guardado('favoritos', []));
  raiz.querySelector('[data-vazio]').hidden = ids.length > 0;
  const partilhar = raiz.querySelector('[data-partilhar-lista]');
  partilhar.hidden = !ids.length;
  if (partilhada) {
    raiz.querySelector('[data-frase-favoritos]').textContent = 'Uma lista de peças que lhe enviaram.';
    partilhar.textContent = 'Guardar todas';
    partilhar.dataset.guardar = '1';
  }
}

if (raiz) {
  raiz.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-partilhar-lista]');
    if (!b) return;
    if (b.dataset.guardar) {
      const ids = new URLSearchParams(location.hash.slice(1)).get('f').split(',');
      guardar('favoritos', [...new Set([...ids, ...guardado('favoritos', [])])]);
      history.replaceState(null, '', location.pathname);
      aviso('Guardadas nos seus favoritos');
      desenhar();
      return;
    }
    const url = `${location.origin}${location.pathname}#f=${guardado('favoritos', []).join(',')}`;
    try {
      if (navigator.share) await navigator.share({ title: 'A minha lista de festa · Encanto Real', url });
      else { await navigator.clipboard.writeText(url); aviso('Ligação da lista copiada'); }
    } catch { /* cancelado */ }
  });
  ouvir((chave) => { if (chave === 'favoritos' && !location.hash.includes('f=')) desenhar(); });
  addEventListener('hashchange', desenhar);
  desenhar();
}
