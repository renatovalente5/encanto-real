// Carrinho, finalizar e obrigado.
import { h, attrs } from '../lib/html.mjs';
import { icone } from './icones.mjs';
import { u, pagina } from './base.mjs';
import { euros } from '../scripts/regras.js';

function paginaCarrinho(ctx) {
  const corpo = h`<div class="contentor carrinho-pagina">
  <header class="pagina__cabeca"><h1 class="pagina__titulo">Carrinho</h1></header>
  <div class="carrinho-pagina__corpo" data-carrinho-pagina><p>A carregar…</p></div>
</div>`;
  return pagina(ctx, { titulo: 'Carrinho', caminho: '/carrinho/', corpo, indexar: false, classe: 'pagina-carrinho', scripts: ['carrinho.js'] });
}

function campo({ id, rotulo, tipo = 'text', auto, obrigatorio = true, extra = {}, ajuda, classe = '' }) {
  return h`<div class="campo-grupo ${classe}">
  <label for="${id}">${rotulo}${obrigatorio ? '' : h` <span class="opcional">(opcional)</span>`}</label>
  <input class="campo" id="${id}" name="${id}" type="${tipo}"${attrs({ autocomplete: auto, required: obrigatorio, 'aria-describedby': ajuda ? `${id}-ajuda` : null, ...extra })}>
  ${ajuda ? h`<p class="campo-ajuda" id="${id}-ajuda">${ajuda}</p>` : ''}
  <p class="campo-erro" id="${id}-erro" hidden></p>
</div>`;
}

