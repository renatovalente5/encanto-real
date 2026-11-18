// Semeia o conteúdo inicial da loja (content/): categorias, ocasiões, peças, cenários, cupões, entregas.
// Só corre uma vez (ou com --refazer): depois disto, quem manda é o content/ (e, mais tarde, o backoffice).
// Os preços são de EXEMPLO (o Kelvin: «pode ser 50–100… depois vamos fazer um cálculo sobre cada produto»).
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const C = join(RAIZ, 'content');
const refazer = process.argv.includes('--refazer');

const CORES_LACADO = ['branco', 'marfim', 'rosa', 'lilas', 'azul', 'salvia', 'verde'];
const TODAS = ['aniversario', 'batizado', 'baby-shower', 'cha-revelacao', 'casamento', 'comunhao', 'empresa'];
const F = {
  numeros: '/media/fontes-3d/LilitaOne-Regular.ttf',
  nomes: '/media/fontes-3d/Pacifico-Regular.ttf',
  serifa: '/media/fontes-3d/DMSerifDisplay-Regular.ttf',
};

const categorias = [
  { id: 'arcos-e-paineis', nome: 'Arcos e painéis', frase: 'O fundo da festa: arcos em degrau, painéis romanos e redondos.', capa: 'arco-triplo-real', capaCor: 'branco', fundo: 'rosa' },
  { id: 'cilindros-e-mesas', nome: 'Cilindros e mesas', frase: 'Onde pousam o bolo, os doces e as flores.', capa: 'trio-cilindros', capaCor: 'branco', fundo: 'azul' },
  { id: 'figuras-e-letras', nome: 'Figuras e letras', frase: 'O nome, a idade e o tema, recortados em MDF.', capa: 'coroa-real', capaCor: 'branco', fundo: 'verde' },
  { id: 'cenarios', nome: 'Cenários completos', frase: 'Peças que já combinam, num só aluguer e com desconto.', capa: 'cenario-encanto', capaCor: 'base', fundo: 'salvia' },
];

const ocasioes = [
  { id: 'aniversario', nome: 'Aniversário' },
  { id: 'batizado', nome: 'Batizado' },
  { id: 'baby-shower', nome: 'Baby shower' },
  { id: 'cha-revelacao', nome: 'Chá revelação' },
  { id: 'casamento', nome: 'Casamento' },
  { id: 'comunhao', nome: 'Comunhão' },
  { id: 'empresa', nome: 'Empresas' },
];

// vista: az/el da fotografia principal; fundo: a cor do azulejo do cartão (pastel da marca)
const p = (o) => ({
  ocasioes: TODAS,
  material: 'MDF lacado, acabamento acetinado',
  aluguer: null,
  venda: null,
  selo: null,
  destaque: false,
  vista: { az: 26, el: 10 },
  ...o,
});

