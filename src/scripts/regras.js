// Regras da loja: preços, caução, entregas, cupões e datas. Um só ficheiro para o gerador (Node) e para o
// browser (carrinho, finalizar, conta). Sem dependências e sem DOM.
// Quando a loja passar para a Cloudflare, o Worker usa ESTA cópia para conferir o total antes de cobrar.

export const IVA = 0.23;

export function euros(v, { semCentimosRedondos = true } = {}) {
  const n = Math.round(v * 100) / 100;
  if (semCentimosRedondos && Number.isInteger(n)) return `${n.toLocaleString('pt-PT')} €`;
  return `${n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// ------------------------------------------------------------------------------------------- preços
export function tamanhoDe(prod, idTamanho) {
  if (!prod.tamanhos?.length) return null;
  return prod.tamanhos.find((t) => t.id === idTamanho) || prod.tamanhos[0];
}

export function podeAlugar(prod) { return !!prod.aluguer; }
export function podeComprar(prod) { return !!prod.venda; }

// preço de uma unidade no modo pedido ('aluguer' | 'compra')
export function precoUnitario(prod, modo, { tamanho, texto } = {}) {
  const t = tamanhoDe(prod, tamanho);
  if (modo === 'aluguer') {
    if (!prod.aluguer) return null;
    return t?.aluguer ?? prod.aluguer.preco;
  }
  if (!prod.venda) return null;
  let p = t?.venda ?? prod.venda.preco;
  if (prod.personalizavel && prod.venda.porLetra) {
    const letras = (texto || prod.personalizavel.exemplo || '').replace(/\s+/g, '').length;
    p += Math.max(0, letras - (prod.venda.letrasIncluidas || 0)) * prod.venda.porLetra;
  }
  return p;
}

export function caucaoUnitaria(prod) { return prod.aluguer?.caucao || 0; }

// o «desde» de um cartão
export function precoDesde(prod, modo) {
  const lista = prod.tamanhos?.length
    ? prod.tamanhos.map((t) => (modo === 'aluguer' ? t.aluguer : t.venda)).filter((x) => x != null)
    : [modo === 'aluguer' ? prod.aluguer?.preco : prod.venda?.preco].filter((x) => x != null);
  return lista.length ? Math.min(...lista) : null;
}

// quanto se poupa num cenário face às peças avulsas (aluguer)
export function poupancaCenario(cenario, produtosPorId) {
  if (!cenario.componentes || !cenario.aluguer) return 0;
  let soma = 0;
  for (const c of cenario.componentes) {
    const p = produtosPorId[c.id];
    if (!p) continue;
    soma += precoUnitario(p, 'aluguer', { tamanho: c.tamanho }) || 0;
  }
  return Math.max(0, soma - cenario.aluguer.preco);
}

// ------------------------------------------------------------------------------------------- datas
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function iso(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function deIso(s) {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}
export function somarDias(s, n) {
  const d = deIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function dataLonga(s) {
  const d = deIso(s);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
export function dataCurta(s) {
  const d = deIso(s);
  return `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
}
export const NOMES_MESES = MESES;

// o aluguer de uma festa: levanta-se na véspera e devolve-se no dia a seguir (ao domingo passa a segunda)
export function janelaAluguer(dataFesta) {
  const levantar = somarDias(dataFesta, -1);
  let devolver = somarDias(dataFesta, 1);
  if (deIso(devolver).getDay() === 0) devolver = somarDias(devolver, 1);
  return { levantar, festa: dataFesta, devolver };
}

// festa de segunda a quinta: as peças estariam paradas, por isso o aluguer fica mais barato
export const DESCONTO_SEMANA = 15;
export function eDiaDeSemana(s) {
  if (!s) return false;
  const d = deIso(s).getDay();
  return d >= 1 && d <= 4;
}

export function primeiraDataPossivel(hoje = iso(new Date()), antecedencia = 3) {
  return somarDias(hoje, antecedencia);
}

