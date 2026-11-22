// A prova do que o painel pode fazer ao conteúdo, numa CÓPIA do site (o repositório não muda):
//   node scripts/testar-conteudo.mjs            (precisa de um python com o Pillow: PYTHON=…, por omissão python3)
// - uma peça nova só com fotografias (sem 3D): tem página, cartão, partilha e entra no catálogo com a fotografia;
// - uma peça escondida («Publicado no site» desligado) sai da loja, do mapa, do «Monta» e do catálogo; no cenário que
//   a usa continua, mas sem ligação;
// - uma fotografia que já não existe não aparece, e a peça fica;
// - uma peça com 3D e uma fotografia: a fotografia entra na galeria a seguir às vistas do estúdio;
// - a ordem (o arrastar do painel) muda a posição na categoria;
// - um conteúdo que bloqueia (uma categoria sem nome) pára o build.
// Com PLAYWRIGHT=<pasta do playwright>, abre a ficha da peça nova no Chromium e no WebKit e junta-a ao carrinho.
import { cp, mkdir, readFile, writeFile, symlink, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const PYTHON = process.env.PYTHON || 'python3';
const T = join(tmpdir(), `encanto-real-conteudo-${process.pid}`);
let falhas = 0, provas = 0;
const prova = (ok, m) => { provas++; if (!ok) { falhas++; console.log(`FALHA ${m}`); } };

// a cópia (sem o .git, a _site e a .cache; o node_modules por ligação)
await rm(T, { recursive: true, force: true });
await mkdir(T, { recursive: true });
for (const d of ['src', 'content', 'media', 'scripts', 'legal-comum', 'package.json']) await cp(join(RAIZ, d), join(T, d), { recursive: true });
await symlink(join(RAIZ, 'node_modules'), join(T, 'node_modules'));
const lerJ = async (f) => JSON.parse(await readFile(join(T, f), 'utf8'));
const gravarJ = (f, v) => writeFile(join(T, f), JSON.stringify(v, null, 2) + '\n');

// duas fotografias de faz-de-conta (o painel grava JPEG até 2048 px, sem EXIF)
await mkdir(join(T, 'media/fotos'), { recursive: true });
execFileSync(PYTHON, ['-c', `
from PIL import Image, ImageDraw
for nome, cor, (w, h) in (('mesa-teste-1', (214, 190, 160), (1600, 1200)), ('mesa-teste-2', (190, 210, 200), (1200, 1600)), ('arco-na-festa', (240, 220, 215), (1500, 1000))):
    im = Image.new('RGB', (w, h), cor); d = ImageDraw.Draw(im); d.ellipse((w*0.3, h*0.3, w*0.7, h*0.7), fill=(90, 100, 70))
    im.save('${join(T, 'media/fotos')}/' + nome + '.jpg', 'JPEG', quality=85)
`]);
const fotos = await lerJ('content/fotos.json');
Object.assign(fotos, {
  'mesa-teste-1': { alt: 'Mesa de teste, de frente', foco: '50% 40%' },
  'mesa-teste-2': { alt: 'Mesa de teste, de lado', foco: '50% 50%' },
  'arco-na-festa': { alt: 'O arco triplo numa festa', foco: '50% 50%' },
});
await gravarJ('content/fotos.json', fotos);

// a peça nova, só com fotografias
await gravarJ('content/produtos/mesa-teste.json', {
  nome: 'Mesa de Teste', resumo: 'Uma mesa só com fotografias, criada no painel.', categoria: 'cilindros-e-mesas',
  ocasioes: ['aniversario'], material: 'MDF', medidas: { l: 80, a: 75, p: 40 },
  aluguer: { preco: 25, caucao: 20, stock: 2 }, venda: { preco: 120, prazo: 10 },
  fundo: 'areia', fotos: ['mesa-teste-1', 'mesa-teste-2'], ordem: 1,
});
// uma peça escondida que um cenário usa
const mesa = await lerJ('content/produtos/mesa-ripas.json');
await gravarJ('content/produtos/mesa-ripas.json', { ...mesa, publicado: false });
// uma fotografia que já não existe, numa peça com 3D
const arcoSimples = await lerJ('content/produtos/arco-simples.json');
await gravarJ('content/produtos/arco-simples.json', { ...arcoSimples, fotos: ['nao-existe'] });
// uma peça com 3D e uma fotografia verdadeira
const arco = await lerJ('content/produtos/arco-triplo-real.json');
await gravarJ('content/produtos/arco-triplo-real.json', { ...arco, fotos: ['arco-na-festa'] });

const correr = (cmd, args) => spawnSync(cmd, args, { cwd: T, encoding: 'utf8' });
let r = correr(PYTHON, ['scripts/fotos.py']);
prova(r.status === 0, `fotos.py: ${r.stderr || r.stdout}`);
r = correr('node', ['src/build.mjs']);
prova(r.status === 0, `build: ${r.stderr}`);
const S = (f) => join(T, '_site', f);
const ler = async (f) => (existsSync(S(f)) ? readFile(S(f), 'utf8') : '');

// a peça nova
const nova = await ler('loja/mesa-teste/index.html');
prova(nova.includes('<h1 class="ficha__titulo">Mesa de Teste</h1>'), 'a peça nova tem página');
const srcPrincipal = nova.match(/<img[^>]*class="img-foto galeria__imagem"[^>]*src="([^"]+)"/)?.[1];
prova(srcPrincipal && existsSync(S(srcPrincipal.slice(1))), `a imagem principal da peça nova é a fotografia e existe (${srcPrincipal})`);
prova(!nova.includes('data-ver-3d') && !nova.includes('data-vista="3d"'), 'a peça nova não tem 3D');
prova((nova.match(/data-vista="foto"/g) || []).length === 2, 'as duas fotografias nas miniaturas');
const og = nova.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || '';
prova(/\/assets\/fotos\/mesa-teste-1-[0-9a-f]{10}-partilha\.jpg$/.test(og) && existsSync(S(og.replace('https://encantoreal.pt/', ''))), `a partilha da peça nova é o JPEG da fotografia (${og})`);
prova((await ler('loja/cilindros-e-mesas/index.html')).includes('data-produto="mesa-teste"'), 'a peça nova está na categoria');
const cat = JSON.parse(await ler('assets/catalogo.json'));
const pNova = cat.produtos.find((p) => p.id === 'mesa-teste');
prova(pNova?.imagem?.tipo === 'foto' && pNova.tresD === false && pNova.fotos.length === 2, 'a peça nova entra no catálogo com a fotografia');
prova(existsSync(S('assets/fotos/miniatura-mesa-teste-1.webp')) && existsSync(S('assets/fotos/grande-mesa-teste-1.webp')), 'as imagens do painel (miniatura e grande)');
// a ordem: a peça nova (ordem 1) é a primeira da categoria
const ids = [...(await ler('loja/cilindros-e-mesas/index.html')).matchAll(/data-produto="([^"]+)"/g)].map((m) => m[1]);
prova(ids[0] === 'mesa-teste', `a ordem do painel manda (primeira: ${ids[0]})`);

