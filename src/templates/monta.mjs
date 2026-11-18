// «Monta o teu cenário»: escolher peças e cores, ver em 3D, somar o preço e juntar tudo ao carrinho.
import { h, attrs, json } from '../lib/html.mjs';
import { icone } from './icones.mjs';
import { u, pagina, imgCena } from './base.mjs';
import { ACABAMENTOS } from '../3d/acabamentos.js';

// cada escolha: que produto da loja é, que modelo 3D, onde fica
export const ESCOLHAS = {
  fundo: [
    { id: 'arco-triplo', produto: 'arco-triplo-real', nome: 'Arco triplo' },
    { id: 'arco-duplo', produto: 'arco-duplo', nome: 'Arco duplo' },
    { id: 'arco-simples', produto: 'arco-simples', nome: 'Arco simples' },
    { id: 'painel-redondo', produto: 'painel-redondo', nome: 'Painel redondo', tamanho: '150' },
    { id: 'painel-romano', produto: 'painel-romano', nome: 'Painel romano' },
    { id: 'nenhum', nome: 'Sem fundo' },
  ],
  pedestais: [
    { id: 'trio-cilindros', produto: 'trio-cilindros', nome: 'Trio de cilindros' },
    { id: 'cilindro-vazado', produto: 'cilindro-vazado', nome: 'Cilindro vazado' },
    { id: 'os-dois', nome: 'Os dois' },
    { id: 'nenhum', nome: 'Nenhum' },
  ],
  mesa: [
    { id: 'mesa-ripas', produto: 'mesa-ripas', nome: 'Mesa de ripas' },
    { id: 'aparador-arco', produto: 'aparador-arco', nome: 'Aparador em arco' },
    { id: 'nenhuma', nome: 'Nenhuma' },
  ],
  detalhes: [
    { id: 'borboleta', produto: 'borboleta-rendada', nome: 'Borboleta' },
    { id: 'coroa', produto: 'coroa-real', nome: 'Coroa' },
    { id: 'nuvem', produto: 'nuvem', nome: 'Nuvem' },
    { id: 'lua', produto: 'lua-e-estrela', nome: 'Lua e estrela' },
    { id: 'numero', produto: 'numero-gigante', nome: 'Número' },
  ],
};

function amostras(ctx, grupo, prodId, atual) {
  const p = ctx.dados.porId[prodId];
  const cores = p?.cores || [];
  return h`<div class="amostras amostras--monta" data-cores="${grupo}">
    ${cores.map((c) => h`<label class="amostra-opcao" title="${ACABAMENTOS[c].nome}"><input type="radio" name="cor-${grupo}" value="${c}"${attrs({ checked: c === atual })}><span class="amostra amostra--grande" style="--amostra:${ACABAMENTOS[c].hex}"></span><span class="so-leitor">${ACABAMENTOS[c].nome}</span></label>`)}
  </div>`;
}

function grupoEscolha(ctx, { grupo, titulo, n, lista, atual, tipo = 'radio' }) {
  return h`<fieldset class="passo-monta" data-grupo="${grupo}">
  <legend><span class="passo-monta__n">${n}</span>${titulo}</legend>
  <div class="escolhas">
    ${lista.map((e) => {
      const p = e.produto ? ctx.dados.porId[e.produto] : null;
      return h`<label class="escolha">
        <input type="${tipo}" name="${grupo}" value="${e.id}"${attrs({ checked: tipo === 'radio' ? e.id === atual : (atual || []).includes(e.id) })}>
        <span class="escolha__corpo">
          ${p ? h`<img src="${u(ctx, `/media/produtos/${p.id}/principal-${p.cor}-480.webp`)}" alt="" width="96" height="120" loading="lazy" style="--fundo:var(--azulejo-${p.fundo || 'areia'})">` : h`<span class="escolha__nada">${icone('fechar')}</span>`}
          <span class="escolha__nome">${e.nome}</span>
        </span>
      </label>`;
    })}
  </div>
  ${grupo === 'detalhes' ? h`<div class="monta__digito" data-digito hidden><label for="monta-digito">Que número?</label><select id="monta-digito" class="campo campo--pequeno" name="digito">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => h`<option value="${d}">${d}</option>`)}</select></div>` : ''}
</fieldset>`;
}

