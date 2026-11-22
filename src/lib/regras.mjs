/* AS REGRAS DOS DADOS DA ENCANTO REAL, NUM SÓ SÍTIO.
 *
 * Três leitores, e os três têm de ouvir o mesmo:
 *   · o gerador do site (src/build.mjs), antes de escrever as páginas;
 *   · o painel, no browser (o erro aparece por baixo do campo, antes de gravar);
 *   · o Worker do painel, ao gravar (recusa os problemas NOVOS que não sejam lembretes).
 * O painel usa uma CÓPIA BYTE A BYTE deste ficheiro (estatico/js/regras.js no repositório encanto-real-painel), com
 * um teste de SHA-256 que falha se divergirem. Por isso é um ES module puro: nenhum import, nada de node:*, fs,
 * process ou require. Corre tal e qual no browser, num Worker e no Node. (A forma vem das regras da Franja Kids.)
 *
 * NÃO SÃO AS REGRAS DA COMPRA: os preços, a caução, o sinal, as zonas pelo código postal e os cupões no carrinho estão
 * em src/scripts/regras.js. Aqui é só o que o conteúdo pode ter.
 *
 * CADA PROBLEMA TEM UMA CLASSE:
 *   · bloqueia   — a publicação pára e o site fica como estava. Só a estrutura (um JSON que não se lê, um ficheiro sem
 *                  a forma que o gerador precisa) e o que todas as páginas usam (as categorias, as entregas, os dados da
 *                  loja). Com a loja ABERTA, também os dados que a lei pede (identificação, NIF, morada, email —
 *                  DL 7/2004, art. 10.º).
 *   · neutraliza — uma peça, um cupão ou uma fotografia, só na cópia que o gerador lê (o ficheiro não muda): a peça sem
 *                  nome, sem frase, sem preço, numa categoria que não existe, ou sem 3D e sem fotografias fica fora do
 *                  site; uma fotografia que não existe não aparece; um cupão mal escrito não vale. Um problema de UMA
 *                  peça nunca pára as outras.
 *   · avisa      — só aviso. No painel, os que não são lembrete são erro de campo (um número fora dos limites, um email
 *                  que não é email): o painel não os deixa gravar. Os LEMBRETES (lembrete: true) não são erro de
 *                  ninguém: o painel grava na mesma e mostra-os no Início («falta o NIF»).
 *
 * dados = {
 *   site, categorias, ocasioes, cupoes, entregas, fotos:  texto | objecto | null   (content/<nome>.json)
 *   produtos: { <id>: texto | objecto | null }                                     (content/produtos/<id>.json)
 *   ficheirosFotos?: [nome]   os nomes (sem .jpg) dos ficheiros em media/fotos/
 * }
 *   texto = o conteúdo do ficheiro; null = não existe. Uma chave de topo AUSENTE não se confere (o painel pode conferir
 *   só uma peça); presente e null é «falta o ficheiro».
 *
 * problema = {
 *   classe:   'bloqueia' | 'neutraliza' | 'avisa',
 *   chave:    estável ('peca:<id>:<regra>', 'site:<campo>[:<regra>]'…). O Worker compara as chaves do HEAD com as da
 *             gravação e recusa só as novas; por isso UMA CHAVE TEM SEMPRE A MESMA CLASSE (o que muda com a loja aberta
 *             tem uma chave própria, com «:aberta»).
 *   ficheiro: o caminho do ficheiro;
 *   ecra:     o ecrã do painel onde se corrige («Peças › Arco Triplo Real»);
 *   mensagem: para a dona, em português simples, sem caminhos de JSON;
 *   campo?:   o campo onde o painel mostra o erro ('aluguer.preco', 'zonas.0.preco');
 *   efeito?:  só nos «neutraliza»: 'esconder' | 'sem_fotografia';
 *   id?, foto?, indice?, lembrete?
 * }
 *
 * «NÃO FOI DITO» E NULL SÃO O MESMO. E o vazio testa-se ANTES de converter: Number(null) é 0, e 0 é uma escolha.
 */

/* ------------------------------------------------------------------ */
/* Onde estão as coisas                                                */
/* ------------------------------------------------------------------ */

export const FICHEIROS = Object.freeze({
  site: 'content/site.json',
  categorias: 'content/categorias.json',
  ocasioes: 'content/ocasioes.json',
  cupoes: 'content/cupoes.json',
  entregas: 'content/entregas.json',
  fotos: 'content/fotos.json',
});
export const PASTAS = Object.freeze({ produtos: 'content/produtos', fotos: 'media/fotos' });
export const ficheiroDoProduto = (id) => `${PASTAS.produtos}/${id}.json`;
export const ficheiroDaFoto = (nome) => `${PASTAS.fotos}/${nome}.jpg`;

/* As cores das peças: a paleta do estúdio 3D (src/3d/acabamentos.js; o testar-regras confere que batem). */
export const CORES = Object.freeze({
  branco: { nome: 'Branco', hex: '#F3F1EC' },
  marfim: { nome: 'Marfim', hex: '#EFE3CB' },
  rosa: { nome: 'Rosa', hex: '#E9BDBB' },
  lilas: { nome: 'Lilás', hex: '#C9BADB' },
  azul: { nome: 'Azul-bebé', hex: '#B8D0DF' },
  salvia: { nome: 'Verde-sálvia', hex: '#A7B596' },
  verde: { nome: 'Verde-real', hex: '#55613D' },
  terracota: { nome: 'Terracota', hex: '#C9805F' },
  mostarda: { nome: 'Mostarda', hex: '#D8A94E' },
  preto: { nome: 'Preto', hex: '#2B2B29' },
  dourado: { nome: 'Dourado', hex: '#E6C77F' },
  madeira: { nome: 'Madeira natural', hex: '#D7B58B' },
});

