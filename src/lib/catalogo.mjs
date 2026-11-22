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
    tresD: p._tresD !== false,
    imagem: p._tresD === false && p._fotos?.[0] ? { tipo: 'foto', ficheiros: p._fotos[0].ficheiros, foco: p._fotos[0].foco } : null,
    fotos: (p._fotos || []).map((f) => ({ nome: f.nome, alt: f.alt, foco: f.foco, ficheiros: f.ficheiros })),
    precoTexto: podeAlugar(p) ? `${euros(precoDesde(p, 'aluguer'))}/evento` : euros(precoDesde(p, 'compra')),
  };
}