function paginaFinalizar(ctx) {
  const { entregas, site } = ctx.dados;
  const corpo = h`<div class="contentor finalizar" data-finalizar>
  <header class="pagina__cabeca pagina__cabeca--compacta">
    <a class="ligacao-seta ligacao-seta--voltar" href="${u(ctx, '/carrinho/')}">${icone('setaEsq')} Carrinho</a>
    <h1 class="pagina__titulo">Finalizar encomenda</h1>
  </header>
  <div class="finalizar__grelha">
    <details class="finalizar__resumo-movel" data-resumo-movel>
      <summary><span>${icone('saco')} Resumo</span><strong data-total-movel></strong></summary>
      <div data-resumo-linhas-movel></div>
    </details>
    <form class="finalizar__form" data-form-finalizar novalidate>
      <section class="passo" aria-labelledby="p1">
        <h2 class="passo__titulo" id="p1"><span>1</span>Os seus dados</h2>
        <p class="passo__nota" data-sem-sessao>Já tem conta? <a href="${u(ctx, '/conta/entrar/?voltar=/finalizar/')}">Entrar</a> e os dados ficam preenchidos.</p>
        <div class="campos campos--2">
          ${campo({ id: 'email', rotulo: 'Email', tipo: 'email', auto: 'email', extra: { inputmode: 'email', spellcheck: 'false' }, ajuda: 'Para a confirmação e a fatura.' })}
          ${campo({ id: 'nome', rotulo: 'Nome', auto: 'name', extra: { autocapitalize: 'words' } })}
          ${campo({ id: 'telemovel', rotulo: 'Telemóvel', tipo: 'tel', auto: 'tel-national', extra: { inputmode: 'tel', placeholder: '912 345 678' }, ajuda: 'Para combinarmos a entrega.' })}
          ${campo({ id: 'nif', rotulo: 'NIF para a fatura', auto: 'off', obrigatorio: false, extra: { inputmode: 'numeric', maxlength: 9 } })}
        </div>
      </section>

      <section class="passo" aria-labelledby="p2">
        <h2 class="passo__titulo" id="p2"><span>2</span>Entrega</h2>
        <div class="opcoes-entrega" role="radiogroup" aria-labelledby="p2">
          <label class="opcao-cartao"><input type="radio" name="entrega" value="levantamento" checked><span class="opcao-cartao__corpo">${icone('casa')}<span><strong>Levantar em ${site.localidade}</strong><small>Com hora marcada. Ajudamos a carregar.</small></span><em>Grátis</em></span></label>
          <label class="opcao-cartao"><input type="radio" name="entrega" value="entrega"><span class="opcao-cartao__corpo">${icone('camiao')}<span><strong>Entrega e recolha</strong><small>Levamos na véspera e vamos buscar depois.</small></span><em data-preco-entrega>desde ${euros(Math.min(...entregas.zonas.map((z) => z.preco)))}</em></span></label>
          <label class="opcao-cartao"><input type="radio" name="entrega" value="montagem"><span class="opcao-cartao__corpo">${icone('festa')}<span><strong>Entrega, montagem e recolha</strong><small>Deixamos tudo montado no sítio da festa.</small></span><em data-preco-montagem>+ ${euros(entregas.montagem)}</em></span></label>
          <label class="opcao-cartao" data-so-compra hidden><input type="radio" name="entrega" value="transportadora"><span class="opcao-cartao__corpo">${icone('pacote')}<span><strong>Envio por transportadora</strong><small>Só para peças compradas. Grátis a partir de ${euros(entregas.envioCompra.gratisAcima)}.</small></span><em>${euros(entregas.envioCompra.preco)}</em></span></label>
        </div>
        <div class="morada" data-morada hidden>
          <div class="campos campos--morada">
            ${campo({ id: 'morada', rotulo: 'Morada', auto: 'street-address', classe: 'campo-grupo--largo' })}
            ${campo({ id: 'codigo-postal', rotulo: 'Código postal', auto: 'postal-code', extra: { inputmode: 'numeric', placeholder: '0000-000', maxlength: 8, pattern: '\\d{4}-\\d{3}' } })}
            ${campo({ id: 'localidade', rotulo: 'Localidade', auto: 'address-level2' })}
          </div>
          <p class="zona" data-zona aria-live="polite"></p>
          <fieldset class="janelas">
            <legend>Hora da entrega</legend>
            <div class="pilulas pilulas--opcao">
              ${entregas.janelas.map((j, i) => h`<label class="pilula-opcao"><input type="radio" name="janela" value="${j.id}"${attrs({ checked: i === 0 })}><span>${j.nome}</span></label>`)}
            </div>
          </fieldset>
        </div>
      </section>

      <section class="passo" aria-labelledby="p3" data-so-aluguer hidden>
        <h2 class="passo__titulo" id="p3"><span>3</span>A festa</h2>
        <button type="button" class="campo-data campo-data--grande" data-abrir-calendario="finalizar">${icone('calendario')}<span><strong data-data-texto>Escolher a data</strong><small data-janela>Levanta na véspera e devolve no dia a seguir</small></span>${icone('chevronBaixo')}</button>
        ${campo({ id: 'nome-festa', rotulo: 'Nome da festa', obrigatorio: false, extra: { placeholder: 'Ex.: 1.º aniversário da Sofia' }, ajuda: 'Fica na sua conta, em «As minhas festas».' })}
      </section>

      <section class="passo" aria-labelledby="p4">
        <h2 class="passo__titulo" id="p4"><span data-n-pagamento>4</span>Pagamento</h2>
        <div class="opcoes-sinal" data-opcoes-sinal hidden>
          <label class="opcao-cartao opcao-cartao--simples"><input type="radio" name="pagamento" value="total" checked><span class="opcao-cartao__corpo"><span><strong>Pagar tudo agora</strong></span><em data-valor-total></em></span></label>
          <label class="opcao-cartao opcao-cartao--simples"><input type="radio" name="pagamento" value="sinal"><span class="opcao-cartao__corpo"><span><strong>Pagar 50 % agora</strong><small>O resto, a entrega e a caução 7 dias antes da festa.</small></span><em data-valor-sinal></em></span></label>
        </div>
        <div class="metodos" role="radiogroup" aria-label="Forma de pagamento">
          <label class="metodo"><input type="radio" name="metodo" value="mbway" checked><span><b class="metodo__logo metodo__logo--mbway">MB WAY</b>Telemóvel</span></label>
          <label class="metodo"><input type="radio" name="metodo" value="cartao"><span><b class="metodo__logo">Visa · Mastercard</b>Cartão</span></label>
          <label class="metodo"><input type="radio" name="metodo" value="multibanco"><span><b class="metodo__logo metodo__logo--mb">Multibanco</b>Referência</span></label>
          <label class="metodo" data-apple-pay hidden><input type="radio" name="metodo" value="apple"><span><b class="metodo__logo">Apple Pay</b>No iPhone</span></label>
        </div>
        <div data-metodo-mbway>${campo({ id: 'telemovel-mbway', rotulo: 'Telemóvel do MB WAY', tipo: 'tel', auto: 'tel-national', extra: { inputmode: 'tel', placeholder: '912 345 678' }, ajuda: 'Recebe o pedido na app e aceita em 4 minutos.' })}</div>
        <p class="passo__nota" data-metodo-cartao hidden>${icone('escudo')} Abre a página segura do banco para os dados do cartão. Não guardamos o número.</p>
        <p class="passo__nota" data-metodo-multibanco hidden>${icone('info')} Damos a entidade e a referência. A reserva fica guardada 48 horas até ao pagamento.</p>
      </section>

      <section class="passo passo--fim">
        <div class="campo-grupo">
          <label for="notas">Notas para nós <span class="opcional">(opcional)</span></label>
          <textarea class="campo" id="notas" name="notas" rows="3" placeholder="Ex.: o salão fica no 1.º andar, com elevador."></textarea>
        </div>
        <label class="caixa"><input type="checkbox" name="termos" required data-termos><span>Li e aceito os <a href="${u(ctx, '/termos/')}" target="_blank">Termos e condições</a> do aluguer e da venda.</span></label>
        <p class="campo-erro" data-erro-termos hidden>Para encomendar, aceite os termos.</p>
        <div class="finalizar__total-movel" data-total-botao></div>
        <button class="botao botao--verde botao--largo botao--grande" type="submit" data-pagar>Pagar</button>
        <p class="finalizar__seguro">${icone('escudo')} Pagamento seguro.</p>
      </section>
    </form>
    <aside class="finalizar__resumo" aria-label="Resumo da encomenda" data-resumo-finalizar><p>A carregar…</p></aside>
  </div>
</div>`;
  return pagina(ctx, { titulo: 'Finalizar encomenda', caminho: '/finalizar/', corpo, indexar: false, classe: 'pagina-finalizar', scripts: ['finalizar.js'] });
}

function paginaObrigado(ctx) {
  const corpo = h`<div class="contentor obrigado" data-obrigado>
  <p>A carregar…</p>
</div>`;
  return pagina(ctx, { titulo: 'Obrigado', caminho: '/obrigado/', corpo, indexar: false, classe: 'pagina-obrigado', scripts: ['obrigado.js'] });
}

export function gerarCompra(ctx) {
  return [['/carrinho/', paginaCarrinho(ctx)], ['/finalizar/', paginaFinalizar(ctx)], ['/obrigado/', paginaObrigado(ctx)]];
}