/* Os fundos dos cartões (os --azulejo-* do site.css). */
export const FUNDOS = Object.freeze({
  rosa: { nome: 'Rosa', hex: '#F2DCD8' },
  salvia: { nome: 'Sálvia', hex: '#DDE3D2' },
  lilas: { nome: 'Lilás', hex: '#E5DEEC' },
  azul: { nome: 'Azul', hex: '#DAE6EE' },
  champanhe: { nome: 'Champanhe', hex: '#F3E7CC' },
  areia: { nome: 'Areia', hex: '#ECE5D4' },
  verde: { nome: 'Verde', hex: '#54603C' },
});

/* O que o painel não muda (o Worker recusa com 409 «campo_bloqueado»):
   - numa peça com 3D, o desenho dela: o modelo, as cores (cada uma tem as fotografias do estúdio feitas à parte), os
     tamanhos, os dígitos, a cena e as peças de um cenário;
   - nos dados da loja, o nome, o endereço, a região, a variante da capa e a pré-visualização (abrir a loja é com o
     Renato, com os dados legais e os pagamentos);
   - as categorias e as zonas de entrega que existem (o painel muda-lhes os nomes e os preços, não os ids). */
export const CAMPOS_FIXOS_3D = Object.freeze(['modelo3d', 'cena3d', 'texto3d', 'tamanhos', 'cores', 'cor', 'combinacoes', 'digitos', 'componentes', 'vista', 'vistas', 'conteudo', 'rotuloCor']);
export const CAMPOS_FIXOS_SITE = Object.freeze(['nome', 'url', 'regiao', 'variante', 'preVisualizacao']);

export const POR_OMISSAO = Object.freeze({ publicado: true, destaque: false, ordem: 500 });

export const LIMITES = Object.freeze({
  preco: [0.5, 20000], caucao: [0, 5000], stock: [1, 100], prazo: [1, 120], ordem: [0, 9999], letras: [1, 40],
  medida: [1, 1000], porLetra: [0, 100], letrasIncluidas: [0, 40],
  entrega: [0, 1000], gratis: [0, 100000], dias: [0, 365], percentagem: [0, 100],
  cupaoPercentagem: [1, 90], cupaoValor: [0.5, 1000], cupaoMinimo: [0, 100000],
});

export const TAMANHOS = Object.freeze({
  nome: 60, resumo: 220, material: 80, selo: 24, nomeCategoria: 40, frase: 160, nomeOcasiao: 30, descricaoSite: 160,
  morada: 120, localidade: 60, nomeEmpresa: 120, email: 120, url: 200, alt: 200, nomeFoto: 80, codigoCupao: 20,
  descricaoCupao: 120, nomeZona: 40, ondeZona: 120, horario: 80, nomeOficina: 80, exemplo: 40,
});

export const TECTOS = Object.freeze({ produtoBytes: 64 * 1024 });

/* ------------------------------------------------------------------ */
/* Ajudas                                                              */
/* ------------------------------------------------------------------ */

export const eObjecto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const vazio = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
export const numero = (v) => typeof v === 'number' && Number.isFinite(v);
export const dentro = (v, [a, b]) => numero(v) && v >= a && v <= b;
export const inteiro = (v, lim) => Number.isInteger(v) && dentro(v, lim);
export const texto = (v) => (typeof v === 'string' ? v.trim() : '');

export const terminacaoDe = (t) => (typeof t === 'string' && t.endsWith('\n') ? '\n' : '');
export function serializar(obj, terminacao = '\n') { return JSON.stringify(obj, null, 2) + (terminacao || ''); }

/** Lê um documento: texto (o ficheiro), objecto (já lido) ou null (não existe). */
export function lerDocumento(v) {
  if (v === null || v === undefined) return { valor: null, erro: 'falta' };
  if (typeof v !== 'string') return { valor: v, erro: null };
  try { return { valor: JSON.parse(v), erro: null }; } catch (e) { return { valor: null, erro: 'json' }; }
}

export const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugValido = (s) => typeof s === 'string' && s.length <= 100 && RE_SLUG.test(s);
export const nomeDeFotoValido = (n) => typeof n === 'string' && n.length <= TAMANHOS.nomeFoto && RE_SLUG.test(n);

/* Os endereços que uma peça nova não pode ter (as categorias e as páginas da loja vivem em /loja/<id>/). */
export const ENDERECOS_RESERVADOS = Object.freeze(['loja', 'carrinho', 'finalizar', 'obrigado', 'conta', 'favoritos', 'monta', 'inspiracao', 'ajuda', 'sobre', 'contactos', 'termos', 'privacidade', 'propostas', 'media', 'assets', 'admin']);

export function gerarSlug(nome, existentes = [], vazio_ = 'peca') {
  const base = String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '') || vazio_;
  const usados = new Set([...existentes, ...ENDERECOS_RESERVADOS]);
  if (!usados.has(base)) return base;
  for (let i = 2; ; i++) if (!usados.has(`${base}-${i}`)) return `${base}-${i}`;
}

export function nifValido(nif) {
  const n = String(nif ?? '').replace(/\s/g, '');
  if (!/^[1235689]\d{8}$/.test(n) && !/^(45|70|71|72|74|75|77|79|90|91|98|99)\d{7}$/.test(n)) return false;
  const soma = [...n.slice(0, 8)].reduce((s, d, i) => s + Number(d) * (9 - i), 0);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(n[8]);
}

export const RE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const emailValido = (v) => typeof v === 'string' && v.length <= TAMANHOS.email && RE_EMAIL.test(v.trim());

