// Composições prontas (sem three.js: só a lista de peças). Usadas nas fotografias da capa e no 3D ao vivo.
export function palco({ arco = 'rosa', cilindros = 'branco', vazado = 'branco', baloes = ['rosa', 'branco', 'marfim'], boleira = 'dourado' } = {}) {
  return [
    { modelo: 'arco-triplo', opcoes: { cor: arco }, pos: [0, 0, -0.45], papel: 'arco' },
    { modelo: 'baloes', opcoes: { cores: baloes, pontos: [[-0.95, 0.25, -0.1], [-0.92, 1.25, -0.05], [-0.55, 2.05, -0.12], [0.1, 2.38, -0.2], [0.55, 2.3, -0.25]], n: 54 }, papel: 'baloes' },
    { modelo: 'cilindro-vazado', opcoes: { cor: vazado }, pos: [-0.5, 0, 0.18], papel: 'vazado' },
    { modelo: 'boleira', opcoes: { cor: boleira }, pos: [-0.5, 0.9, 0.18], papel: 'boleira' },
    { modelo: 'trio-cilindros', opcoes: { cores: [cilindros, cilindros, cilindros], medidas: [[0.5, 0.7], [0.4, 0.5], [0.34, 0.35]] }, pos: [0.42, 0, 0.12], papel: 'cilindros' },
    { modelo: 'mesa-ripas', opcoes: { diametro: 0.5, altura: 0.46 }, pos: [1.05, 0, 0.55], papel: 'mesa' },
  ];
}

export const PALETAS_PALCO = {
  rosa: { arco: 'rosa', cilindros: 'branco', vazado: 'branco', baloes: ['rosa', 'branco', 'marfim'] },
  salvia: { arco: 'salvia', cilindros: 'marfim', vazado: 'branco', baloes: ['salvia', 'branco', 'marfim'] },
  lilas: { arco: 'lilas', cilindros: 'branco', vazado: 'branco', baloes: ['lilas', 'branco', 'rosa'] },
  branco: { arco: 'branco', cilindros: 'branco', vazado: 'branco', baloes: ['branco', 'marfim', 'dourado'] },
};
