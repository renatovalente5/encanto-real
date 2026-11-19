// Inspiração (o blog), ajuda, sobre, contactos, páginas legais, 404, sitemap e robots.
import { h, raw } from '../lib/html.mjs';
import { icone } from './icones.mjs';
import { u, pagina, cartao, imgProduto, imgCena, fundoDe } from './base.mjs';
import { euros, DESCONTO_SEMANA } from '../scripts/regras.js';
import { ralHtml, livroReclamacoes, destinatariosHtml, DIREITOS, CNPD_URL, LIVRE_RESOLUCAO, SEM_LIVRE_RESOLUCAO_PERSONALIZADO, GARANTIA_BENS } from '../../legal-comum/index.mjs';

const PC = (t) => h`<span class="por-confirmar">[por confirmar: ${t}]</span>`;
const DATA = (s) => new Date(s + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

function paginaTexto(ctx, { caminho, titulo, frase, corpo, indexar = true, classe = '', atual, descricao }) {
  const c = h`<article class="contentor texto-pagina ${classe}">
  <header class="pagina__cabeca"><h1 class="pagina__titulo">${titulo}</h1>${frase ? h`<p class="pagina__frase">${frase}</p>` : ''}</header>
  <div class="texto">${corpo}</div>
</article>`;
  return pagina(ctx, { titulo, descricao: descricao || frase, caminho, corpo: c, indexar, atual, classe: `pagina-texto ${classe}` });
}

// ------------------------------------------------------------------------------------------- inspiração
function capaArtigo(ctx, a, { sizes, prioridade } = {}) {
  if (a.capa.cena) return imgCena(ctx, a.capa.cena, 'quadrado', { sizes, prioridade, alt: '' });
  const p = ctx.dados.porId[a.capa.produto];
  return imgProduto(ctx, p, { cor: a.capa.cor || p.cor, sizes, prioridade, alt: '' });
}

function paginaInspiracao(ctx) {
  const { artigos, porId } = ctx.dados;
  const corpo = h`<div class="contentor inspiracao">
  <header class="pagina__cabeca"><h1 class="pagina__titulo">Inspiração</h1><p class="pagina__frase">Ideias, medidas e paletas para a festa. Em breve, também as festas montadas com as nossas peças.</p></header>
  <div class="artigos">
    ${artigos.map((a, i) => h`<article class="artigo-cartao${i === 0 ? ' artigo-cartao--destaque' : ''}">
      <div class="artigo-cartao__imagem" style="--fundo:${raw(a.capa.cena ? 'var(--azulejo-champanhe)' : fundoDe(porId[a.capa.produto]))}">${capaArtigo(ctx, a, { sizes: i === 0 ? '(min-width: 900px) 60vw, 100vw' : '(min-width: 900px) 30vw, 100vw', prioridade: i === 0 })}</div>
      <div class="artigo-cartao__texto">
        <p class="sobretitulo">${DATA(a.data)}</p>
        <h2><a href="${u(ctx, `/inspiracao/${a.id}/`)}">${a.titulo}</a></h2>
        <p>${a.resumo}</p>
      </div>
    </article>`)}
  </div>
</div>`;
  return pagina(ctx, { titulo: 'Inspiração para festas', descricao: 'Ideias, medidas e paletas para decorar festas com arcos, painéis e cilindros.', caminho: '/inspiracao/', corpo, atual: 'inspiracao', classe: 'pagina-inspiracao' });
}

function paginaArtigo(ctx, a) {
  const { porId, site } = ctx.dados;
  const blocos = a.blocos.map((b) => {
    if (b.p) return h`<p>${b.p}</p>`;
    if (b.h) return h`<h2>${b.h}</h2>`;
    if (b.cena) return h`<figure class="texto__figura">${imgCena(ctx, b.cena, 'largo', { sizes: '(min-width: 900px) 760px, 100vw', alt: b.legenda })}<figcaption>${b.legenda}</figcaption></figure>`;
    if (b.produtos) return h`<div class="texto__produtos">${b.produtos.map((id) => cartao(ctx, porId[id], { sizes: '(min-width: 900px) 180px, 44vw' }))}</div>`;
    if (b.cta) return h`<p class="texto__cta"><a class="botao botao--verde" href="${u(ctx, b.cta[1])}">${b.cta[0]}</a></p>`;
    return '';
  });
  const corpo = h`<article class="contentor artigo">
  <nav class="migalhas" aria-label="Está aqui"><ol><li><a href="${u(ctx, '/inspiracao/')}">Inspiração</a></li><li aria-current="page">${a.titulo}</li></ol></nav>
  <header class="artigo__cabeca">
    <p class="sobretitulo">${DATA(a.data)}</p>
    <h1 class="pagina__titulo">${a.titulo}</h1>
    <p class="pagina__frase">${a.resumo}</p>
  </header>
  <div class="artigo__capa" style="--fundo:${raw(a.capa.cena ? 'var(--azulejo-champanhe)' : fundoDe(porId[a.capa.produto]))}">${a.capa.cena ? imgCena(ctx, a.capa.cena, 'largo', { sizes: '(min-width: 900px) 900px, 100vw', prioridade: true, alt: '' }) : capaArtigo(ctx, a, { sizes: '(min-width: 900px) 420px, 100vw', prioridade: true })}</div>
  <div class="texto texto--artigo">${blocos}</div>
</article>`;
  return pagina(ctx, {
    titulo: a.titulo, descricao: a.resumo, caminho: `/inspiracao/${a.id}/`, corpo, atual: 'inspiracao', classe: 'pagina-artigo',
    og: { tipo: 'article' },
    esquema: { '@context': 'https://schema.org', '@type': 'Article', headline: a.titulo, description: a.resumo, datePublished: a.data, author: { '@type': 'Organization', name: 'Encanto Real' }, publisher: { '@type': 'Organization', name: 'Encanto Real', logo: { '@type': 'ImageObject', url: `${site.url}/media/marca/icone-512.png` } } },
  });
}

// ------------------------------------------------------------------------------------------- ajuda
function paginaComoAlugar(ctx) {
  const { entregas } = ctx.dados;
  const a = entregas.aluguer;
  const passos = [
    ['calendario', 'Escolha a data da festa', 'A loja mostra o que está livre nesse dia. De segunda a quinta, o aluguer tem −' + DESCONTO_SEMANA + ' %.'],
    ['saco', 'Escolha as peças e as cores', 'Uma a uma, um cenário completo, ou monte o seu em 3D.'],
    ['escudo', 'Pague no site', `Tudo, ou ${a.sinal} % agora e o resto ${a.restoDiasAntes} dias antes. MB WAY, cartão ou Multibanco.`],
    ['camiao', 'Levante ou receba', 'Na véspera, em Esposende, ou entregamos e montamos.'],
    ['girar', 'Devolva no dia a seguir', 'Sem lavar nada. A caução volta em 2 dias úteis.'],
  ];
  const corpo = h`<ol class="passos">${passos.map(([i, t, d]) => h`<li class="passo-cartao">${icone(i, 'icone icone--circulo-claro')}<div><h2>${t}</h2><p>${d}</p></div></li>`)}</ol>
  <h2>As regras do aluguer</h2>
  <dl class="regras-lista">
    <div><dt>Período</dt><dd>Levanta (ou entregamos) na véspera da festa e devolve no dia a seguir. Se o dia a seguir for domingo, devolve na segunda.</dd></div>
    <div><dt>Antecedência</dt><dd>Reservas até ${a.antecedenciaMinimaDias} dias antes da festa. Entre dois alugueres da mesma peça fica ${a.folgaDias} dia de folga, para a revermos.</dd></div>
    <div><dt>Caução</dt><dd>Paga-se com a reserva e é devolvida até 2 dias úteis depois da recolha, por inteiro se as peças voltarem bem.</dd></div>
    <div><dt>Limpeza</dt><dd>Não precisa de lavar. Pedimos só que tire fitas-cola, pregos e restos de balões.</dd></div>
    <div><dt>Danos</dt><dd>Riscos e marcas de uso normal não se pagam. Uma peça partida ou pintada desconta-se da caução, pelo valor da reparação (exemplos: uma ripa, 15 €; repintar um cilindro, 25 €). Fotografamos as peças à saída e à chegada, e as fotografias ficam na sua conta.</dd></div>
    <div><dt>Atrasos</dt><dd>Cada dia de atraso na devolução custa ${euros(a.atrasoPorDia)}. Avise-nos e tentamos ajustar.</dd></div>
    <div><dt>Desistir ou mudar a data</dt><dd>Devolvemos tudo até ${a.cancelamento.total} dias antes da festa e metade até ${a.cancelamento.metade} dias antes. Mudar a data uma vez é grátis, se a peça estiver livre.</dd></div>
    <div><dt>Comprar depois</dt><dd>Se gostar e comprar a mesma peça até 30 dias depois da festa, descontamos o que pagou pelo aluguer.</dd></div>
  </dl>
  <p class="nota-pre">${icone('info')}Regras propostas para a pré-visualização: a Encanto Real confirma os valores antes de abrir a loja.</p>`;
  return paginaTexto(ctx, { caminho: '/ajuda/como-alugar/', titulo: 'Como funciona o aluguer', frase: 'Cinco passos, e as regras em linguagem simples.', corpo, classe: 'pagina-ajuda' });
}

function paginaEntregas(ctx) {
  const { entregas, site } = ctx.dados;
  const corpo = h`<div class="tabela-rolar"><table class="tabela">
    <caption class="so-leitor">Preços de entrega por zona</caption>
    <thead><tr><th scope="col">Zona</th><th scope="col">Onde</th><th scope="col">Entrega e recolha</th></tr></thead>
    <tbody>
      <tr><th scope="row">Levantamento</th><td>${site.localidade}, com hora marcada</td><td>Grátis</td></tr>
      ${entregas.zonas.map((z) => h`<tr><th scope="row">${z.nome}</th><td>${z.descricao}</td><td>${euros(z.preco)}${z.id === 'z1' ? h`<small> · grátis a partir de ${euros(entregas.gratisZona1Acima)}</small>` : ''}</td></tr>`)}
    </tbody>
  </table></div>
  <ul class="lista-icones">
    <li>${icone('festa')}<span><strong>Montagem:</strong> mais ${euros(entregas.montagem)} por encomenda. Deixamos tudo montado e voltamos para desmontar.</span></li>
    <li>${icone('relogio')}<span><strong>Hora:</strong> escolhe manhã (9h–13h) ou tarde (14h–19h). Ligamos 30 minutos antes.</span></li>
    <li>${icone('pacote')}<span><strong>Peças compradas:</strong> envio por transportadora para todo o país, ${euros(entregas.envioCompra.preco)} (grátis a partir de ${euros(entregas.envioCompra.gratisAcima)}), ou levantamento em ${site.localidade}.</span></li>
    <li>${icone('pin')}<span><strong>Fora destas zonas:</strong> fale connosco e fazemos um orçamento.</span></li>
  </ul>
  <p class="nota-pre">${icone('info')}Zonas e preços de exemplo, a confirmar pela Encanto Real.</p>`;
  return paginaTexto(ctx, { caminho: '/ajuda/entregas/', titulo: 'Entregas e montagem', frase: 'Levamos na véspera e vamos buscar no dia a seguir. Em Esposende, pode levantar.', corpo, classe: 'pagina-ajuda' });
}

const PERGUNTAS = [
  ['Com quanta antecedência devo reservar?', 'Pode reservar até 3 dias antes da festa. Para sábados de maio a outubro e de dezembro, reserve com algumas semanas: são os dias mais pedidos.'],
  ['Como sei se uma peça está livre no meu dia?', 'Escolha a data da festa no topo da loja: os cartões mostram «Livre» ou «Esgotado», e pode ver só o que está livre.'],
  ['As peças cabem no meu carro?', 'Cilindros, mesas e figuras cabem num carro normal. Os arcos e os painéis grandes têm mais de 1,80 m: para esses, escolha a entrega.'],
  ['Montam o cenário no local?', `Sim. Escolha «Entrega, montagem e recolha» no fim da encomenda (mais ${'20 €'}).`],
  ['Tenho de pagar tudo de uma vez?', 'Nos alugueres, pode pagar 50 % ao reservar e o resto 7 dias antes da festa. Nas compras, paga ao encomendar.'],
  ['Que formas de pagamento aceitam?', 'MB WAY, cartão (Visa e Mastercard) e referência Multibanco. Em iPhone, também Apple Pay.'],
  ['E se a festa for cancelada?', 'Devolvemos tudo até 30 dias antes e metade até 7 dias antes. Mudar a data uma vez é grátis.'],
  ['Posso pedir uma cor que não está na loja?', 'Na compra, sim: fazemos as peças por encomenda. Fale connosco e dizemos o prazo.'],
  ['Passam fatura?', 'Sim, com o seu NIF, se o escrever ao encomendar. A fatura chega por email e fica na sua conta.'],
  ['Preciso de criar conta?', 'Não. Pode encomendar sem conta. Com conta, guarda as festas, repete-as para o ano e tem cupões.'],
];

function paginaPerguntas(ctx) {
  const corpo = h`<div class="perguntas">${PERGUNTAS.map(([p, r]) => h`<details class="pergunta"><summary class="pergunta__titulo">${p}${icone('chevronBaixo')}</summary><p>${r}</p></details>`)}</div>
  <p>Não encontrou a resposta? <a href="${u(ctx, '/contactos/')}">Fale connosco</a>.</p>`;
  return pagina(ctx, {
    titulo: 'Perguntas frequentes', descricao: 'Reservas, entregas, pagamentos, cancelamentos e faturas: as respostas às perguntas mais comuns.', caminho: '/ajuda/perguntas/', classe: 'pagina-texto pagina-ajuda',
    corpo: h`<article class="contentor texto-pagina"><header class="pagina__cabeca"><h1 class="pagina__titulo">Perguntas frequentes</h1></header><div class="texto">${corpo}</div></article>`,
    esquema: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: PERGUNTAS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  });
}

function paginaLitigios(ctx) {
  const corpo = h`${raw(ralHtml({ ambito: 'local', concelhos: ['Esposende', 'Barcelos', 'Póvoa de Varzim', 'Viana do Castelo', 'Braga', 'Vila do Conde', 'Porto', 'Vila Nova de Famalicão', 'Guimarães'] }))}
  <h2>Livro de Reclamações</h2>
  <p>Pode reclamar no Livro de Reclamações Eletrónico: ${raw(livroReclamacoes({ classe: 'lr-discreto' }))}</p>`;
  return paginaTexto(ctx, { caminho: '/ajuda/litigios/', titulo: 'Resolução de litígios', corpo, indexar: false, classe: 'pagina-legal' });
}

// ------------------------------------------------------------------------------------------- sobre e contactos
function paginaSobre(ctx) {
  const { site, porId } = ctx.dados;
  const corpo = h`<div class="contentor sobre">
  <div class="sobre__grelha">
    <div class="sobre__texto">
      <h1 class="pagina__titulo">A Encanto Real</h1>
      <p class="pagina__frase">Desenhamos e fazemos peças de festa em MDF, em ${site.localidade}, para alugar no dia da festa ou comprar para ficar.</p>
      <ul class="factos">
        <li>${icone('casa')}<span>Fabrico próprio em ${site.localidade}</span></li>
        <li>${icone('calendario')}<span>Aluguer com a data da festa, pago no site</span></li>
        <li>${icone('camiao')}<span>Entrega e montagem no Norte</span></li>
      </ul>
      <div class="sobre__accoes"><a class="botao botao--verde" href="${u(ctx, '/loja/')}">Ver as peças</a><a class="ligacao-seta" href="${u(ctx, '/contactos/')}">Contactos ${icone('seta')}</a></div>
    </div>
    <div class="sobre__imagem">${imgCena(ctx, 'palco-branco', 'quadrado', { sizes: '(min-width: 900px) 40vw, 100vw', alt: 'Cenário em branco: arco triplo, balões, cilindros e mesa de ripas' })}</div>
  </div>
  <p class="nota-pre">${icone('info')}Falta a história da Encanto Real e uma fotografia de quem faz as peças: entram quando nos enviarem.</p>
</div>`;
  return pagina(ctx, { titulo: 'A Encanto Real', descricao: `Peças de festa em MDF feitas em ${site.localidade}, para alugar ou comprar.`, caminho: '/sobre/', corpo, classe: 'pagina-sobre' });
}

function paginaContactos(ctx) {
  const { site } = ctx.dados;
  const e = site.empresa;
  const corpo = h`<div class="contactos">
    <ul class="contactos__lista">
      <li>${icone('whatsapp', 'icone icone--circulo-claro')}<div><h2>WhatsApp</h2><p>${site.whatsapp ? h`<a href="https://wa.me/${site.whatsapp}">Enviar uma mensagem</a>` : PC('número')}</p></div></li>
      <li>${icone('email', 'icone icone--circulo-claro')}<div><h2>Email</h2><p>${site.email ? h`<a href="mailto:${site.email}">${site.email}</a>` : PC('email')}</p></div></li>
      <li>${icone('instagram', 'icone icone--circulo-claro')}<div><h2>Instagram</h2><p>${site.instagram ? h`<a href="${site.instagram}" rel="noopener">${site.instagram.replace(/^https?:\/\/(www\.)?/, '')}</a>` : PC('conta')}</p></div></li>
      <li>${icone('pin', 'icone icone--circulo-claro')}<div><h2>Oficina</h2><p>${site.localidade}, com hora marcada. ${e.morada ? e.morada : PC('morada')}</p></div></li>
    </ul>
    <p class="contactos__empresa">${e.nome || PC('nome da empresa')} · NIF ${e.nif || PC('NIF')} · ${e.morada || PC('morada')}, ${e.codigoPostal || '[código postal]'} ${e.localidade || ''}</p>
  </div>`;
  return paginaTexto(ctx, { caminho: '/contactos/', titulo: 'Contactos', frase: 'Respondemos no próprio dia, de segunda a sábado.', corpo, classe: 'pagina-contactos' });
}

// ------------------------------------------------------------------------------------------- legais
function paginaTermos(ctx) {
  const { site, entregas } = ctx.dados;
  const e = site.empresa;
  const a = entregas.aluguer;
  const corpo = h`<p class="atualizado">Atualizado a 18 de novembro de 2026.</p>
  <h2>1. Quem vende e aluga</h2>
  <p>${e.nome || PC('nome ou firma')}, NIF ${e.nif || PC('NIF')}, com sede em ${e.morada || PC('morada')}, ${e.localidade}. Email: ${site.email || PC('email')}.</p>
  <h2>2. Preços e pagamento</h2>
  <p>Os preços incluem IVA à taxa legal. A entrega, a montagem e a caução mostram-se à parte antes de pagar. Aceitamos MB WAY, cartão e referência Multibanco. Nos alugueres pode pagar ${a.sinal} % ao reservar e o resto ${a.restoDiasAntes} dias antes da festa; se o resto não for pago, a reserva pode ser cancelada.</p>
  <h2>3. Como se faz a encomenda</h2>
  <p>Escolhe as peças, a data (nos alugueres) e a entrega, revê o resumo e carrega em «Pagar». A encomenda fica feita quando o pagamento é aceite, e enviamos a confirmação por email. Pode corrigir os dados até carregar em «Pagar».</p>
  <h2>4. Aluguer</h2>
  <p>O aluguer é para o dia da festa: as peças levantam-se (ou entregamos) na véspera e devolvem-se no dia seguinte. A caução é devolvida até 2 dias úteis depois da recolha; os danos para além do uso normal descontam-se da caução pelo valor da reparação, e cada dia de atraso custa ${euros(a.atrasoPorDia)}. Desistência: reembolso total até ${a.cancelamento.total} dias antes, 50 % até ${a.cancelamento.metade} dias antes; uma mudança de data é grátis, se houver disponibilidade. ${PC('se o aluguer para uma data certa tem ou não direito de livre resolução (DL 24/2014, art. 17.º, n.º 1, alínea l)) — confirmar com um advogado')}</p>
  <h2>5. Compra</h2>
  <p>As peças compradas fazem-se por encomenda, no prazo indicado em cada ficha. ${LIVRE_RESOLUCAO}</p>
  <p>${SEM_LIVRE_RESOLUCAO_PERSONALIZADO}</p>
  <p>${GARANTIA_BENS}</p>
  <h2>6. Reclamações</h2>
  <p>Pode reclamar por email, no <a href="https://www.livroreclamacoes.pt/inicio" rel="noopener">Livro de Reclamações Eletrónico</a> ou junto de um centro de arbitragem (ver <a href="${u(ctx, '/ajuda/litigios/')}">Resolução de litígios</a>).</p>
  <h2>7. Lei aplicável</h2>
  <p>Estes termos regem-se pela lei portuguesa.</p>`;
  return paginaTexto(ctx, { caminho: '/termos/', titulo: 'Termos e condições', frase: 'Do aluguer e da venda.', corpo, indexar: false, classe: 'pagina-legal' });
}

function paginaPrivacidade(ctx) {
  const { site } = ctx.dados;
  const e = site.empresa;
  const corpo = h`<p class="atualizado">Atualizado a 18 de novembro de 2026.</p>
  <h2>Quem trata os seus dados</h2>
  <p>${e.nome || PC('nome ou firma')}, NIF ${e.nif || PC('NIF')}, ${e.morada || PC('morada')}. Contacto: ${site.email || PC('email')}.</p>
  <h2>Que dados e para quê</h2>
  <ul>
    <li><strong>Encomendas:</strong> nome, email, telemóvel, morada de entrega, NIF (se o der), as peças e as datas. Para cumprir o contrato e passar a fatura (RGPD, art. 6.º, n.º 1, b) e c)).</li>
    <li><strong>Conta:</strong> nome, email e senha (cifrada), e as moradas que guardar. Para manter a conta que pediu (art. 6.º, n.º 1, b)).</li>
    <li><strong>Novidades por email:</strong> só com o seu consentimento, que pode retirar em cada email (art. 6.º, n.º 1, a)).</li>
  </ul>
  <h2>Quanto tempo</h2>
  <p>Encomendas e faturas: 10 anos, por obrigação fiscal. Conta: até a apagar. Novidades: até deixar de as querer.</p>
  <h2>Com quem os partilhamos</h2>
  ${raw(destinatariosHtml({ alojamento: 'cloudflare', pagamentos: ['ifthenpay', 'stripe'], envioEmails: 'resend' }, { formato: 'lista' }))}
  <p class="nota-pre">${icone('info')}Fornecedores previstos para a loja a sério; a confirmar quando abrir.</p>
  <h2>No seu browser</h2>
  <p>O carrinho, os favoritos e a data da festa guardam-se no seu browser (armazenamento local), só para o site funcionar. Não usamos cookies de publicidade nem de estatística.</p>
  <h2>Os seus direitos</h2>
  <ul>${DIREITOS.map((d) => h`<li><strong>${d.nome}:</strong> ${d.descricao}</li>`)}</ul>
  <p>Pode exercê-los por email. Se achar que o tratamento não cumpre a lei, pode reclamar à <a href="${CNPD_URL}" rel="noopener">Comissão Nacional de Proteção de Dados</a>.</p>`;
  return paginaTexto(ctx, { caminho: '/privacidade/', titulo: 'Política de privacidade', corpo, indexar: false, classe: 'pagina-legal' });
}

function pagina404(ctx) {
  const corpo = h`<div class="contentor vazio vazio--404">
  <img src="${u(ctx, '/media/marca/coroa-verde.svg')}" width="90" height="105" alt="" class="vazio__coroa">
  <h1 class="pagina__titulo">Esta página não existe</h1>
  <p class="pagina__frase">Pode ter mudado de sítio. As peças estão todas na loja.</p>
  <div class="vazio__accoes"><a class="botao botao--verde" href="${u(ctx, '/loja/')}">Ir à loja</a><a class="ligacao-seta" href="${u(ctx, '/')}">Página inicial ${icone('seta')}</a></div>
</div>`;
  return pagina(ctx, { titulo: 'Página não encontrada', caminho: '/404.html', corpo, indexar: false, classe: 'pagina-404' });
}

function sitemap(ctx, caminhos) {
  const base = ctx.dados.site.url;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${caminhos.map((c) => `  <url><loc>${base}${c}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function gerarConteudo(ctx) {
  const { artigos, produtos, categorias } = ctx.dados;
  const out = [
    ['/inspiracao/', paginaInspiracao(ctx)],
    ...artigos.map((a) => [`/inspiracao/${a.id}/`, paginaArtigo(ctx, a)]),
    ['/ajuda/como-alugar/', paginaComoAlugar(ctx)],
    ['/ajuda/entregas/', paginaEntregas(ctx)],
    ['/ajuda/perguntas/', paginaPerguntas(ctx)],
    ['/ajuda/litigios/', paginaLitigios(ctx)],
    ['/sobre/', paginaSobre(ctx)],
    ['/contactos/', paginaContactos(ctx)],
    ['/termos/', paginaTermos(ctx)],
    ['/privacidade/', paginaPrivacidade(ctx)],
    ['404.html', pagina404(ctx)],
  ];
  // sitemap e robots só com as páginas de destino (as legais ficam fora: noindex)
  const caminhos = ['/', '/loja/', ...categorias.map((c) => `/loja/${c.id}/`), ...produtos.map((p) => `/loja/${p.id}/`), '/monta/', '/inspiracao/', ...artigos.map((a) => `/inspiracao/${a.id}/`), '/ajuda/como-alugar/', '/ajuda/entregas/', '/ajuda/perguntas/', '/sobre/', '/contactos/'];
  out.push(['sitemap.xml', sitemap(ctx, caminhos)]);
  out.push(['robots.txt', ctx.preVisualizacao ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${ctx.dados.site.url}/sitemap.xml\n`]);
  return out;
}