/** Um número português em 9 algarismos (sem +351, espaços nem pontos), ou null. */
export function numeroPortugues(v) {
  const d = String(v ?? '').replace(/[\s.()-]/g, '').replace(/^(\+|00)351/, '');
  return /^[29]\d{8}$/.test(d) ? d : null;
}
export const eTelemovel = (v) => /^9[1236]\d{7}$/.test(numeroPortugues(v) ?? '');
/** O WhatsApp como o wa.me o quer: o indicativo e o número, só algarismos («351912345678»). */
export function numeroWhatsApp(v) {
  const s = String(v ?? '').replace(/[\s.()-]/g, '').replace(/^(\+|00)/, '');
  if (/^9[1236]\d{7}$/.test(s)) return '351' + s;
  return /^[1-9]\d{7,14}$/.test(s) ? s : null;
}
export const codigoPostalValido = (v) => /^\d{4}-\d{3}$/.test(texto(v));
export const urlValido = (v, dominio) => {
  const t = texto(v);
  if (!/^https:\/\/[^\s]+$/.test(t) || t.length > TAMANHOS.url) return false;
  if (!dominio) return true;
  try { const h = new URL(t).hostname.replace(/^www\./, ''); return h === dominio || h.endsWith('.' + dominio); } catch { return false; }
};
export const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(texto(v)) && !Number.isNaN(Date.parse(v + 'T12:00:00Z'));
export const RE_FOCO = /^(\d{1,3})% (\d{1,3})%$/;
export const focoValido = (f) => { const m = RE_FOCO.exec(String(f ?? '')); return Boolean(m) && Number(m[1]) <= 100 && Number(m[2]) <= 100; };

/** Uma peça tem 3D (as fotografias do estúdio, o visualizador): o modelo, a cena de um cenário ou o texto recortado. */
export const temTresD = (p) => eObjecto(p) && Boolean(p.modelo3d || p.cena3d || p.texto3d);
export const noSite = (p) => eObjecto(p) && p.publicado !== false;
export const podeAlugar = (p) => eObjecto(p?.aluguer);
export const podeComprar = (p) => eObjecto(p?.venda);
export const fotosDe = (p) => (Array.isArray(p?.fotos) ? p.fotos.filter((f) => typeof f === 'string') : []);
export const ordemDe = (p) => (numero(p?.ordem) ? p.ordem : POR_OMISSAO.ordem);
/** As cores à escolha de uma peça: as combinações (cenários) ou as cores. */
export const coresDe = (p) => (Array.isArray(p?.combinacoes) ? p.combinacoes.map((c) => c?.id).filter(Boolean) : Array.isArray(p?.cores) ? p.cores.filter((c) => typeof c === 'string') : []);
/** A cor com que a peça aparece (a dos cartões e da partilha): a escolhida, ou «base» (os cenários, numa cor só). */
export const corPrincipal = (p) => (typeof p?.cor === 'string' && p.cor ? p.cor : 'base');

