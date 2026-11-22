// A página depois de pagar: o número, o que acontece a seguir e (sem conta) o convite para criar uma.
import { guardado, BASE } from './estado.js';
import { euros, dataLonga, dataCurta, janelaAluguer } from './regras.js';

const raiz = document.querySelector('[data-obrigado]');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

if (raiz) {
  const numero = decodeURIComponent(location.hash.slice(1)) || guardado('ultima-encomenda', null);
  const e = guardado('encomendas', []).find((x) => x.numero === numero);
  if (!e) {
    raiz.innerHTML = `<h1 class="pagina__titulo">Não encontrámos esta encomenda</h1><p>Se acabou de pagar, veja o email de confirmação ou <a href="${BASE}/contactos/">fale connosco</a>.</p>`;
  } else {
    const sessao = guardado('sessao', null);
    const primeiroNome = esc(e.nome.split(' ')[0]);
    const j = e.festa?.data ? janelaAluguer(e.festa.data) : null;
    const levantar = e.entrega.escolha === 'levantamento';
    const passos = [];
    if (e.pagamento.metodo === 'multibanco') passos.push(`Pague a referência Multibanco que enviámos para <strong>${esc(e.email)}</strong> nas próximas 48 horas.`);
    if (j) passos.push(levantar ? `Levanta as peças em Esposende <strong>${dataLonga(j.levantar)}</strong>. Marcamos a hora por SMS.` : `Entregamos <strong>${dataLonga(j.levantar)}</strong>, ${e.entrega.janela === 'tarde' ? 'à tarde' : 'de manhã'}${e.entrega.escolha === 'montagem' ? ', e deixamos tudo montado' : ''}.`);
    if (j) passos.push(levantar ? `Devolve <strong>${dataLonga(j.devolver)}</strong>. A caução volta em 2 dias úteis.` : `Recolhemos <strong>${dataLonga(j.devolver)}</strong>. A caução volta em 2 dias úteis.`);
    if (e.pagamento.falta > 0 && j) passos.push(`Faltam ${euros(e.pagamento.falta, { semCentimosRedondos: false })}, cobrados a ${dataCurta(new Date(new Date(e.festa.data).getTime() - 7 * 864e5).toISOString().slice(0, 10))}.`);
    if (e.linhas.some((l) => l.modo === 'compra')) passos.push('As peças compradas começam hoje a ser feitas. Avisamos quando estiverem prontas.');
    raiz.innerHTML = `<div class="obrigado__cabeca">
        <span class="obrigado__selo"><svg class="icone"><use href="#i-check"/></svg></span>
        <p class="sobretitulo">Encomenda ${esc(e.numero)}</p>
        <h1 class="pagina__titulo">Obrigado, ${primeiroNome}!</h1>
        <p class="pagina__frase">${e.estado === 'sinal' ? `O sinal de ${euros(e.pagamento.pago, { semCentimosRedondos: false })} está pago e a reserva está feita.` : 'O pagamento está feito.'} A confirmação seguiu para ${esc(e.email)}.</p>
      </div>
      <div class="obrigado__grelha">
        <section class="cartao-info"><h2>O que acontece agora</h2><ol class="passos-lista">${passos.map((p) => `<li>${p}</li>`).join('')}</ol></section>
        <section class="cartao-info"><h2>${e.festa?.nome ? esc(e.festa.nome) : 'A sua encomenda'}</h2><ul class="mini-linhas">${e.linhas.map((l) => `<li class="mini-linha"><span class="mini-linha__imagem"><img src="${l.img || `${BASE}/media/produtos/${l.id}/principal-${l.cor || 'base'}-480.webp`}"${l.img && !l.img.includes('/media/produtos/') ? ' class="img-foto"' : ''} alt="" width="56" height="70"><b>${l.qtd}</b></span><span><strong>${esc(l.nome)}</strong><small>${l.modo === 'aluguer' ? 'Aluguer' : 'Compra'}${l.corNome ? ' · ' + esc(l.corNome) : ''}</small></span><span>${euros(l.total)}</span></li>`).join('')}</ul><p class="obrigado__total">Total <strong>${euros(e.totais.total, { semCentimosRedondos: false })}</strong></p></section>
      </div>
      ${sessao ? `<p class="obrigado__fim"><a class="botao botao--verde" href="${BASE}/conta/#encomendas">Ver na minha conta</a></p>`
        : `<section class="convite-conta"><h2>Guarde esta festa na sua conta</h2><p>Para acompanhar a encomenda, repetir a festa para o ano e ter 10 % na próxima.</p><a class="botao botao--verde" href="${BASE}/conta/criar/#da-encomenda">Criar conta</a></section>`}`;
  }
}