export function gerarMonta(ctx) {
  const P = ctx.dados.porId;
  const config = {
    escolhas: ESCOLHAS,
    produtos: Object.fromEntries(Object.values(ESCOLHAS).flat().filter((e) => e.produto).map((e) => [e.produto, { cores: P[e.produto].cores, cor: P[e.produto].cor }])),
  };
  const corpo = h`<div class="contentor monta" data-monta>
  <header class="pagina__cabeca">
    <h1 class="pagina__titulo">Monta o teu cenário</h1>
    <p class="pagina__frase">Escolha as peças e as cores e veja tudo montado. O preço acompanha cada escolha.</p>
  </header>
  <div class="monta__grelha">
    <div class="monta__palco">
      <div class="monta__palco-fixo">
        <div class="visor3d visor3d--monta" data-visor>
          ${imgCena(ctx, 'palco-branco', 'quadrado', { sizes: '(min-width: 1000px) 56vw, 100vw', prioridade: true, alt: 'Cenário de exemplo: arco triplo branco, balões, cilindros e mesa de ripas', classe: 'visor3d__poster' })}
        </div>
        <div class="monta__ferramentas">
          <label class="interruptor"><input type="checkbox" data-baloes checked><span>Balões de exemplo</span></label>
          <button type="button" class="ligacao-simples" data-guardar-imagem>${icone('copiar')}Guardar imagem</button>
          <button type="button" class="ligacao-simples" data-partilhar-cena>${icone('partilhar')}Partilhar</button>
        </div>
        <p class="monta__nota">Os balões são só decoração da imagem: não estão incluídos.</p>
      </div>
    </div>
    <form class="monta__escolhas" data-monta-form>
      ${grupoEscolha(ctx, { grupo: 'fundo', titulo: 'O fundo', n: 1, lista: ESCOLHAS.fundo, atual: 'arco-triplo' })}
      <div class="monta__cor" data-cor-de="fundo">${amostras(ctx, 'fundo', 'arco-triplo-real', 'branco')}</div>
      ${grupoEscolha(ctx, { grupo: 'pedestais', titulo: 'Os pedestais', n: 2, lista: ESCOLHAS.pedestais, atual: 'os-dois' })}
      <div class="monta__cor" data-cor-de="pedestais">${amostras(ctx, 'pedestais', 'trio-cilindros', 'branco')}</div>
      ${grupoEscolha(ctx, { grupo: 'mesa', titulo: 'A mesa', n: 3, lista: ESCOLHAS.mesa, atual: 'mesa-ripas' })}
      <div class="monta__cor" data-cor-de="mesa">${amostras(ctx, 'mesa', 'mesa-ripas', 'branco')}</div>
      ${grupoEscolha(ctx, { grupo: 'detalhes', titulo: 'Os detalhes', n: 4, lista: ESCOLHAS.detalhes, atual: [], tipo: 'checkbox' })}
      <div class="monta__total" data-monta-total>
        <div class="monta__soma"><span data-monta-pecas>4 peças</span><strong data-monta-preco>—</strong><small>aluguer por evento · caução <span data-monta-caucao>—</span></small></div>
        <button type="button" class="campo-data" data-abrir-calendario="monta">${icone('calendario')}<span><small>Data da festa</small><strong data-data-texto>Escolher</strong></span></button>
        <button type="submit" class="botao botao--verde botao--largo">Juntar tudo ao carrinho</button>
      </div>
    </form>
  </div>
</div>
<script type="application/json" id="dados-monta">${json(config)}</script>`;
  return [['/monta/', pagina(ctx, {
    titulo: 'Monta o teu cenário em 3D',
    descricao: 'Escolha o arco, os cilindros, a mesa e as figuras, troque as cores e veja o cenário montado em 3D antes de reservar.',
    caminho: '/monta/', corpo, atual: 'monta', classe: 'pagina-monta', scripts: ['monta.js'],
  })]];
}
