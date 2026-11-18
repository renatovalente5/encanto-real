// O calendário da data da festa: uma janela com o mês, os dias livres e os esgotados (de uma peça), o
// levantamento e a devolução, e o desconto dos dias de semana. Devolve a data escolhida (ou null).
import { iso, deIso, somarDias, primeiraDataPossivel, janelaAluguer, dataLonga, disponiveis, NOMES_MESES, eDiaDeSemana } from './regras.js';

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function escolherData({ produto = null, atual = null, titulo = 'Data da festa', antecedencia = 3, descontoSemana = 15 } = {}) {
  return new Promise((resolver) => {
    const minimo = primeiraDataPossivel(iso(new Date()), antecedencia);
    let escolhida = atual && atual >= minimo ? atual : null;
    let mes = deIso(escolhida || minimo);
    mes.setDate(1);
    const d = document.createElement('dialog');
    d.className = 'calendario';
    d.setAttribute('aria-labelledby', 'cal-titulo');
    document.body.append(d);

    function estadoDe(dia) {
      if (dia < minimo) return 'passado';
      if (!produto) return 'livre';
      const n = disponiveis(produto, dia);
      if (n <= 0) return 'esgotado';
      if (n === 1 && (produto.aluguer?.stock || 0) > 1) return 'pouco';
      return 'livre';
    }

    function desenhar(foco) {
      const ano = mes.getFullYear(), m = mes.getMonth();
      const primeiro = new Date(ano, m, 1, 12);
      const desvio = (primeiro.getDay() + 6) % 7; // segunda = 0
      const diasNoMes = new Date(ano, m + 1, 0).getDate();
      const anterior = iso(new Date(ano, m, 0, 12)) >= minimo.slice(0, 8) + '01' || iso(new Date(ano, m, 1, 12)) > minimo;
      let celulas = '';
      for (let i = 0; i < desvio; i++) celulas += '<span class="calendario__vazio"></span>';
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const s = iso(new Date(ano, m, dia, 12));
        const e = estadoDe(s);
        const semana = eDiaDeSemana(s) && e !== 'passado';
        const rotulo = `${dataLonga(s)}${e === 'esgotado' ? ', esgotado' : e === 'pouco' ? ', última unidade' : e === 'passado' ? ', indisponível' : ''}${semana ? `, ${descontoSemana} % de desconto` : ''}`;
        celulas += `<button type="button" class="calendario__dia calendario__dia--${e}${semana ? ' calendario__dia--semana' : ''}" data-dia="${s}" aria-label="${rotulo}" aria-pressed="${s === escolhida}"${e === 'passado' || e === 'esgotado' ? ' disabled' : ''} tabindex="${s === (foco || escolhida) ? 0 : -1}">${dia}</button>`;
      }
      const j = escolhida ? janelaAluguer(escolhida) : null;
      d.innerHTML = `<div class="calendario__caixa">
        <div class="calendario__topo">
          <h2 id="cal-titulo">${titulo}</h2>
          <button type="button" class="topo__botao" data-cal-fechar aria-label="Fechar"><svg class="icone"><use href="#i-fechar"/></svg></button>
        </div>
        <div class="calendario__mes">
          <button type="button" class="botao-redondo" data-cal-mes="-1" aria-label="Mês anterior"${anterior ? '' : ' disabled'}><svg class="icone"><use href="#i-chevronEsq"/></svg></button>
          <strong aria-live="polite">${NOMES_MESES[m]} ${ano}</strong>
          <button type="button" class="botao-redondo" data-cal-mes="1" aria-label="Mês seguinte"><svg class="icone"><use href="#i-chevron"/></svg></button>
        </div>
        <div class="calendario__grelha" role="group" aria-label="${NOMES_MESES[m]} ${ano}">
          ${DIAS.map((x) => `<span class="calendario__semana" aria-hidden="true">${x}</span>`).join('')}
          ${celulas}
        </div>
        <ul class="calendario__legenda">
          <li><span class="ponto ponto--semana"></span>De segunda a quinta: −${descontoSemana} % no aluguer</li>
          ${produto ? '<li><span class="ponto ponto--esgotado"></span>Esgotado</li>' : ''}
        </ul>
        <div class="calendario__fim">
          <p data-cal-resumo>${j ? `Levanta <strong>${dataLonga(j.levantar)}</strong> e devolve <strong>${dataLonga(j.devolver)}</strong>.` : `Reservas a partir de ${dataLonga(minimo)}.`}</p>
          <button type="button" class="botao botao--verde" data-cal-ok${escolhida ? '' : ' disabled'}>${escolhida ? 'Escolher ' + dataLonga(escolhida).split(', ')[1] : 'Escolha um dia'}</button>
        </div>
      </div>`;
      const alvo = d.querySelector(`[data-dia="${foco || escolhida}"]`) || d.querySelector('.calendario__dia:not([disabled])');
      if (alvo) alvo.tabIndex = 0;
      if (foco && alvo) alvo.focus();
    }

    function fechar(valor) {
      d.close();
      d.remove();
      resolver(valor);
    }

    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('[data-cal-fechar]')) return fechar(null);
      const b = e.target.closest('[data-dia]');
      if (b && !b.disabled) { escolhida = b.dataset.dia; desenhar(escolhida); return; }
      const nav = e.target.closest('[data-cal-mes]');
      if (nav && !nav.disabled) { mes.setMonth(mes.getMonth() + Number(nav.dataset.calMes)); desenhar(); return; }
      if (e.target.closest('[data-cal-ok]') && escolhida) fechar(escolhida);
    });
    d.addEventListener('keydown', (e) => {
      const b = e.target.closest('[data-dia]');
      if (!b) return;
      const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (!(e.key in passos)) return;
      e.preventDefault();
      let alvo = somarDias(b.dataset.dia, passos[e.key]);
      if (alvo < minimo) return;
      const dt = deIso(alvo);
      if (dt.getMonth() !== mes.getMonth()) { mes = new Date(dt.getFullYear(), dt.getMonth(), 1, 12); }
      desenhar(alvo);
    });
    d.addEventListener('cancel', (e) => { e.preventDefault(); fechar(null); });
    desenhar();
    d.showModal();
    (d.querySelector('[aria-pressed="true"]') || d.querySelector('.calendario__dia:not([disabled])'))?.focus();
  });
}
