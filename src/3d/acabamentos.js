// As cores e acabamentos das peças (nome para o cliente, cor da amostra, como reage à luz no 3D).
// Sem three.js: o site usa isto nas amostras de cor sem carregar o 3D.
export const ACABAMENTOS = {
  branco:  { nome: 'Branco',          hex: '#F3F1EC', rugosidade: 0.52 },
  marfim:  { nome: 'Marfim',          hex: '#EFE3CB', rugosidade: 0.52 },
  rosa:    { nome: 'Rosa',            hex: '#E9BDBB', rugosidade: 0.52 },
  lilas:   { nome: 'Lilás',           hex: '#C9BADB', rugosidade: 0.52 },
  azul:    { nome: 'Azul-bebé',       hex: '#B8D0DF', rugosidade: 0.52 },
  salvia:  { nome: 'Verde-sálvia',    hex: '#A7B596', rugosidade: 0.52 },
  verde:   { nome: 'Verde-real',      hex: '#55613D', rugosidade: 0.5 },
  terracota:{ nome: 'Terracota',      hex: '#C9805F', rugosidade: 0.55 },
  mostarda:{ nome: 'Mostarda',        hex: '#D8A94E', rugosidade: 0.55 },
  preto:   { nome: 'Preto',           hex: '#2B2B29', rugosidade: 0.45 },
  dourado: { nome: 'Dourado',         hex: '#E6C77F', rugosidade: 0.34, metal: 0.82 },
  madeira: { nome: 'Madeira natural', hex: '#D7B58B', rugosidade: 0.78, madeira: true },
};