const produtos = [
  // ------------------------------------------------------------------ arcos e painéis
  p({
    id: 'arco-triplo-real', nome: 'Arco Triplo Real', categoria: 'arcos-e-paineis',
    resumo: 'Três arcos em degrau, abertos ao centro. Emoldura a mesa do bolo e todas as fotografias.',
    modelo3d: { id: 'arco-triplo' }, cores: CORES_LACADO, cor: 'branco',
    medidas: { l: 140, a: 220, p: 15 }, aluguer: { preco: 45, caucao: 40, stock: 3 }, venda: { preco: 98, prazo: 12 },
    selo: 'Mais alugado', destaque: true, vista: { az: 32, el: 9 }, fundo: 'rosa',
  }),
  p({
    id: 'arco-duplo', nome: 'Arco Duplo', categoria: 'arcos-e-paineis',
    resumo: 'Dois degraus e uma abertura generosa. Leve de montar, forte na fotografia.',
    modelo3d: { id: 'arco-duplo' }, cores: CORES_LACADO, cor: 'rosa',
    medidas: { l: 120, a: 210, p: 10 }, aluguer: { preco: 38, caucao: 35, stock: 2 }, venda: { preco: 85, prazo: 12 },
    vista: { az: 30, el: 9 }, fundo: 'champanhe',
  }),
  p({
    id: 'arco-simples', nome: 'Arco Simples', categoria: 'arcos-e-paineis',
    resumo: 'O arco aberto clássico, para a entrada, para o bolo ou para um par de balões.',
    modelo3d: { id: 'arco-simples' }, cores: CORES_LACADO, cor: 'salvia',
    medidas: { l: 100, a: 200, p: 5 }, aluguer: { preco: 30, caucao: 30, stock: 3 }, venda: { preco: 65, prazo: 10 },
    vista: { az: 30, el: 9 }, fundo: 'areia',
  }),
  p({
    id: 'painel-romano', nome: 'Painel Romano', categoria: 'arcos-e-paineis',
    resumo: 'Painel cheio com o topo em arco. Sozinho ou em trio, em cores diferentes.',
    modelo3d: { id: 'painel-romano' }, cores: CORES_LACADO, cor: 'lilas',
    medidas: { l: 90, a: 180, p: 3 }, aluguer: { preco: 25, caucao: 25, stock: 4 }, venda: { preco: 55, prazo: 10 },
    vista: { az: 28, el: 9 }, fundo: 'lilas',
  }),
  p({
    id: 'trio-paineis-romanos', nome: 'Trio de Painéis Romanos', categoria: 'arcos-e-paineis',
    resumo: 'Três painéis romanos de alturas diferentes, todos brancos ou em três cores.',
    modelo3d: { id: 'trio-romanos' }, combinacoes: [
      { id: 'branco-rosa-salvia', nome: 'Branco, rosa e sálvia', cores: ['branco', 'rosa', 'salvia'] },
      { id: 'azul-branco-azul', nome: 'Azul, branco e azul', cores: ['azul', 'branco', 'azul'] },
      { id: 'lilas-rosa-marfim', nome: 'Lilás, rosa e marfim', cores: ['lilas', 'rosa', 'marfim'] },
      { id: 'marfim-verde-marfim', nome: 'Marfim e verde-real', cores: ['marfim', 'verde', 'marfim'] },
    ], cor: 'branco-rosa-salvia',
    medidas: { l: 245, a: 190, p: 3 }, conteudo: ['Painel 95 × 190 cm', 'Painel 80 × 150 cm', 'Painel 70 × 120 cm'],
    aluguer: { preco: 60, caucao: 50, stock: 2 }, venda: { preco: 140, prazo: 14 },
    selo: 'Novo', destaque: true, vista: { az: 24, el: 10 }, fundo: 'champanhe',
  }),
  p({
    id: 'painel-redondo', nome: 'Painel Redondo', categoria: 'arcos-e-paineis',
    resumo: 'O painel redondo de sempre, com o cavalete escondido atrás. Dois tamanhos.',
    modelo3d: { id: 'painel-redondo' }, cores: CORES_LACADO, cor: 'salvia',
    tamanhos: [
      { id: '150', nome: 'Ø 1,50 m', opcoes3d: { diametro: 1.5 }, medidas: { l: 150, a: 153, p: 3 }, aluguer: 35, venda: 75 },
      { id: '200', nome: 'Ø 2,00 m', opcoes3d: { diametro: 2.0 }, medidas: { l: 200, a: 203, p: 3 }, aluguer: 45, venda: 95 },
    ],
    medidas: { l: 150, a: 153, p: 3 }, aluguer: { preco: 35, caucao: 35, stock: 3 }, venda: { preco: 75, prazo: 10 },
    destaque: true, vista: { az: 26, el: 8 }, fundo: 'salvia',
  }),
  p({
    id: 'arco-iris-boho', nome: 'Arco-Íris Boho', categoria: 'arcos-e-paineis',
    resumo: 'Quatro faixas em cores de terra (ou pastel) sobre um plinto. Para o chão ou para a mesa.',
    modelo3d: { id: 'arco-iris' }, combinacoes: [
      { id: 'boho', nome: 'Boho (terracota, mostarda, sálvia)', cores: ['terracota', 'mostarda', 'salvia', 'marfim'] },
      { id: 'pastel', nome: 'Pastel (rosa, lilás, azul)', cores: ['rosa', 'lilas', 'azul', 'marfim'] },
      { id: 'classico', nome: 'Clássico (branco e dourado)', cores: ['dourado', 'branco', 'dourado', 'branco'] },
    ], cor: 'boho', ocasioes: ['aniversario', 'baby-shower', 'cha-revelacao', 'batizado'],
    medidas: { l: 200, a: 102, p: 24 }, aluguer: { preco: 30, caucao: 30, stock: 2 }, venda: { preco: 70, prazo: 12 },
    vista: { az: 22, el: 12 }, fundo: 'areia',
  }),
  // ------------------------------------------------------------------ cilindros e mesas
  p({
    id: 'cilindro', nome: 'Cilindro', categoria: 'cilindros-e-mesas',
    resumo: 'O pedestal para o bolo, os doces ou um arranjo de flores. Três alturas.',
    modelo3d: { id: 'cilindro' }, cores: CORES_LACADO, cor: 'branco',
    tamanhos: [
      { id: 'p', nome: 'P · 50 cm', opcoes3d: { diametro: 0.4, altura: 0.5 }, medidas: { l: 40, a: 50, p: 40 }, aluguer: 12, venda: 45 },
      { id: 'm', nome: 'M · 70 cm', opcoes3d: { diametro: 0.5, altura: 0.7 }, medidas: { l: 50, a: 70, p: 50 }, aluguer: 15, venda: 55 },
      { id: 'g', nome: 'G · 90 cm', opcoes3d: { diametro: 0.6, altura: 0.9 }, medidas: { l: 60, a: 90, p: 60 }, aluguer: 18, venda: 65 },
    ],
    medidas: { l: 50, a: 70, p: 50 }, aluguer: { preco: 12, caucao: 15, stock: 6 }, venda: { preco: 45, prazo: 8 },
    vista: { az: 20, el: 16 }, fundo: 'azul',
  }),
  p({
    id: 'trio-cilindros', nome: 'Trio de Cilindros', categoria: 'cilindros-e-mesas',
    resumo: 'P, M e G na mesma cor (ou em três). O par perfeito de qualquer arco.',
    modelo3d: { id: 'trio-cilindros' }, cores: CORES_LACADO, cor: 'rosa', trioDeCores: true,
    medidas: { l: 160, a: 90, p: 60 }, conteudo: ['Cilindro Ø 60 × 90 cm', 'Cilindro Ø 50 × 70 cm', 'Cilindro Ø 40 × 50 cm'],
    aluguer: { preco: 40, caucao: 40, stock: 3 }, venda: { preco: 150, prazo: 10 },
    selo: 'Mais alugado', destaque: true, vista: { az: 18, el: 14 }, fundo: 'rosa',
  }),
  p({
    id: 'cilindro-vazado', nome: 'Cilindro Vazado', categoria: 'cilindros-e-mesas',
    resumo: 'Ripas em curva, com cintura. Leve à vista e firme para o bolo.',
    modelo3d: { id: 'cilindro-vazado' }, cores: ['branco', 'marfim', 'rosa', 'salvia', 'dourado'], cor: 'branco',
    medidas: { l: 54, a: 90, p: 54 }, aluguer: { preco: 25, caucao: 30, stock: 2 }, venda: { preco: 78, prazo: 14 },
    selo: 'Novo', destaque: true, vista: { az: 18, el: 14 }, fundo: 'lilas',
  }),
  p({
    id: 'mesa-ripas', nome: 'Mesa de Ripas', categoria: 'cilindros-e-mesas',
    resumo: 'Mesa redonda em ripas, em madeira natural ou lacada. Para os doces e as lembranças.',
    modelo3d: { id: 'mesa-ripas' }, cores: ['madeira', 'branco', 'rosa', 'salvia', 'preto'], cor: 'madeira',
    material: 'MDF e pinho, verniz mate ou lacado',
    medidas: { l: 64, a: 56, p: 64 }, aluguer: { preco: 20, caucao: 25, stock: 4 }, venda: { preco: 62, prazo: 12 },
    vista: { az: 20, el: 16 }, fundo: 'champanhe',
  }),
  p({
    id: 'aparador-arco', nome: 'Aparador em Arco', categoria: 'cilindros-e-mesas',
    resumo: 'Mesa de cantos redondos, numa só peça. A mesa do bolo que também é cenário.',
    modelo3d: { id: 'aparador-arco' }, cores: CORES_LACADO, cor: 'lilas',
    medidas: { l: 120, a: 85, p: 42 }, aluguer: { preco: 35, caucao: 40, stock: 2 }, venda: { preco: 95, prazo: 14 },
    vista: { az: 30, el: 14 }, fundo: 'lilas',
  }),
  p({
    id: 'boleira', nome: 'Boleira', categoria: 'cilindros-e-mesas',
    resumo: 'Suporte de bolo com pé, lacado ou dourado.',
    modelo3d: { id: 'boleira' }, cores: ['branco', 'rosa', 'salvia', 'dourado'], cor: 'dourado',
    medidas: { l: 32, a: 18, p: 32 }, aluguer: { preco: 8, caucao: 10, stock: 6 }, venda: { preco: 26, prazo: 7 },
    vista: { az: 18, el: 24 }, fundo: 'areia',
  }),
  // ------------------------------------------------------------------ figuras e letras
  p({
    id: 'borboleta-rendada', nome: 'Borboleta Rendada', categoria: 'figuras-e-letras',
    resumo: 'Borboleta recortada como renda, de pé numa base. Linda à frente de um painel.',
    modelo3d: { id: 'borboleta' }, cores: ['branco', 'rosa', 'lilas', 'dourado', 'salvia'], cor: 'branco',
    ocasioes: ['aniversario', 'batizado', 'baby-shower', 'comunhao', 'casamento'],
    medidas: { l: 90, a: 78, p: 16 }, aluguer: { preco: 15, caucao: 15, stock: 3 }, venda: { preco: 45, prazo: 10 },
    vista: { az: 18, el: 8 }, fundo: 'rosa',
  }),
  p({
    id: 'coroa-real', nome: 'Coroa Real', categoria: 'figuras-e-letras',
    resumo: 'A coroa da casa, em dourado. Para princesas, reis e rainhas de qualquer idade.',
    modelo3d: { id: 'coroa' }, cores: ['dourado', 'branco', 'rosa', 'lilas'], cor: 'dourado',
    ocasioes: ['aniversario', 'batizado', 'cha-revelacao', 'comunhao'],
    medidas: { l: 76, a: 66, p: 16 }, aluguer: { preco: 15, caucao: 15, stock: 2 }, venda: { preco: 42, prazo: 10 },
    destaque: true, vista: { az: 20, el: 10 }, fundo: 'verde',
  }),
  p({
    id: 'nuvem', nome: 'Nuvem', categoria: 'figuras-e-letras',
    resumo: 'Nuvem fofa em MDF, de pé numa base. Para baby showers e batizados.',
    modelo3d: { id: 'nuvem' }, cores: ['branco', 'azul', 'rosa', 'lilas'], cor: 'azul',
    ocasioes: ['baby-shower', 'batizado', 'cha-revelacao', 'aniversario'],
    medidas: { l: 100, a: 53, p: 16 }, aluguer: { preco: 12, caucao: 15, stock: 3 }, venda: { preco: 35, prazo: 8 },
    vista: { az: 20, el: 10 }, fundo: 'azul',
  }),
  p({
    id: 'lua-e-estrela', nome: 'Lua e Estrela', categoria: 'figuras-e-letras',
    resumo: 'Lua crescente e estrela, cada uma na sua base. Vendem-se juntas.',
    cena3d: [{ modelo: 'lua', opcoes: {}, pos: [-0.3, 0, 0] }, { modelo: 'estrela', opcoes: {}, pos: [0.35, 0, 0.1] }],
    cores: ['dourado', 'branco', 'azul', 'rosa'], cor: 'dourado',
    ocasioes: ['baby-shower', 'batizado', 'aniversario'],
    medidas: { l: 110, a: 84, p: 16 }, conteudo: ['Lua 52 × 84 cm', 'Estrela 60 × 60 cm'],
    aluguer: { preco: 15, caucao: 15, stock: 2 }, venda: { preco: 45, prazo: 10 },
    vista: { az: 18, el: 10 }, fundo: 'azul',
  }),
  p({
    id: 'numero-gigante', nome: 'Número Gigante', categoria: 'figuras-e-letras',
    resumo: 'A idade em grande: um metro de altura, de 0 a 9.',
    texto3d: { fonte: F.numeros, texto: '1', altura: 1.0, espessura: 0.05, comBase: false },
    digitos: true, cores: CORES_LACADO.concat(['dourado']), cor: 'rosa', ocasioes: ['aniversario'],
    medidas: { l: 60, a: 100, p: 5 }, aluguer: { preco: 15, caucao: 15, stock: 10 }, venda: { preco: 40, prazo: 8 },
    destaque: true, vista: { az: 24, el: 8 }, fundo: 'rosa',
  }),
  p({
    id: 'nome-personalizado', nome: 'Nome em MDF', categoria: 'figuras-e-letras',
    resumo: 'O nome da festa, recortado à medida. Escreve-o e vê-o em 3D antes de encomendar.',
    texto3d: { fonte: F.nomes, texto: 'Sofia', altura: 0.3, espessura: 0.02 }, personalizavel: { maxLetras: 12, exemplo: 'Sofia' },
    cores: ['branco', 'dourado', 'rosa', 'lilas', 'azul', 'salvia', 'verde'], cor: 'dourado',
    medidas: { l: 70, a: 35, p: 14 }, venda: { preco: 32, prazo: 7, porLetra: 3, letrasIncluidas: 5 },
    selo: 'Personalizado', vista: { az: 20, el: 12 }, fundo: 'champanhe',
  }),
  p({
    id: 'letras-love', nome: 'Letras LOVE', categoria: 'figuras-e-letras',
    resumo: 'Quatro letras de um metro, de pé. Para casamentos, pedidos e aniversários de namoro.',
    texto3d: { fonte: F.serifa, texto: 'LOVE', altura: 1.0, espessura: 0.06, comBase: false },
    cores: ['branco', 'marfim', 'dourado', 'rosa', 'verde'], cor: 'marfim', ocasioes: ['casamento', 'empresa', 'aniversario'],
    medidas: { l: 270, a: 100, p: 6 }, aluguer: { preco: 45, caucao: 50, stock: 1 }, venda: { preco: 120, prazo: 14 },
    vista: { az: 24, el: 9 }, fundo: 'areia',
  }),
  // ------------------------------------------------------------------ cenários completos
  p({
    id: 'cenario-encanto', nome: 'Cenário Encanto', categoria: 'cenarios',
    resumo: 'Arco triplo, trio de cilindros e mesa de ripas: o cenário que mais se pede.',
    cena3d: [
      { modelo: 'arco-triplo', opcoes: { cor: 'branco' }, pos: [0, 0, -0.35] },
      { modelo: 'trio-cilindros', opcoes: { cores: ['rosa', 'rosa', 'rosa'] }, pos: [-0.55, 0, 0.35], rot: 0.15 },
      { modelo: 'mesa-ripas', opcoes: {}, pos: [0.85, 0, 0.45] },
    ],
    componentes: [{ id: 'arco-triplo-real', cor: 'branco' }, { id: 'trio-cilindros', cor: 'rosa' }, { id: 'mesa-ripas', cor: 'madeira' }],
    cores: null, aluguer: { preco: 89, caucao: 80, stock: 2 }, venda: { preco: 280, prazo: 14 },
    selo: 'Poupa 16 €', destaque: true, vista: { az: 22, el: 8, margem: 0.08 }, fundo: 'rosa',
  }),
  p({
    id: 'cenario-jardim', nome: 'Cenário Jardim', categoria: 'cenarios',
    resumo: 'Painel redondo em sálvia, cilindro vazado, dois cilindros e a borboleta rendada.',
    cena3d: [
      { modelo: 'painel-redondo', opcoes: { cor: 'salvia', diametro: 2.0 }, pos: [0, 0, -0.4] },
      { modelo: 'cilindro-vazado', opcoes: { cor: 'branco' }, pos: [-0.5, 0, 0.2] },
      { modelo: 'cilindro', opcoes: { cor: 'marfim', diametro: 0.5, altura: 0.7 }, pos: [0.25, 0, 0.3] },
      { modelo: 'cilindro', opcoes: { cor: 'branco', diametro: 0.4, altura: 0.5 }, pos: [0.72, 0, 0.5] },
      { modelo: 'borboleta', opcoes: { cor: 'branco', largura: 0.6 }, pos: [-1.0, 0, 0.6], rot: 0.3 },
    ],
    componentes: [{ id: 'painel-redondo', cor: 'salvia', tamanho: '200' }, { id: 'cilindro-vazado', cor: 'branco' }, { id: 'cilindro', cor: 'marfim', tamanho: 'm' }, { id: 'cilindro', cor: 'branco', tamanho: 'p' }, { id: 'borboleta-rendada', cor: 'branco' }],
    cores: null, ocasioes: ['batizado', 'baby-shower', 'aniversario', 'comunhao', 'casamento'],
    aluguer: { preco: 99, caucao: 90, stock: 1 }, venda: { preco: 290, prazo: 14 },
    selo: 'Poupa 23 €', destaque: true, vista: { az: 18, el: 8, margem: 0.08 }, fundo: 'salvia',
  }),
  p({
    id: 'cenario-princesa', nome: 'Cenário Princesa', categoria: 'cenarios',
    resumo: 'Arco duplo rosa, coroa dourada, trio de cilindros e boleira. Reinar é obrigatório.',
    cena3d: [
      { modelo: 'arco-duplo', opcoes: { cor: 'rosa' }, pos: [0, 0, -0.3] },
      { modelo: 'trio-cilindros', opcoes: { cores: ['branco', 'rosa', 'branco'] }, pos: [-0.35, 0, 0.35], rot: 0.1 },
      { modelo: 'coroa', opcoes: { largura: 0.55 }, pos: [0.85, 0, 0.55], rot: -0.2 },
      { modelo: 'boleira', opcoes: { cor: 'dourado' }, pos: [-0.77, 0.9, 0.17] },
    ],
    componentes: [{ id: 'arco-duplo', cor: 'rosa' }, { id: 'trio-cilindros', cor: 'branco' }, { id: 'coroa-real', cor: 'dourado' }, { id: 'boleira', cor: 'dourado' }],
    cores: null, ocasioes: ['aniversario', 'batizado', 'comunhao'],
    aluguer: { preco: 85, caucao: 80, stock: 1 }, venda: { preco: 270, prazo: 14 },
    selo: 'Poupa 16 €', vista: { az: 20, el: 8, margem: 0.08 }, fundo: 'rosa',
  }),
  p({
    id: 'cenario-nuvem', nome: 'Cenário Nuvem', categoria: 'cenarios',
    resumo: 'Trio de painéis em azul e branco, nuvem, lua e estrela. Para dar as boas-vindas.',
    cena3d: [
      { modelo: 'trio-romanos', opcoes: { cores: ['azul', 'branco', 'azul'] }, pos: [0, 0, -0.3] },
      { modelo: 'nuvem', opcoes: { cor: 'branco', largura: 0.8 }, pos: [-0.75, 0, 0.45], rot: 0.2 },
      { modelo: 'lua', opcoes: { altura: 0.6 }, pos: [0.65, 0, 0.45] },
      { modelo: 'estrela', opcoes: { altura: 0.42 }, pos: [1.05, 0, 0.6] },
    ],
    componentes: [{ id: 'trio-paineis-romanos', cor: 'azul-branco-azul' }, { id: 'nuvem', cor: 'branco' }, { id: 'lua-e-estrela', cor: 'dourado' }],
    cores: null, ocasioes: ['baby-shower', 'batizado', 'cha-revelacao'],
    aluguer: { preco: 75, caucao: 70, stock: 1 }, venda: { preco: 210, prazo: 14 },
    selo: 'Poupa 12 €', destaque: true, vista: { az: 18, el: 8, margem: 0.08 }, fundo: 'azul',
  }),
  p({
    id: 'cenario-amor', nome: 'Cenário Amor', categoria: 'cenarios',
    resumo: 'Arco triplo marfim, letras LOVE e aparador em arco. Para o «sim» e para o copo-d’água.',
    cena3d: [
      { modelo: 'arco-triplo', opcoes: { cor: 'marfim' }, pos: [0, 0, -0.45] },
      { modelo: 'aparador-arco', opcoes: { cor: 'marfim' }, pos: [0, 0, 0.15] },
      { texto: { fonte: F.serifa, texto: 'LOVE', altura: 0.42, espessura: 0.04, comBase: false, cor: 'dourado' }, pos: [0, 0.85, 0.15] },
    ],
    componentes: [{ id: 'arco-triplo-real', cor: 'marfim' }, { id: 'aparador-arco', cor: 'marfim' }, { id: 'letras-love', cor: 'dourado' }],
    cores: null, ocasioes: ['casamento', 'empresa'],
    aluguer: { preco: 110, caucao: 120, stock: 1 }, venda: { preco: 300, prazo: 16 },
    selo: 'Poupa 15 €', vista: { az: 20, el: 8, margem: 0.08 }, fundo: 'champanhe',
  }),
];

