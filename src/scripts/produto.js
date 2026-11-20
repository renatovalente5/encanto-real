// A ficha de uma peça: alugar ou comprar, cores, tamanhos, número, nome, data da festa (com a disponibilidade),
// o 3D ao vivo, juntar ao carrinho, vistos há pouco e partilhar.
import { guardado, guardar, BASE, catalogo, aviso, ouvir } from './estado.js';
import { precoUnitario, euros, disponiveis, janelaAluguer, dataLonga, dataCurta, eDiaDeSemana, DESCONTO_SEMANA, iso, deIso, primeiraDataPossivel } from './regras.js';
import { escolherData } from './calendario.js';
import { juntar } from './carrinho.js';
import { cartaoHtml, pintarFavoritosEm } from './cartoes.js';

const ficha = document.querySelector('[data-ficha]');
const form = ficha?.querySelector('[data-compra]');
// os dados da peça vêm na própria página: a ficha funciona ao primeiro toque, sem esperar pela rede
const prodDaPagina = JSON.parse(document.getElementById('dados-ficha')?.textContent || 'null');

function diasUteisDepois(n, de = new Date()) {
  const d = new Date(de);
  let k = 0;
  while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) k++; }
  return iso(d);
}

function iniciar() {
  const prod = prodDaPagina;
  if (!prod || !form) return;
  const $ = (s) => form.querySelector(s);
  const imagem = ficha.querySelector('.galeria__imagem');
  const contentor3d = ficha.querySelector('[data-visor]');
  let visor = null;
  let vistaAtual = 'principal';

  const estado = () => {
    const fd = new FormData(form);
    return {
      modo: fd.get('modo') || (prod.aluguer ? 'aluguer' : 'compra'),
      cor: fd.get('cor') || prod.cor,
      tamanho: fd.get('tamanho') || prod.tamanhos?.[0]?.id || null,
      digito: fd.has('digito') ? Number(fd.get('digito')) : null,
      texto: (fd.get('texto') || '').trim() || null,
      qtd: Math.max(1, Number(fd.get('qtd')) || 1),
    };
  };

  // ----------------------------------------------------------------- imagem principal e miniaturas
  const srcDe = (vista, cor, w) => `${BASE}/media/produtos/${prod.id}/${vista}-${cor}-${w}.webp`;
  function mostrarImagem(vista, cor) {
    vistaAtual = vista;
    const c = vista === 'principal' ? cor : prod.cor;
    imagem.src = srcDe(vista, c, 800);
    imagem.srcset = [480, 800, 1200].map((w) => `${srcDe(vista, c, w)} ${w}w`).join(', ');
    imagem.classList.toggle('galeria__imagem--larga', vista === 'escala');
    imagem.hidden = false;
    contentor3d.hidden = true;
    ficha.querySelector('[data-dica-3d]').hidden = true;
    ficha.querySelector('[data-ver-3d]').hidden = false;
    ficha.querySelectorAll('[data-vista]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.vista === vista ? 'true' : 'false'));
  }

  // ----------------------------------------------------------------- 3D
  async function itensAtuais() {
    const { itensDe } = await import(`${BASE}/assets/3d/itens.js`);
    const e = estado();
    return itensDe(prod3d, e.cor, e);
  }
  let prod3d = null;
  async function abrir3d() {
    vistaAtual = '3d';
    ficha.querySelectorAll('[data-vista]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.vista === '3d' ? 'true' : 'false'));
    contentor3d.hidden = false;
    imagem.hidden = true;
    ficha.querySelector('[data-ver-3d]').hidden = true;
    if (visor) return;
    contentor3d.classList.add('visor3d--a-carregar');
    try {
      const m = await import(`${BASE}/assets/3d/visor.js`);
      if (!m.temWebGL()) throw new Error('sem WebGL');
      window.__opentypeUrl = `${BASE}/assets/3d/opentype.module.js`;
      prod3d = await (await fetch(`${BASE}/assets/3d/produtos/${prod.id}.json`)).json();
      visor = await m.criarVisor(contentor3d, { itens: await itensAtuais(), vista: { ...(prod3d.vista || {}), margem: 0.1 }, raiz: BASE });
      ficha.querySelector('[data-dica-3d]').hidden = false;
    } catch (err) {
      console.warn(err);
      aviso('O 3D não abre neste aparelho. Ficam as fotografias.');
      mostrarImagem('principal', estado().cor);
    } finally {
      contentor3d.classList.remove('visor3d--a-carregar');
    }
  }
  let espera3d;
  function atualizar3d(reenquadrar = false) {
    if (!visor) return;
    clearTimeout(espera3d);
    espera3d = setTimeout(async () => visor.trocar(await itensAtuais(), { reenquadrar }), 250);
  }

  ficha.addEventListener('click', (e) => {
    const v = e.target.closest('[data-vista]');
    if (v) { if (v.dataset.vista === '3d') abrir3d(); else mostrarImagem(v.dataset.vista, estado().cor); }
    if (e.target.closest('[data-ver-3d]')) abrir3d();
  });

  // ----------------------------------------------------------------- preços, modo, disponibilidade
  function atualizar() {
    const e = estado();
    const f = guardado('festa', null);
    // preços por modo (dependem do tamanho e do nome)
    for (const m of ['aluguer', 'compra']) {
      const el = form.querySelector(`[data-preco="${m}"]`);
      const p = precoUnitario(prod, m, e);
      if (el && p != null) el.textContent = euros(p);
    }
    form.querySelectorAll('[data-so-modo]').forEach((el) => { el.hidden = el.dataset.soModo !== e.modo; });
    const notaPreco = form.querySelector('[data-nota-preco]');
    if (notaPreco && prod.personalizavel && prod.venda?.porLetra) {
      const n = (e.texto || '').replace(/\s+/g, '').length;
      notaPreco.textContent = n ? `com ${n} ${n === 1 ? 'letra' : 'letras'}` : '';
    }
    // cor
    const corInput = form.querySelector('input[name="cor"]:checked');
    if (corInput) form.querySelector('[data-nome-cor]').textContent = corInput.dataset.nome;
    const dig = form.querySelector('[data-nome-digito]');
    if (dig && e.digito != null) dig.textContent = e.digito;
    // data da festa e disponibilidade
    const btnData = form.querySelector('[data-data-texto]');
    const disp = form.querySelector('[data-disponibilidade]');
    let podeReservar = true;
    if (btnData) {
      if (f) {
        const j = janelaAluguer(f);
        btnData.textContent = dataLonga(f);
        form.querySelector('[data-janela]').textContent = `Levanta ${dataCurta(j.levantar)} · devolve ${dataCurta(j.devolver)}`;
        const n = disponiveis(prod, f);
        if (n <= 0) {
          disp.className = 'disponibilidade disponibilidade--esgotado';
          disp.textContent = 'Esgotado nesse dia. Escolha outra data ou veja um cenário parecido.';
          podeReservar = false;
        } else {
          disp.className = 'disponibilidade disponibilidade--livre';
          disp.textContent = `Livre nesse dia${n === 1 ? ': é a última unidade' : ''}.${eDiaDeSemana(f) ? ` E com −${DESCONTO_SEMANA} % por ser dia de semana.` : ''}`;
        }
      } else {
        btnData.textContent = 'Escolher a data';
        form.querySelector('[data-janela]').textContent = 'Levanta na véspera e devolve no dia a seguir';
        disp.textContent = '';
      }
    }
    const qtd = form.querySelector('[name="qtd"]');
    if (e.modo === 'aluguer' && f) qtd.max = Math.max(1, disponiveis(prod, f));
    else qtd.max = 20;
    if (Number(qtd.value) > Number(qtd.max)) qtd.value = qtd.max;
    // chega a tempo? (compra)
    const tempo = form.querySelector('[data-chega-a-tempo]');
    if (tempo) {
      if (f && prod.venda) {
        const pronta = diasUteisDepois(prod.venda.prazo);
        tempo.textContent = pronta <= f ? `Fica pronta a tempo da festa de ${dataCurta(f)}.` : `Não chega a tempo da festa de ${dataCurta(f)}${prod.aluguer ? ': alugue-a para esse dia' : ''}.`;
        tempo.className = pronta <= f ? 'a-tempo' : 'fora-de-tempo';
      } else tempo.textContent = '';
    }
    // botão
    const unit = precoUnitario(prod, e.modo, e) || 0;
    const total = unit * e.qtd;
    const botao = form.querySelector('[data-botao-juntar]');
    botao.textContent = e.modo === 'aluguer'
      ? (f ? (podeReservar ? `Reservar para ${dataCurta(f)} · ${euros(total)}` : 'Esgotado nesse dia') : 'Escolher a data e reservar')
      : `Juntar ao carrinho · ${euros(total)}`;
    botao.disabled = e.modo === 'aluguer' && f && !podeReservar;
    const bp = document.querySelector('[data-barra-preco]');
    if (bp) bp.textContent = `${euros(unit)}${e.modo === 'aluguer' ? ' por evento' : ''}`;
  }

  form.addEventListener('change', (e) => {
    const n = e.target.name;
    if (n === 'cor' && vistaAtual === 'principal') mostrarImagem('principal', e.target.value);
    // o número escolhido só se vê em 3D (as fotografias são do «1»)
    if (n === 'digito' && vistaAtual !== '3d') abrir3d();
    else if (['cor', 'tamanho', 'digito'].includes(n) && vistaAtual === '3d') atualizar3d(n !== 'cor');
    atualizar();
  });
  form.addEventListener('input', (e) => {
    if (e.target.name === 'texto') {
      atualizar();
      if (vistaAtual !== '3d') abrir3d(); else atualizar3d(true);
    }
    if (e.target.name === 'qtd') atualizar();
  });
  form.querySelector('[data-quantidade]')?.addEventListener('click', (e) => {
    const q = form.querySelector('[name="qtd"]');
    if (e.target.closest('[data-menos]')) q.value = Math.max(1, Number(q.value) - 1);
    if (e.target.closest('[data-mais]')) q.value = Math.min(Number(q.max) || 20, Number(q.value) + 1);
    atualizar();
  });
  form.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-abrir-calendario]')) return;
    const nova = await escolherData({ produto: prod, atual: guardado('festa', null) });
    if (nova) guardar('festa', nova);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const est = estado();
    const erro = form.querySelector('[data-erro]');
    erro.hidden = true;
    if (est.modo === 'aluguer' && !guardado('festa', null)) {
      const nova = await escolherData({ produto: prod, atual: null });
      if (!nova) return;
      guardar('festa', nova);
      if (disponiveis(prod, nova) <= 0) return;
    }
    if (prod.personalizavel && !est.texto) {
      erro.textContent = prod.venda?.porLetra ? 'Escreva o nome que quer em MDF.' : 'Escreva o nome que quer na peça.';
      erro.hidden = false;
      form.querySelector('[data-texto]').focus();
      return;
    }
    juntar({ id: prod.id, modo: est.modo, cor: est.cor, tamanho: prod.tamanhos ? est.tamanho : null, digito: prod.digitos ? est.digito : null, texto: prod.personalizavel ? est.texto : null, qtd: est.qtd });
    window.abrirGaveta?.('carrinho');
  });

  ouvir((chave) => { if (chave === 'festa') atualizar(); });
  atualizar();

  // ----------------------------------------------------------------- barra de compra no telemóvel
  const barra = document.querySelector('[data-barra-compra]');
  const botaoPrincipal = form.querySelector('[data-botao-juntar]');
  if (barra && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      const passou = !en.isIntersecting && en.boundingClientRect.top < 0;
      barra.hidden = !passou || innerWidth >= 900;
    }).observe(botaoPrincipal);
    barra.querySelector('[data-barra-botao]').addEventListener('click', () => {
      form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  }

  // ----------------------------------------------------------------- partilhar
  ficha.querySelector('[data-partilhar]')?.addEventListener('click', async () => {
    const dados = { title: `${prod.nome} · Encanto Real`, url: location.href.split('#')[0] };
    try {
      if (navigator.share) await navigator.share(dados);
      else { await navigator.clipboard.writeText(dados.url); aviso('Ligação copiada'); }
    } catch { /* cancelado */ }
  });

  // ----------------------------------------------------------------- vistos há pouco (o catálogo chega depois)
  const anteriores = guardado('vistos', []).filter((x) => x !== prod.id);
  guardar('vistos', [prod.id, ...anteriores].slice(0, 12));
  if (anteriores.length) {
    catalogo().then((cat) => {
      const vistos = anteriores.filter((x) => cat.porId[x]);
      if (!vistos.length) return;
      const sec = ficha.querySelector('[data-vistos]');
      const lista = sec.querySelector('[data-vistos-lista]');
      lista.innerHTML = vistos.slice(0, 8).map((x) => cartaoHtml(cat.porId[x])).join('');
      pintarFavoritosEm(lista, guardado('favoritos', []));
      sec.hidden = false;
    });
  }
}

iniciar();
