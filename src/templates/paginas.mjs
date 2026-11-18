// Todas as páginas além da inicial. Cada gerador devolve [[caminho, html], ...].
import { gerarLoja } from './loja.mjs';
import { gerarCompra } from './compra.mjs';
import { gerarConta } from './conta.mjs';
import { gerarMonta } from './monta.mjs';
import { gerarConteudo } from './conteudo.mjs';

export const PAGINAS = [gerarLoja, gerarCompra, gerarConta, gerarMonta, gerarConteudo];
