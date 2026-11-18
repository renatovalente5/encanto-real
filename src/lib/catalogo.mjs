// A entrada de uma peça no catálogo do browser (catalogo.json e a ficha de cada peça).
import { euros, precoDesde, podeAlugar } from '../scripts/regras.js';

export function entradaCatalogo(p, { nomeCat = {}, nomeOc = {} } = {}) {
  return {
    id: p.id, nome: p.nome, resumo: p.resumo, categoria: p.categoria, categoriaNome: nomeCat[p.categoria],
    ocasioes: p.ocasioes, ocasioesNomes: (p.ocasioes || []).map((o) => nomeOc[o]),
    cor: p.cor, cores: p.cores || null, combinacoes: p.combinacoes || null, tamanhos: p.tamanhos || null,
    aluguer: p.aluguer, venda: p.venda, personalizavel: p.personalizavel || null, digitos: p.digitos || false,
    componentes: p.componentes || null, poupanca: p.poupanca || 0, fundo: p.fundo, selo: p.selo,
    medidas: p.medidas,
    precoTexto: podeAlugar(p) ? `${euros(precoDesde(p, 'aluguer'))}/evento` : euros(precoDesde(p, 'compra')),
  };
}
