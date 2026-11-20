// A lista de peças 3D de um produto numa cor (ou combinação), tamanho, número ou nome.
// Sem three.js: usado pelo estúdio das fotografias (Node) e pela ficha do site (browser).
export const corDe = (prod) => prod.cor ?? 'base';

export function itensDe(prod, cor = corDe(prod), { tamanho = null, digito = null, texto = null } = {}) {
  if (prod.cena3d) {
    // conjunto de peças da mesma cor (ex.: lua e estrela): a cor pinta todas; os cenários ficam como estão
    if (!prod.cores) return prod.cena3d;
    return prod.cena3d.map((it) => ({ ...it, opcoes: { ...(it.opcoes || {}), cor } }));
  }
  if (prod.texto3d) {
    const t = { ...prod.texto3d, cor, nome: prod.id };
    if (digito != null && prod.digitos) t.texto = String(digito);
    if (texto && prod.personalizavel) t.texto = texto;
    return [{ texto: t, rotulo: prod.nome }];
  }
  const comb = prod.combinacoes?.find((c) => c.id === cor);
  const opcoesTam = (tamanho && prod.tamanhos?.find((t) => t.id === tamanho)?.opcoes3d) || {};
  const opcoes = { ...(prod.modelo3d.opcoes || {}), ...opcoesTam };
  // peças com o nome gravado ou em relevo (quadro, enfeite, balão): o nome escrito, ou o do exemplo
  if (prod.personalizavel) opcoes.nome = texto || prod.personalizavel.exemplo;
  if (comb) opcoes.cores = comb.cores;
  else if (prod.modelo3d.id === 'trio-cilindros') opcoes.cores = [cor, cor, cor];
  else opcoes.cor = cor;
  return [{ modelo: prod.modelo3d.id, opcoes, rotulo: prod.nome }];
}

export function coresDe(prod) {
  if (prod.combinacoes) return prod.combinacoes.map((c) => c.id);
  return prod.cores || [corDe(prod)];
}
