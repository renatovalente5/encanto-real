// A conta (entrar, criar, recuperar, painel) e os favoritos.
import { h } from '../lib/html.mjs';
import { icone } from './icones.mjs';
import { u, pagina } from './base.mjs';

const AVISO = 'Pré-visualização: a conta fica guardada só neste browser. Na loja a sério, fica no nosso servidor, com a senha cifrada.';

function cartaoEntrada(ctx, { titulo, frase, corpo, rodape }) {
  return h`<div class="contentor entrada">
  <div class="entrada__caixa">
    <img class="entrada__coroa" src="${u(ctx, '/media/marca/coroa-verde.png')}" width="524" height="309" alt="">
    <h1 class="pagina__titulo">${titulo}</h1>
    ${frase ? h`<p class="pagina__frase">${frase}</p>` : ''}
    ${corpo}
    ${rodape ? h`<div class="entrada__rodape">${rodape}</div>` : ''}
    <p class="nota-pre">${icone('info')}${AVISO}</p>
  </div>
</div>`;
}

const campoSenha = (id, rotulo, auto) => h`<div class="campo-grupo">
  <label for="${id}">${rotulo}</label>
  <div class="campo-senha">
    <input class="campo" id="${id}" name="senha" type="password" autocomplete="${auto}" required minlength="8" aria-describedby="${id}-erro">
    <button type="button" class="campo-senha__ver" data-ver-senha aria-label="Mostrar a senha" aria-pressed="false">Mostrar</button>
  </div>
  <p class="campo-erro" id="${id}-erro" hidden></p>
</div>`;

function paginaEntrar(ctx) {
  const corpo = cartaoEntrada(ctx, {
    titulo: 'Entrar',
    frase: 'Para ver as suas festas, as encomendas e os cupões.',
    corpo: h`<form class="formulario" data-form-entrar novalidate>
      <div class="campo-grupo"><label for="e-email">Email</label><input class="campo" id="e-email" name="email" type="email" inputmode="email" autocomplete="username" required spellcheck="false" aria-describedby="e-email-erro"><p class="campo-erro" id="e-email-erro" hidden></p></div>
      ${campoSenha('e-senha', 'Senha', 'current-password')}
      <p class="formulario__erro" data-erro role="alert" hidden></p>
      <button class="botao botao--verde botao--largo" type="submit">Entrar</button>
      <a class="ligacao-simples ligacao-simples--centro" href="${u(ctx, '/conta/recuperar/')}">Esqueci-me da senha</a>
    </form>`,
    rodape: h`<p>Ainda não tem conta? <a href="${u(ctx, '/conta/criar/')}">Criar conta</a></p>`,
  });
  return pagina(ctx, { titulo: 'Entrar', caminho: '/conta/entrar/', corpo, indexar: false, classe: 'pagina-entrada', scripts: ['conta.js'] });
}

function paginaCriar(ctx) {
  const corpo = cartaoEntrada(ctx, {
    titulo: 'Criar conta',
    frase: 'Guarde as festas, repita-as para o ano e tenha 10 % na primeira encomenda.',
    corpo: h`<form class="formulario" data-form-criar novalidate>
      <div class="campo-grupo"><label for="c-nome">Nome</label><input class="campo" id="c-nome" name="nome" autocomplete="name" autocapitalize="words" required aria-describedby="c-nome-erro"><p class="campo-erro" id="c-nome-erro" hidden></p></div>
      <div class="campo-grupo"><label for="c-email">Email</label><input class="campo" id="c-email" name="email" type="email" inputmode="email" autocomplete="email" required spellcheck="false" aria-describedby="c-email-erro"><p class="campo-erro" id="c-email-erro" hidden></p></div>
      ${campoSenha('c-senha', 'Senha (8 ou mais letras e números)', 'new-password')}
      <label class="caixa"><input type="checkbox" name="novidades"><span>Quero receber novidades e cupões por email (pode sair quando quiser).</span></label>
      <p class="formulario__erro" data-erro role="alert" hidden></p>
      <button class="botao botao--verde botao--largo" type="submit">Criar conta</button>
      <p class="formulario__legal">Ao criar a conta, os seus dados são tratados como diz a <a href="${u(ctx, '/privacidade/')}">Política de privacidade</a>.</p>
    </form>`,
    rodape: h`<p>Já tem conta? <a href="${u(ctx, '/conta/entrar/')}">Entrar</a></p>`,
  });
  return pagina(ctx, { titulo: 'Criar conta', caminho: '/conta/criar/', corpo, indexar: false, classe: 'pagina-entrada', scripts: ['conta.js'] });
}

function paginaRecuperar(ctx) {
  const corpo = cartaoEntrada(ctx, {
    titulo: 'Recuperar a senha',
    frase: 'Enviamos uma ligação para escolher outra senha.',
    corpo: h`<form class="formulario" data-form-recuperar novalidate>
      <div class="campo-grupo"><label for="r-email">Email</label><input class="campo" id="r-email" name="email" type="email" inputmode="email" autocomplete="email" required spellcheck="false"></div>
      <p class="formulario__certo" data-certo role="status" hidden>Se houver uma conta com este email, a ligação chega em poucos minutos.</p>
      <button class="botao botao--verde botao--largo" type="submit">Enviar a ligação</button>
    </form>`,
    rodape: h`<p><a href="${u(ctx, '/conta/entrar/')}">Voltar a entrar</a></p>`,
  });
  return pagina(ctx, { titulo: 'Recuperar a senha', caminho: '/conta/recuperar/', corpo, indexar: false, classe: 'pagina-entrada', scripts: ['conta.js'] });
}