// 18 nov 2026 (o Renato: «a cor default deve ser o branco… em todas»): o branco é a cor de arranque e a primeira de
// todas as peças; nas combinações entra «Tudo branco» à cabeça. Os cenários ficam com as cores do tema. Os fundos dos
// cartões passaram a cores onde o branco se lê (nada de branco sobre creme).
const FUNDOS_BRANCO = {
  'arco-triplo-real': 'rosa', 'painel-redondo': 'salvia', 'trio-paineis-romanos': 'lilas', 'arco-duplo': 'azul', 'arco-simples': 'rosa', 'arco-iris-boho': 'salvia', 'painel-romano': 'lilas',
  'trio-cilindros': 'rosa', 'cilindro-vazado': 'lilas', 'aparador-arco': 'azul', 'boleira': 'salvia', 'cilindro': 'rosa', 'mesa-ripas': 'verde',
  'coroa-real': 'verde', 'numero-gigante': 'rosa', 'borboleta-rendada': 'lilas', 'letras-love': 'verde', 'lua-e-estrela': 'azul', 'nome-personalizado': 'salvia', 'nuvem': 'rosa',
};
for (const prod of produtos) {
  if (prod.categoria === 'cenarios') continue;
  if (prod.combinacoes) {
    if (!prod.combinacoes.some((c) => c.id === 'branco')) prod.combinacoes.unshift({ id: 'branco', nome: 'Tudo branco', cores: Array(prod.combinacoes[0].cores.length).fill('branco') });
    prod.cor = 'branco';
  } else if (prod.cores) {
    prod.cores = ['branco', ...prod.cores.filter((c) => c !== 'branco')];
    prod.cor = 'branco';
  }
  if (FUNDOS_BRANCO[prod.id]) prod.fundo = FUNDOS_BRANCO[prod.id];
}