/** Mesmo valor (para saber se um campo fixo mudou): JSON canónico. */
export function mesmoValor(a, b) {
  const canon = (v) => (Array.isArray(v) ? v.map(canon) : eObjecto(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v ?? null);
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

/* ------------------------------------------------------------------ */
/* As regras                                                           */
/* ------------------------------------------------------------------ */

/**
 * Confere os dados e devolve a lista de problemas.
 * @param dados   ver o cabeçalho
 * @param opcoes  { aberta: a loja está aberta (sem pré-visualização) }
 */
export function validar(dados, { aberta = false } = {}) {
  const P = [];
  const add = (p) => P.push(p);
  const lidos = {};
  for (const k of Object.keys(FICHEIROS)) {
    if (!(k in dados)) continue;
    const { valor, erro } = lerDocumento(dados[k]);
    if (erro === 'json') add({ classe: 'bloqueia', chave: `${k}:json`, ficheiro: FICHEIROS[k], ecra: ECRAS[k], mensagem: `O ficheiro ${FICHEIROS[k]} não se lê (não é JSON).` });
    else if (erro === 'falta' && k !== 'fotos') add({ classe: 'bloqueia', chave: `${k}:falta`, ficheiro: FICHEIROS[k], ecra: ECRAS[k], mensagem: `Falta o ficheiro ${FICHEIROS[k]}.` });
    lidos[k] = valor;
  }
  const categorias = Array.isArray(lidos.categorias) ? lidos.categorias : null;
  const idsCategorias = new Set((categorias || []).map((c) => c?.id));
  const idsOcasioes = new Set((Array.isArray(lidos.ocasioes) ? lidos.ocasioes : []).map((o) => o?.id));
  const fotosIndice = eObjecto(lidos.fotos) ? lidos.fotos : {};
  const ficheirosFotos = Array.isArray(dados.ficheirosFotos) ? new Set(dados.ficheirosFotos) : null;

  if ('site' in dados && lidos.site !== null) regrasSite(lidos.site, { aberta, add });
  if ('entregas' in dados && lidos.entregas !== null) regrasEntregas(lidos.entregas, add);
  if ('categorias' in dados && lidos.categorias !== null) regrasCategorias(lidos.categorias, { produtos: dados.produtos, add });
  if ('ocasioes' in dados && lidos.ocasioes !== null) regrasOcasioes(lidos.ocasioes, add);
  if ('cupoes' in dados && lidos.cupoes !== null) regrasCupoes(lidos.cupoes, { idsCategorias: categorias ? idsCategorias : null, add });
  if ('fotos' in dados && lidos.fotos !== null) regrasFotos(lidos.fotos, { ficheirosFotos, add });

  if (eObjecto(dados.produtos)) {
    const produtos = {};
    for (const [id, v] of Object.entries(dados.produtos)) {
      const ficheiro = ficheiroDoProduto(id);
      const { valor, erro } = lerDocumento(v);
      if (erro === 'json' || (!erro && !eObjecto(valor))) { add({ classe: 'neutraliza', efeito: 'esconder', chave: `peca:${id}:json`, ficheiro, ecra: 'Peças', id, mensagem: `A peça «${id}» não se lê: fica fora do site.` }); continue; }
      if (erro === 'falta') continue;
      if (typeof v === 'string' && v.length > TECTOS.produtoBytes) add({ classe: 'neutraliza', efeito: 'esconder', chave: `peca:${id}:grande`, ficheiro, ecra: 'Peças', id, mensagem: `A peça «${id}» tem texto a mais: fica fora do site.` });
      produtos[id] = valor;
    }
    for (const [id, p] of Object.entries(produtos)) regrasPeca(id, p, { produtos, idsCategorias: categorias ? idsCategorias : null, idsOcasioes, fotosIndice, ficheirosFotos, add });
  }
  return P;
}

const ECRAS = Object.freeze({ site: 'Loja', categorias: 'Categorias', ocasioes: 'Categorias › Ocasiões', cupoes: 'Cupões', entregas: 'Loja › Entregas', fotos: 'Fotografias' });

function regrasSite(s, { aberta, add }) {
  const ficheiro = FICHEIROS.site;
  if (!eObjecto(s)) { add({ classe: 'bloqueia', chave: 'site:forma', ficheiro, ecra: 'Loja', mensagem: 'Os dados da loja não têm a forma certa.' }); return; }
  const campo = (nome, ecra, extra) => ({ ficheiro, ecra, campo: nome, ...extra });
  if (vazio(s.nome) || vazio(s.url)) add({ classe: 'bloqueia', chave: 'site:marca', ficheiro, ecra: 'Loja', mensagem: 'Falta o nome ou o endereço da loja.' });
  if (vazio(s.descricao) || texto(s.descricao).length < 50 || texto(s.descricao).length > TAMANHOS.descricaoSite) add({ classe: 'avisa', chave: 'site:descricao', ...campo('descricao', 'Loja › A marca'), mensagem: `A descrição da loja (a que aparece no Google) tem de ter entre 50 e ${TAMANHOS.descricaoSite} letras.` });
  if (vazio(s.frase) || texto(s.frase).length > 60) add({ classe: 'avisa', chave: 'site:frase', ...campo('frase', 'Loja › A marca'), mensagem: 'A frase da marca tem de ter até 60 letras.' });
  if (vazio(s.localidade) || texto(s.localidade).length > TAMANHOS.localidade) add({ classe: 'bloqueia', chave: 'site:localidade', ...campo('localidade', 'Loja › A marca'), mensagem: 'Falta a localidade da loja.' });
  // contactos
  if (!vazio(s.email) && !emailValido(s.email)) add({ classe: 'avisa', chave: 'site:email', ...campo('email', 'Loja › Contactos'), mensagem: 'Este email não parece certo.' });
  if (!vazio(s.telefone) && !numeroPortugues(s.telefone)) add({ classe: 'avisa', chave: 'site:telefone', ...campo('telefone', 'Loja › Contactos'), mensagem: 'O telefone tem 9 algarismos (começa por 2 ou 9).' });
  if (!vazio(s.whatsapp) && !numeroWhatsApp(s.whatsapp)) add({ classe: 'avisa', chave: 'site:whatsapp', ...campo('whatsapp', 'Loja › Contactos'), mensagem: 'O WhatsApp é um número de telemóvel (por exemplo 912 345 678).' });
  if (!vazio(s.instagram) && !urlValido(s.instagram, 'instagram.com')) add({ classe: 'avisa', chave: 'site:instagram', ...campo('instagram', 'Loja › Contactos'), mensagem: 'O Instagram é o endereço da página (https://www.instagram.com/…).' });
  if (!vazio(s.facebook) && !urlValido(s.facebook, 'facebook.com')) add({ classe: 'avisa', chave: 'site:facebook', ...campo('facebook', 'Loja › Contactos'), mensagem: 'O Facebook é o endereço da página (https://www.facebook.com/…).' });
  // a empresa (o que a lei pede para vender: DL 7/2004, art. 10.º)
  const e = eObjecto(s.empresa) ? s.empresa : {};
  if (!eObjecto(s.empresa)) add({ classe: 'bloqueia', chave: 'site:empresa:forma', ficheiro, ecra: 'Loja › Empresa', mensagem: 'Os dados da empresa não têm a forma certa.' });
  if (!vazio(e.nif) && !nifValido(e.nif)) add({ classe: 'avisa', chave: 'site:empresa.nif', ...campo('empresa.nif', 'Loja › Empresa'), mensagem: 'Este NIF não é válido.' });
  if (!vazio(e.codigoPostal) && !codigoPostalValido(e.codigoPostal)) add({ classe: 'avisa', chave: 'site:empresa.codigoPostal', ...campo('empresa.codigoPostal', 'Loja › Empresa'), mensagem: 'O código postal escreve-se 4700-123.' });
  if (!vazio(e.nome) && texto(e.nome).length > TAMANHOS.nomeEmpresa) add({ classe: 'avisa', chave: 'site:empresa.nome:comprido', ...campo('empresa.nome', 'Loja › Empresa'), mensagem: `O nome da empresa tem até ${TAMANHOS.nomeEmpresa} letras.` });
  if (!vazio(e.morada) && texto(e.morada).length > TAMANHOS.morada) add({ classe: 'avisa', chave: 'site:empresa.morada:comprido', ...campo('empresa.morada', 'Loja › Empresa'), mensagem: `A morada tem até ${TAMANHOS.morada} letras.` });
  const obrigatorios = [['empresa.nome', 'o nome da empresa', e.nome], ['empresa.nif', 'o NIF', e.nif], ['empresa.morada', 'a morada', e.morada], ['empresa.codigoPostal', 'o código postal', e.codigoPostal], ['email', 'o email', s.email]];
  for (const [c, nome, v] of obrigatorios) {
    if (!vazio(v)) continue;
    const ecra = c.startsWith('empresa') ? 'Loja › Empresa' : 'Loja › Contactos';
    if (aberta) add({ classe: 'bloqueia', chave: `site:${c}:vazio:aberta`, ...campo(c, ecra), mensagem: `Falta ${nome}: com a loja aberta é obrigatório.` });
    else add({ classe: 'avisa', lembrete: true, chave: `site:${c}:vazio`, ...campo(c, ecra), mensagem: `Falta ${nome} (obrigatório para abrir a loja).` });
  }
  if (vazio(s.telefone) && vazio(s.whatsapp)) {
    if (aberta) add({ classe: 'bloqueia', chave: 'site:telefone:vazio:aberta', ...campo('telefone', 'Loja › Contactos'), mensagem: 'Falta um telefone ou o WhatsApp: com a loja aberta é obrigatório.' });
    else add({ classe: 'avisa', lembrete: true, chave: 'site:telefone:vazio', ...campo('telefone', 'Loja › Contactos'), mensagem: 'Falta um telefone ou o WhatsApp (obrigatório para abrir a loja).' });
  }
}

function regrasEntregas(en, add) {
  const ficheiro = FICHEIROS.entregas;
  const ecra = 'Loja › Entregas';
  if (!eObjecto(en) || !Array.isArray(en.zonas) || !eObjecto(en.envioCompra) || !eObjecto(en.aluguer) || !eObjecto(en.oficina)) {
    add({ classe: 'bloqueia', chave: 'entregas:forma', ficheiro, ecra, mensagem: 'As entregas não têm a forma certa.' });
    return;
  }
  const preco = (v, c, nome, lim = LIMITES.entrega) => { if (!dentro(v, lim)) add({ classe: 'avisa', chave: `entregas:${c}`, ficheiro, ecra, campo: c, mensagem: `${nome}: um valor entre ${lim[0]} e ${lim[1]} €.` }); };
  en.zonas.forEach((z, i) => {
    if (!eObjecto(z) || !slugValido(z.id)) { add({ classe: 'bloqueia', chave: `entregas:zonas.${i}:forma`, ficheiro, ecra, mensagem: `A zona ${i + 1} não tem a forma certa.` }); return; }
    if (vazio(z.nome) || texto(z.nome).length > TAMANHOS.nomeZona) add({ classe: 'avisa', chave: `entregas:zonas.${i}.nome`, ficheiro, ecra, campo: `zonas.${i}.nome`, mensagem: `O nome da zona tem até ${TAMANHOS.nomeZona} letras.` });
    if (vazio(z.descricao) || texto(z.descricao).length > TAMANHOS.ondeZona) add({ classe: 'avisa', chave: `entregas:zonas.${i}.descricao`, ficheiro, ecra, campo: `zonas.${i}.descricao`, mensagem: 'Escreva os concelhos desta zona.' });
    preco(z.preco, `zonas.${i}.preco`, 'O preço da entrega');
  });
  preco(en.montagem, 'montagem', 'A montagem');
  preco(en.envioCompra.preco, 'envioCompra.preco', 'O envio das peças compradas');
  preco(en.envioCompra.gratisAcima, 'envioCompra.gratisAcima', 'O envio grátis a partir de', LIMITES.gratis);
  preco(en.gratisZona1Acima, 'gratisZona1Acima', 'A entrega grátis na primeira zona a partir de', LIMITES.gratis);
  const a = en.aluguer;
  const dias = (v, c, nome) => { if (!inteiro(v, LIMITES.dias)) add({ classe: 'avisa', chave: `entregas:aluguer.${c}`, ficheiro, ecra: 'Loja › Aluguer', campo: `aluguer.${c}`, mensagem: `${nome}: um número de dias.` }); };
  dias(a.antecedenciaMinimaDias, 'antecedenciaMinimaDias', 'A antecedência mínima');
  dias(a.folgaDias, 'folgaDias', 'A folga entre alugueres');
  dias(a.restoDiasAntes, 'restoDiasAntes', 'O resto paga-se');
  if (!dentro(a.atrasoPorDia, LIMITES.entrega)) add({ classe: 'avisa', chave: 'entregas:aluguer.atrasoPorDia', ficheiro, ecra: 'Loja › Aluguer', campo: 'aluguer.atrasoPorDia', mensagem: 'O custo de cada dia de atraso: um valor em euros.' });
  if (!dentro(a.sinal, LIMITES.percentagem)) add({ classe: 'avisa', chave: 'entregas:aluguer.sinal', ficheiro, ecra: 'Loja › Aluguer', campo: 'aluguer.sinal', mensagem: 'O sinal é uma percentagem entre 0 e 100.' });
  if (!eObjecto(a.cancelamento) || !inteiro(a.cancelamento.total, LIMITES.dias) || !inteiro(a.cancelamento.metade, LIMITES.dias)) add({ classe: 'avisa', chave: 'entregas:aluguer.cancelamento', ficheiro, ecra: 'Loja › Aluguer', campo: 'aluguer.cancelamento.total', mensagem: 'Os prazos de cancelamento são números de dias.' });
  else if (a.cancelamento.metade > a.cancelamento.total) add({ classe: 'avisa', chave: 'entregas:aluguer.cancelamento:ordem', ficheiro, ecra: 'Loja › Aluguer', campo: 'aluguer.cancelamento.metade', mensagem: 'A devolução de metade tem de ser mais perto da festa do que a devolução total.' });
  if (vazio(en.oficina.horario) || texto(en.oficina.horario).length > TAMANHOS.horario) add({ classe: 'avisa', chave: 'entregas:oficina.horario', ficheiro, ecra, campo: 'oficina.horario', mensagem: `O horário do levantamento tem até ${TAMANHOS.horario} letras.` });
}

function regrasCategorias(cs, { produtos, add }) {
  const ficheiro = FICHEIROS.categorias;
  if (!Array.isArray(cs) || !cs.length) { add({ classe: 'bloqueia', chave: 'categorias:forma', ficheiro, ecra: 'Categorias', mensagem: 'As categorias não têm a forma certa.' }); return; }
  const vistos = new Set();
  cs.forEach((c, i) => {
    if (!eObjecto(c) || !slugValido(c.id) || vistos.has(c.id)) { add({ classe: 'bloqueia', chave: `categorias:${i}:forma`, ficheiro, ecra: 'Categorias', mensagem: `A categoria ${i + 1} não tem a forma certa.` }); return; }
    vistos.add(c.id);
    const ecra = `Categorias › ${texto(c.nome) || c.id}`;
    if (vazio(c.nome) || texto(c.nome).length > TAMANHOS.nomeCategoria) add({ classe: 'bloqueia', chave: `categoria:${c.id}:nome`, ficheiro, ecra, campo: `${i}.nome`, mensagem: `O nome da categoria tem até ${TAMANHOS.nomeCategoria} letras (e não pode ficar vazio).` });
    if (vazio(c.frase) || texto(c.frase).length > TAMANHOS.frase) add({ classe: 'avisa', chave: `categoria:${c.id}:frase`, ficheiro, ecra, campo: `${i}.frase`, mensagem: `A frase da categoria tem até ${TAMANHOS.frase} letras.` });
    if (c.fundo != null && !FUNDOS[c.fundo]) add({ classe: 'avisa', chave: `categoria:${c.id}:fundo`, ficheiro, ecra, campo: `${i}.fundo`, mensagem: 'Escolha um dos fundos.' });
    if (eObjecto(produtos) && c.capa != null) {
      const { valor: p } = lerDocumento(produtos[c.capa]);
      if (!eObjecto(p)) add({ classe: 'avisa', chave: `categoria:${c.id}:capa`, ficheiro, ecra, campo: `${i}.capa`, mensagem: 'A peça da capa não existe: escolha outra.' });
      else if (!temTresD(p) && !fotosDe(p).length) add({ classe: 'avisa', chave: `categoria:${c.id}:capa:imagem`, ficheiro, ecra, campo: `${i}.capa`, mensagem: 'A peça da capa não tem imagem: escolha outra.' });
      else if (temTresD(p) && c.capaCor != null && c.capaCor !== (p.cor ?? 'base') && !coresDe(p).includes(c.capaCor)) add({ classe: 'avisa', chave: `categoria:${c.id}:capaCor`, ficheiro, ecra, campo: `${i}.capaCor`, mensagem: 'A cor da capa não é uma das cores dessa peça.' });
    }
  });
}

function regrasOcasioes(os, add) {
  const ficheiro = FICHEIROS.ocasioes;
  if (!Array.isArray(os)) { add({ classe: 'bloqueia', chave: 'ocasioes:forma', ficheiro, ecra: 'Categorias › Ocasiões', mensagem: 'As ocasiões não têm a forma certa.' }); return; }
  const vistos = new Set();
  os.forEach((o, i) => {
    if (!eObjecto(o) || !slugValido(o.id) || vistos.has(o.id)) { add({ classe: 'bloqueia', chave: `ocasioes:${i}:forma`, ficheiro, ecra: 'Categorias › Ocasiões', mensagem: `A ocasião ${i + 1} não tem a forma certa.` }); return; }
    vistos.add(o.id);
    if (vazio(o.nome) || texto(o.nome).length > TAMANHOS.nomeOcasiao) add({ classe: 'avisa', chave: `ocasiao:${o.id}:nome`, ficheiro, ecra: 'Categorias › Ocasiões', campo: `${i}.nome`, mensagem: `O nome da ocasião tem até ${TAMANHOS.nomeOcasiao} letras.` });
  });
}

export const TIPOS_CUPAO = Object.freeze({ percentagem: 'Percentagem', valor: 'Valor em euros' });
function regrasCupoes(cs, { idsCategorias, add }) {
  const ficheiro = FICHEIROS.cupoes;
  if (!Array.isArray(cs)) { add({ classe: 'bloqueia', chave: 'cupoes:forma', ficheiro, ecra: 'Cupões', mensagem: 'Os cupões não têm a forma certa.' }); return; }
  const vistos = new Set();
  cs.forEach((c, i) => {
    const cod = texto(c?.codigo).toUpperCase();
    const ecra = `Cupões › ${cod || i + 1}`;
    const neutro = (regra, campo, mensagem) => add({ classe: 'neutraliza', efeito: 'esconder', chave: `cupao:${cod || i}:${regra}`, ficheiro, ecra, campo: `${i}.${campo}`, indice: i, mensagem });
    if (!eObjecto(c)) { neutro('forma', 'codigo', `O cupão ${i + 1} não tem a forma certa: não vale.`); return; }
    if (!/^[A-Z0-9]{3,20}$/.test(cod) || c.codigo !== cod) neutro('codigo', 'codigo', 'O código tem de 3 a 20 letras maiúsculas e algarismos, sem espaços.');
    else if (vistos.has(cod)) neutro('repetido', 'codigo', 'Já há um cupão com este código.');
    vistos.add(cod);
    if (!TIPOS_CUPAO[c.tipo]) neutro('tipo', 'tipo', 'Escolha percentagem ou valor.');
    else if (!dentro(c.valor, c.tipo === 'percentagem' ? LIMITES.cupaoPercentagem : LIMITES.cupaoValor)) neutro('valor', 'valor', c.tipo === 'percentagem' ? 'A percentagem é de 1 a 90.' : 'O desconto é de 0,50 € a 1000 €.');
    if (c.minimo != null && !dentro(c.minimo, LIMITES.cupaoMinimo)) neutro('minimo', 'minimo', 'O mínimo é um valor em euros.');
    if (vazio(c.descricao) || texto(c.descricao).length > TAMANHOS.descricaoCupao) add({ classe: 'avisa', chave: `cupao:${cod || i}:descricao`, ficheiro, ecra, campo: `${i}.descricao`, mensagem: `A frase do cupão tem até ${TAMANHOS.descricaoCupao} letras.` });
    if (c.validade != null && !dataValida(c.validade)) neutro('validade', 'validade', 'A validade é uma data.');
    if (c.categorias != null && (!Array.isArray(c.categorias) || (idsCategorias && c.categorias.some((k) => !idsCategorias.has(k))))) neutro('categorias', 'categorias', 'O cupão aponta para uma categoria que não existe.');
  });
}

function regrasFotos(fs, { ficheirosFotos, add }) {
  const ficheiro = FICHEIROS.fotos;
  if (!eObjecto(fs)) { add({ classe: 'bloqueia', chave: 'fotos:forma', ficheiro, ecra: 'Fotografias', mensagem: 'As descrições das fotografias não têm a forma certa.' }); return; }
  for (const [nome, f] of Object.entries(fs)) {
    if (!nomeDeFotoValido(nome) || !eObjecto(f)) { add({ classe: 'avisa', chave: `foto:${nome}:forma`, ficheiro, ecra: 'Fotografias', foto: nome, mensagem: `A fotografia «${nome}» não tem a forma certa.` }); continue; }
    if (vazio(f.alt) || texto(f.alt).length > TAMANHOS.alt) add({ classe: 'avisa', lembrete: vazio(f.alt), chave: `foto:${nome}:alt`, ficheiro, ecra: 'Fotografias', campo: `${nome}.alt`, foto: nome, mensagem: vazio(f.alt) ? 'Falta a descrição desta fotografia (para quem não a vê).' : `A descrição tem até ${TAMANHOS.alt} letras.` });
    if (f.foco != null && !focoValido(f.foco)) add({ classe: 'avisa', chave: `foto:${nome}:foco`, ficheiro, ecra: 'Fotografias', campo: `${nome}.foco`, foto: nome, mensagem: 'O ponto de foco não é válido.' });
    if (ficheirosFotos && !ficheirosFotos.has(nome)) add({ classe: 'avisa', chave: `foto:${nome}:sem-ficheiro`, ficheiro, ecra: 'Fotografias', foto: nome, mensagem: `A fotografia «${nome}» já não existe.` });
  }
}

function regrasPeca(id, p, { produtos, idsCategorias, idsOcasioes, fotosIndice, ficheirosFotos, add }) {
  const ficheiro = ficheiroDoProduto(id);
  const ecra = `Peças › ${texto(p.nome) || id}`;
  const esconder = (regra, campo, mensagem) => add({ classe: 'neutraliza', efeito: 'esconder', chave: `peca:${id}:${regra}`, ficheiro, ecra, id, ...(campo ? { campo } : {}), mensagem });
  const avisa = (regra, campo, mensagem, extra = {}) => add({ classe: 'avisa', chave: `peca:${id}:${regra}`, ficheiro, ecra, id, ...(campo ? { campo } : {}), mensagem, ...extra });
  if (!slugValido(id) || ENDERECOS_RESERVADOS.includes(id)) esconder('endereco', null, `O endereço «${id}» não serve para uma peça.`);
  if (p.id != null && p.id !== id) esconder('id', null, `A peça «${id}» diz que é «${p.id}».`);
  if (vazio(p.nome)) esconder('nome', 'nome', 'Falta o nome: a peça fica fora do site.');
  else if (texto(p.nome).length > TAMANHOS.nome) avisa('nome:comprido', 'nome', `O nome tem até ${TAMANHOS.nome} letras.`);
  if (vazio(p.resumo)) esconder('resumo', 'resumo', 'Falta a frase: a peça fica fora do site.');
  else if (texto(p.resumo).length > TAMANHOS.resumo) avisa('resumo:comprido', 'resumo', `A frase tem até ${TAMANHOS.resumo} letras.`);
  if (idsCategorias && !idsCategorias.has(p.categoria)) esconder('categoria', 'categoria', 'Escolha a categoria: a peça fica fora do site até ter uma.');
  // aluguer e venda
  if (!podeAlugar(p) && !podeComprar(p)) esconder('modo', 'aluguer', 'A peça tem de se alugar, de se vender, ou as duas coisas.');
  if (p.aluguer != null && !eObjecto(p.aluguer)) esconder('aluguer:forma', 'aluguer', 'O aluguer não tem a forma certa.');
  if (podeAlugar(p)) {
    const a = p.aluguer;
    const temTamanhos = Array.isArray(p.tamanhos) && p.tamanhos.some((t) => t?.aluguer != null);
    if (!temTamanhos && !dentro(a.preco, LIMITES.preco)) esconder('aluguer.preco', 'aluguer.preco', 'Falta o preço do aluguer (de 0,50 € a 20 000 €).');
    if (!dentro(a.caucao ?? 0, LIMITES.caucao)) esconder('aluguer.caucao', 'aluguer.caucao', 'A caução é um valor entre 0 € e 5000 €.');
    if (!inteiro(a.stock, LIMITES.stock)) esconder('aluguer.stock', 'aluguer.stock', 'Quantas peças há para alugar: de 1 a 100.');
  }
  if (p.venda != null && !eObjecto(p.venda)) esconder('venda:forma', 'venda', 'A venda não tem a forma certa.');
  if (podeComprar(p)) {
    const v = p.venda;
    const temTamanhos = Array.isArray(p.tamanhos) && p.tamanhos.some((t) => t?.venda != null);
    if (!temTamanhos && !dentro(v.preco, LIMITES.preco)) esconder('venda.preco', 'venda.preco', 'Falta o preço de venda (de 0,50 € a 20 000 €).');
    if (!inteiro(v.prazo, LIMITES.prazo)) esconder('venda.prazo', 'venda.prazo', 'O prazo de fabrico é um número de dias úteis (de 1 a 120).');
    if (v.porLetra != null && !dentro(v.porLetra, LIMITES.porLetra)) esconder('venda.porLetra', 'venda.porLetra', 'O preço de cada letra a mais é de 0 € a 100 €.');
    if (v.letrasIncluidas != null && !inteiro(v.letrasIncluidas, LIMITES.letrasIncluidas)) esconder('venda.letrasIncluidas', 'venda.letrasIncluidas', 'As letras incluídas são de 0 a 40.');
  }
  if (Array.isArray(p.tamanhos)) p.tamanhos.forEach((t, i) => {
    if (!eObjecto(t) || vazio(t.id) || vazio(t.nome)) { esconder(`tamanhos.${i}`, null, 'Um tamanho não tem a forma certa.'); return; }
    if (podeAlugar(p) && t.aluguer != null && !dentro(t.aluguer, LIMITES.preco)) esconder(`tamanhos.${i}.aluguer`, `tamanhos.${i}.aluguer`, `O aluguer do tamanho «${t.nome}» é de 0,50 € a 20 000 €.`);
    if (podeComprar(p) && t.venda != null && !dentro(t.venda, LIMITES.preco)) esconder(`tamanhos.${i}.venda`, `tamanhos.${i}.venda`, `A venda do tamanho «${t.nome}» é de 0,50 € a 20 000 €.`);
  });
  // cores
  const cores = coresDe(p);
  if (!Array.isArray(p.combinacoes) && p.cores != null && (!Array.isArray(p.cores) || p.cores.some((c) => !CORES[c]))) esconder('cores', 'cores', 'Uma das cores não existe.');
  if (p.cor != null && cores.length && !cores.includes(p.cor) && p.cor !== 'base') esconder('cor', 'cor', 'A cor principal tem de ser uma das cores da peça.');
  // imagens: as fotografias do estúdio (3D) ou as fotografias da biblioteca
  const fotos = fotosDe(p);
  if (p.fotos != null && (!Array.isArray(p.fotos) || p.fotos.some((f) => !nomeDeFotoValido(f)))) avisa('fotos:forma', 'fotos', 'Uma das fotografias tem um nome que não serve.');
  if (new Set(fotos).size !== fotos.length) avisa('fotos:repetida', 'fotos', 'A mesma fotografia aparece duas vezes.');
  fotos.forEach((f, i) => {
    if (ficheirosFotos && !ficheirosFotos.has(f)) add({ classe: 'neutraliza', efeito: 'sem_fotografia', chave: `peca:${id}:foto:${f}`, ficheiro, ecra, id, foto: f, campo: `fotos.${i}`, mensagem: `A fotografia «${f}» já não existe: não aparece.` });
    else if (fotosIndice && !eObjecto(fotosIndice[f])) avisa(`foto:${f}:sem-descricao`, `fotos.${i}`, 'Falta a descrição desta fotografia.', { lembrete: true, foto: f });
  });
  const fotosQueHa = ficheirosFotos ? fotos.filter((f) => ficheirosFotos.has(f)) : fotos;
  if (!temTresD(p) && !fotosQueHa.length) esconder('sem-imagem', 'fotos', 'Junte pelo menos uma fotografia: sem ela a peça fica fora do site.');
  // onde aparece
  if (Array.isArray(p.ocasioes)) p.ocasioes.forEach((o, i) => { if (idsOcasioes.size && !idsOcasioes.has(o)) avisa(`ocasiao:${o}`, `ocasioes.${i}`, `A ocasião «${o}» não existe.`); });
  if (p.publicado != null && typeof p.publicado !== 'boolean') avisa('publicado', 'publicado', '«Publicado no site» é sim ou não.');
  if (p.destaque != null && typeof p.destaque !== 'boolean') avisa('destaque', 'destaque', '«Em destaque» é sim ou não.');
  if (p.ordem != null && !dentro(p.ordem, LIMITES.ordem)) avisa('ordem', 'ordem', 'A posição não é válida.');
  if (p.selo != null && (typeof p.selo !== 'string' || texto(p.selo).length > TAMANHOS.selo)) avisa('selo', 'selo', `O selo tem até ${TAMANHOS.selo} letras.`);
  if (p.fundo != null && !FUNDOS[p.fundo]) avisa('fundo', 'fundo', 'Escolha um dos fundos.');
  if (p.material != null && (typeof p.material !== 'string' || texto(p.material).length > TAMANHOS.material)) avisa('material', 'material', `O material tem até ${TAMANHOS.material} letras.`);
  if (p.medidas != null) {
    const m = p.medidas;
    if (!eObjecto(m) || !dentro(m.l, LIMITES.medida) || !dentro(m.a, LIMITES.medida) || (m.p != null && !dentro(m.p, LIMITES.medida))) avisa('medidas', 'medidas.l', 'As medidas são em centímetros, de 1 a 1000.');
  }
  if (p.personalizavel != null) {
    const pe = p.personalizavel;
    if (!eObjecto(pe) || !inteiro(pe.maxLetras, LIMITES.letras)) esconder('personalizavel', 'personalizavel.maxLetras', 'O máximo de letras do nome é de 1 a 40.');
    else if (vazio(pe.exemplo) || texto(pe.exemplo).length > pe.maxLetras) avisa('personalizavel.exemplo', 'personalizavel.exemplo', `O nome de exemplo tem até ${pe.maxLetras} letras.`);
  }
  // um cenário: as peças dele existem e estão no site
  if (Array.isArray(p.componentes)) p.componentes.forEach((c, i) => {
    const { valor: q } = lerDocumento(eObjecto(produtos) ? produtos[c?.id] ?? null : null);
    if (!eObjecto(q)) esconder(`componente:${c?.id}`, null, `O cenário usa a peça «${c?.id}», que não existe.`);
    else if (!noSite(q)) avisa(`componente:${c.id}:escondida`, null, `O cenário usa «${texto(q.nome) || c.id}», que não está no site.`);
  });
}

/* ------------------------------------------------------------------ */
/* O que o gerador faz com os problemas                                */
/* ------------------------------------------------------------------ */

/** As peças que ficam fora do site, as fotografias que não aparecem (por peça) e os cupões que não valem. */
export function neutralizar(problemas) {
  const pecas = new Set(), cupoes = new Set(), fotos = new Map();
  for (const p of problemas) {
    if (p.classe !== 'neutraliza') continue;
    if (p.efeito === 'esconder' && p.id) pecas.add(p.id);
    if (p.efeito === 'esconder' && p.chave.startsWith('cupao:')) cupoes.add(p.indice);
    if (p.efeito === 'sem_fotografia' && p.id) fotos.set(p.id, new Set([...(fotos.get(p.id) || []), p.foto]));
  }
  return { pecas, cupoes, fotos };
}

export const bloqueios = (problemas) => problemas.filter((p) => p.classe === 'bloqueia');
export const lembretes = (problemas) => problemas.filter((p) => p.lembrete);