// a peça escondida
prova(!existsSync(S('loja/mesa-ripas/index.html')), 'a peça escondida não tem página');
prova(!(await ler('sitemap.xml')).includes('/loja/mesa-ripas/'), 'a peça escondida sai do mapa');
prova(!cat.produtos.some((p) => p.id === 'mesa-ripas'), 'a peça escondida sai do catálogo');
prova(!(await ler('monta/index.html')).includes('value="mesa-ripas"'), 'a peça escondida sai do «Monta»');
const cenario = await ler('loja/cenario-encanto/index.html');
prova(cenario.includes('<span class="componente">') && !cenario.includes('href="/loja/mesa-ripas/"'), 'no cenário, a peça escondida fica sem ligação');
prova(!(await ler('index.html')).includes('href="/loja/mesa-ripas/"'), 'a peça escondida não aparece no início');

// a fotografia que não existe, e a de uma peça com 3D
prova(existsSync(S('loja/arco-simples/index.html')) && !(await ler('loja/arco-simples/index.html')).includes('nao-existe'), 'a fotografia que não existe não aparece, e a peça fica');
const arcoHtml = await ler('loja/arco-triplo-real/index.html');
prova(arcoHtml.includes('data-foto="arco-na-festa"') && arcoHtml.includes('data-vista="3d"') && arcoHtml.indexOf('data-vista="escala"') < arcoHtml.indexOf('data-foto="arco-na-festa"'), 'a fotografia de uma peça com 3D vem depois das vistas');

// as provas do SEO na cópia (o mapa sem datas: a cópia não tem git)
r = correr('node', ['scripts/testar.mjs']);
prova(r.status === 0, `testar.mjs na cópia:\n${r.stdout}`);

// no browser: a ficha da peça nova abre, as fotografias trocam, junta-se ao carrinho e o carrinho mostra a fotografia
if (process.env.PLAYWRIGHT) {
  const pw = await import(join(process.env.PLAYWRIGHT, 'index.mjs'));
  const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
  const ORIGEM = 'http://localhost:4321';
  for (const nome of ['chromium', 'webkit']) {
    const b = await pw[nome].launch();
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    await ctx.route(`${ORIGEM}/**`, async (route) => {
      let f = S(decodeURIComponent(new URL(route.request().url()).pathname).slice(1));
      if (existsSync(join(f, 'index.html'))) f = join(f, 'index.html');
      if (!existsSync(f)) return route.fulfill({ status: 404, body: 'x' });
      return route.fulfill({ status: 200, body: await readFile(f), contentType: TIPOS[extname(f)] || 'application/octet-stream' });
    });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('response', (res) => { if (res.status() >= 400) erros.push(`${res.status()} ${res.url()}`); });
    await page.goto(`${ORIGEM}/loja/mesa-teste/`);
    await page.click('[data-vista="foto"][data-foto="mesa-teste-2"]');
    const src = await page.evaluate(() => document.querySelector('.galeria__imagem').currentSrc || document.querySelector('.galeria__imagem').src);
    prova(src.includes('mesa-teste-2-'), `${nome}: a segunda fotografia aparece ao tocar (${src})`);
    await page.check('input[name="modo"][value="compra"]');
    await page.click('[data-botao-juntar]');
    await page.waitForTimeout(500);
    await page.goto(`${ORIGEM}/carrinho/`);
    await page.waitForTimeout(800);
    const imgCarrinho = await page.evaluate(() => document.querySelector('.linha__imagem img')?.getAttribute('src') || '');
    prova(imgCarrinho.includes('/assets/fotos/mesa-teste-1-'), `${nome}: o carrinho mostra a fotografia (${imgCarrinho})`);
    prova(!erros.length, `${nome}: sem erros (${erros.join(' | ')})`);
    await b.close();
  }
}

// um conteúdo que bloqueia pára o build (e o site fica como estava)
const cats = await lerJ('content/categorias.json');
cats[0].nome = '';
await gravarJ('content/categorias.json', cats);
r = correr('node', ['src/build.mjs', '--saida=_site2']);
prova(r.status !== 0 && /O nome da categoria/.test(r.stderr), 'uma categoria sem nome pára o build');

await rm(T, { recursive: true, force: true });
console.log(`${provas - falhas}/${provas} provas do conteúdo`);
process.exitCode = falhas ? 1 : 0;