// Pré-visualização: reservas de exemplo, sempre as mesmas, para o calendário mostrar dias ocupados.
// Na loja a sério vêm do servidor. Devolve quantas unidades estão ocupadas nesse dia.
export function ocupadasExemplo(idProduto, dataIso) {
  let h = 0;
  for (const c of idProduto + dataIso) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const d = deIso(dataIso);
  const fimDeSemana = d.getDay() === 6 || d.getDay() === 0;
  const r = h % 100;
  if (fimDeSemana && r < 12) return 99; // esgotado nesse dia
  if (fimDeSemana && r < 40) return 1;
  if (r < 3) return 99;
  return 0;
}

export function disponiveis(prod, dataIso, ocupadas = ocupadasExemplo) {
  const stock = prod.aluguer?.stock ?? 0;
  if (!stock) return 0;
  // o dia da festa e a véspera/dia seguinte contam (a peça está fora)
  const j = janelaAluguer(dataIso);
  const ocup = Math.max(ocupadas(prod.id, j.levantar), ocupadas(prod.id, j.festa), ocupadas(prod.id, j.devolver));
  return Math.max(0, stock - ocup);
}

// ------------------------------------------------------------------------------------------- entregas
// Zonas pelo código postal (os 4 primeiros dígitos). Esposende como base (a confirmar).
const ZONAS_CP = [
  { zona: 'z1', prefixos: ['4740', '4750', '4755', '4490', '4495', '4570'] },
  { zona: 'z2', prefixos: ['4900', '4904', '4905', '4910', '4925', '4935', '4480', '4485', '4486', '4487', '4700', '4705', '4710', '4715', '4719', '4760', '4764', '4765', '4770', '4775'] },
  { zona: 'z3', prefixos: ['4000', '4050', '4099', '4100', '4150', '4200', '4249', '4250', '4300', '4350', '4400', '4410', '4420', '4430', '4435', '4440', '4445', '4450', '4455', '4460', '4465', '4470', '4475', '4800', '4805', '4810', '4815', '4820', '4825', '4830', '4835', '4990'] },
];

export function validarCodigoPostal(cp) {
  return /^\d{4}-\d{3}$/.test((cp || '').trim());
}

export function zonaDoCodigoPostal(cp) {
  const m = /^(\d{4})/.exec((cp || '').trim());
  if (!m) return null;
  for (const z of ZONAS_CP) if (z.prefixos.includes(m[1])) return z.zona;
  return 'fora';
}

// modos de entrega: 'levantamento' | 'entrega' (com recolha, nos alugueres) | 'transportadora' (só compras)
export function custoEntrega({ modo, zona, montagem, temAluguer, temCompra, subtotalCompra, subtotal = 0 }, entregas) {
  if (modo === 'levantamento') return 0;
  if (modo === 'transportadora') {
    if (temAluguer) return null; // peças alugadas não vão por transportadora
    const e = entregas.envioCompra;
    return subtotalCompra >= e.gratisAcima ? 0 : e.preco;
  }
  const z = entregas.zonas.find((x) => x.id === zona);
  if (!z) return null; // fora da zona: orçamento à parte
  const gratis = entregas.gratisZona1Acima && zona === 'z1' && subtotal >= entregas.gratisZona1Acima;
  return (gratis ? 0 : z.preco) + (montagem ? entregas.montagem : 0);
}

// ------------------------------------------------------------------------------------------- cupões
export function validarCupao(codigo, { cupoes, linhas, produtosPorId, hoje = iso(new Date()), primeiraEncomenda = true, usados = [] }) {
  const c = cupoes.find((x) => x.codigo === (codigo || '').trim().toUpperCase());
  if (!c) return { ok: false, motivo: 'Este código não existe.' };
  if (c.validade && hoje > c.validade) return { ok: false, motivo: 'Este código já terminou.' };
  if (usados.includes(c.codigo)) return { ok: false, motivo: 'Já usou este código.' };
  if (c.primeiraEncomenda && !primeiraEncomenda) return { ok: false, motivo: 'Este código é só para a primeira encomenda.' };
  if (c.soClientes && primeiraEncomenda) return { ok: false, motivo: 'Este código é para a próxima festa, depois da primeira encomenda.' };
  const elegiveis = linhas.filter((l) => !c.categorias || c.categorias.includes(produtosPorId[l.id]?.categoria));
  const base = elegiveis.reduce((s, l) => s + l.total, 0);
  if (!elegiveis.length) return { ok: false, motivo: 'Este código não se aplica a estas peças.' };
  const subtotal = linhas.reduce((s, l) => s + l.total, 0);
  if (c.minimo && subtotal < c.minimo) return { ok: false, motivo: `Este código pede um mínimo de ${euros(c.minimo)}.` };
  return { ok: true, cupao: c, base };
}