const cupoes = [
  { codigo: 'BEMVINDO10', tipo: 'percentagem', valor: 10, minimo: 30, descricao: '10 % na primeira encomenda', primeiraEncomenda: true, validade: '2027-12-31' },
  { codigo: 'NATAL15', tipo: 'percentagem', valor: 15, minimo: 0, categorias: ['cenarios'], descricao: '15 % nos cenários completos até 31 de dezembro', validade: '2026-12-31' },
  { codigo: 'ENTREGA0', tipo: 'entrega', valor: 0, minimo: 120, descricao: 'Entrega e montagem grátis na Zona 1 em encomendas a partir de 120 €', validade: '2027-06-30' },
  { codigo: 'FESTA5', tipo: 'valor', valor: 5, minimo: 40, descricao: '5 € de desconto a partir de 40 €', validade: '2027-03-31' },
];

const entregas = {
  oficina: { nome: 'Esposende (a confirmar)', horario: 'Seg. a sáb., com hora marcada' },
  zonas: [
    { id: 'z1', nome: 'Zona 1', descricao: 'Esposende, Barcelos, Póvoa de Varzim', preco: 15 },
    { id: 'z2', nome: 'Zona 2', descricao: 'Viana do Castelo, Vila do Conde, Braga, Famalicão', preco: 25 },
    { id: 'z3', nome: 'Zona 3', descricao: 'Porto, Maia, Matosinhos, Guimarães, Ponte de Lima', preco: 40 },
  ],
  montagem: 20,
  envioCompra: { nome: 'Transportadora (peças vendidas)', preco: 19, gratisAcima: 150 },
  aluguer: { levantamento: 'na véspera da festa', devolucao: 'no dia a seguir', antecedenciaMinimaDias: 3, folgaDias: 1 },
};

async function main() {
  if (existsSync(join(C, 'produtos')) && !refazer) {
    console.log('content/ já existe: nada feito (usa --refazer para recomeçar do zero)');
    return;
  }
  if (refazer) await rm(join(C, 'produtos'), { recursive: true, force: true });
  await mkdir(join(C, 'produtos'), { recursive: true });
  for (const prod of produtos) await writeFile(join(C, 'produtos', `${prod.id}.json`), JSON.stringify(prod, null, 2) + '\n');
  await writeFile(join(C, 'categorias.json'), JSON.stringify(categorias, null, 2) + '\n');
  await writeFile(join(C, 'ocasioes.json'), JSON.stringify(ocasioes, null, 2) + '\n');
  await writeFile(join(C, 'cupoes.json'), JSON.stringify(cupoes, null, 2) + '\n');
  await writeFile(join(C, 'entregas.json'), JSON.stringify(entregas, null, 2) + '\n');
  console.log(`ok: ${produtos.length} peças, ${categorias.length} categorias, ${cupoes.length} cupões`);
}

main();