function paginaConta(ctx) {
  const corpo = h`<div class="contentor conta" data-conta>
  <header class="conta__cabeca">
    <div>
      <p class="sobretitulo">A minha conta</p>
      <h1 class="pagina__titulo" data-ola>Olá</h1>
    </div>
    <button type="button" class="botao botao--contorno" data-sair>${icone('sair')}Sair</button>
  </header>
  <p class="nota-pre">${icone('info')}${AVISO}</p>
  <nav class="conta__nav" aria-label="Secções da conta">
    <a href="#encomendas">As minhas festas</a><a href="#cupoes">Cupões</a><a href="#dados">Os meus dados</a>
  </nav>
  <section class="conta__seccao" id="encomendas" aria-labelledby="t-enc">
    <h2 class="seccao__titulo seccao__titulo--pequeno" id="t-enc">As minhas festas</h2>
    <div data-encomendas><p>A carregar…</p></div>
  </section>
  <section class="conta__seccao" id="cupoes" aria-labelledby="t-cup">
    <h2 class="seccao__titulo seccao__titulo--pequeno" id="t-cup">Cupões</h2>
    <div data-cupoes></div>
  </section>
  <section class="conta__seccao" id="dados" aria-labelledby="t-dados">
    <h2 class="seccao__titulo seccao__titulo--pequeno" id="t-dados">Os meus dados</h2>
    <form class="formulario formulario--largo" data-form-dados novalidate>
      <div class="campos campos--2">
        <div class="campo-grupo"><label for="d-nome">Nome</label><input class="campo" id="d-nome" name="nome" autocomplete="name"></div>
        <div class="campo-grupo"><label for="d-email">Email</label><input class="campo" id="d-email" name="email" type="email" disabled></div>
        <div class="campo-grupo"><label for="d-tel">Telemóvel</label><input class="campo" id="d-tel" name="telemovel" type="tel" inputmode="tel" autocomplete="tel-national"></div>
        <div class="campo-grupo"><label for="d-nif">NIF <span class="opcional">(opcional)</span></label><input class="campo" id="d-nif" name="nif" inputmode="numeric" maxlength="9"></div>
        <div class="campo-grupo campo-grupo--largo"><label for="d-morada">Morada <span class="opcional">(opcional)</span></label><input class="campo" id="d-morada" name="morada" autocomplete="street-address"></div>
        <div class="campo-grupo"><label for="d-cp">Código postal</label><input class="campo" id="d-cp" name="cp" inputmode="numeric" autocomplete="postal-code" placeholder="0000-000" maxlength="8"></div>
        <div class="campo-grupo"><label for="d-loc">Localidade</label><input class="campo" id="d-loc" name="localidade" autocomplete="address-level2"></div>
      </div>
      <label class="caixa"><input type="checkbox" name="novidades"><span>Receber novidades e cupões por email.</span></label>
      <button class="botao botao--verde" type="submit">Guardar</button>
    </form>
    <details class="definicoes">
      <summary>Definições da conta</summary>
      <div class="definicoes__corpo">
        <button type="button" class="ligacao-simples" data-sair-todos>Terminar a sessão em todos os aparelhos</button>
        <button type="button" class="ligacao-simples ligacao-simples--perigo" data-apagar-conta>Apagar a conta</button>
      </div>
    </details>
  </section>
</div>`;
  return pagina(ctx, { titulo: 'A minha conta', caminho: '/conta/', corpo, indexar: false, classe: 'pagina-conta', scripts: ['conta.js'] });
}

function paginaFavoritos(ctx) {
  const corpo = h`<div class="contentor favoritos" data-favoritos-pagina>
  <header class="pagina__cabeca pagina__cabeca--linha">
    <div><h1 class="pagina__titulo">Favoritos</h1><p class="pagina__frase" data-frase-favoritos>As peças que guardou para a festa.</p></div>
    <button type="button" class="botao botao--contorno" data-partilhar-lista hidden>${icone('partilhar')}Partilhar a lista</button>
  </header>
  <div class="grelha-produtos" data-lista-favoritos></div>
  <div class="vazio" data-vazio hidden>
    <span class="vazio__icone">${icone('coracao')}</span>
    <p><strong>Ainda não guardou nada.</strong></p>
    <p>Toque no coração das peças de que gosta. A lista pode partilhar-se com a família.</p>
    <a class="botao botao--verde" href="${u(ctx, '/loja/')}">Ir à loja</a>
  </div>
</div>`;
  return pagina(ctx, { titulo: 'Favoritos', caminho: '/favoritos/', corpo, indexar: false, classe: 'pagina-favoritos', scripts: ['favoritos.js'] });
}

export function gerarConta(ctx) {
  return [
    ['/conta/entrar/', paginaEntrar(ctx)],
    ['/conta/criar/', paginaCriar(ctx)],
    ['/conta/recuperar/', paginaRecuperar(ctx)],
    ['/conta/', paginaConta(ctx)],
    ['/favoritos/', paginaFavoritos(ctx)],
  ];
}