// ------------------------------------------------------------------------------------------- totais
// itens do carrinho: { id, modo, cor, tamanho, texto, digito, qtd }
export function calcular(itens, { produtosPorId, entregas, cupoes = [], codigo = null, entrega = { modo: 'levantamento' }, festa = null, pagamento = 'total', hoje, primeiraEncomenda = true, usados = [] }) {
  const linhas = [];
  for (const it of itens) {
    const p = produtosPorId[it.id];
    if (!p) continue;
    const unit = precoUnitario(p, it.modo, it);
    if (unit == null) continue;
    const qtd = Math.max(1, Math.min(20, it.qtd | 0 || 1));
    linhas.push({ ...it, qtd, unit, total: unit * qtd, caucao: it.modo === 'aluguer' ? caucaoUnitaria(p) * qtd : 0 });
  }
  const subtotal = linhas.reduce((s, l) => s + l.total, 0);
  const caucao = linhas.reduce((s, l) => s + l.caucao, 0);
  const temAluguer = linhas.some((l) => l.modo === 'aluguer');
  const temCompra = linhas.some((l) => l.modo === 'compra');
  const subtotalAluguer = linhas.filter((l) => l.modo === 'aluguer').reduce((s, l) => s + l.total, 0);
  const subtotalCompra = subtotal - subtotalAluguer;
  const envio = custoEntrega({ ...entrega, temAluguer, temCompra, subtotalCompra, subtotal }, entregas);

  // descontos: o de dia de semana (automático) e o do cupão não se juntam; fica o maior
  const descontoSemana = temAluguer && eDiaDeSemana(festa) ? Math.round(subtotalAluguer * DESCONTO_SEMANA) / 100 : 0;
  let descontoCupao = 0;
  let cupao = null;
  let erroCupao = null;
  if (codigo) {
    const v = validarCupao(codigo, { cupoes, linhas, produtosPorId, hoje, primeiraEncomenda, usados });
    if (!v.ok) erroCupao = v.motivo;
    else {
      cupao = v.cupao;
      if (cupao.tipo === 'percentagem') descontoCupao = Math.round(v.base * cupao.valor) / 100;
      else if (cupao.tipo === 'valor') descontoCupao = Math.min(cupao.valor, v.base);
    }
  }
  let desconto = 0;
  let motivoDesconto = null;
  if (descontoCupao >= descontoSemana && descontoCupao > 0) { desconto = descontoCupao; motivoDesconto = 'cupao'; }
  else if (descontoSemana > 0) {
    desconto = descontoSemana; motivoDesconto = 'semana';
    if (cupao) erroCupao = `O desconto de dia de semana (${DESCONTO_SEMANA} %) é maior: ficou esse.`;
  }
  const total = Math.max(0, subtotal - desconto + (envio || 0) + caucao);
  // sinal: 50 % do aluguer agora; o resto (e a caução e a entrega) 7 dias antes da festa
  const sinalPossivel = temAluguer && !temCompra;
  const aPagarAgora = pagamento === 'sinal' && sinalPossivel ? Math.round((subtotalAluguer - desconto) * 50) / 100 : total;
  return { linhas, subtotal, subtotalAluguer, subtotalCompra, caucao, envio, desconto, motivoDesconto, descontoSemana, cupao, erroCupao, total, aPagarAgora, sinalPossivel, temAluguer, temCompra };
}

// o IVA que está dentro de um preço com IVA
export function ivaIncluido(v) { return Math.round((v - v / (1 + IVA)) * 100) / 100; }
