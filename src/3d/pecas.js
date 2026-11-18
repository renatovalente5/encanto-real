// As peças da Encanto Real em 3D (three.js). Um só módulo para duas coisas:
//   1) as fotografias de estúdio do catálogo (scripts/renders.mjs abre src/3d/estudio.html no Chromium);
//   2) o visualizador 3D da ficha e o «Monta o teu cenário» no site.
// Unidades: metros. Cada peça fica com a base em y = 0, centrada em x = 0, virada para +z.
import * as THREE from 'three';
import { ACABAMENTOS } from './acabamentos.js';

// ---------------------------------------------------------------------------------------------
// Acabamentos (MDF lacado acetinado, dourado metálico, madeira natural)
// ---------------------------------------------------------------------------------------------
export { ACABAMENTOS };

const cacheMateriais = new Map();
let texturaMadeira = null;

function criarTexturaMadeira() {
  // veio da madeira desenhado num canvas (sem imagens de fora): riscas finas com ondulação e nós suaves
  const c = document.createElement('canvas');
  c.width = 512; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#D7B58B';
  g.fillRect(0, 0, c.width, c.height);
  let semente = 7;
  const rnd = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 180; i++) {
    const x = rnd() * c.width;
    const larg = 0.6 + rnd() * 2.2;
    const tom = rnd() < 0.5 ? `rgba(150,105,60,${0.06 + rnd() * 0.12})` : `rgba(240,215,175,${0.05 + rnd() * 0.1})`;
    g.strokeStyle = tom;
    g.lineWidth = larg;
    g.beginPath();
    const fase = rnd() * 6.28;
    const amp = 2 + rnd() * 6;
    for (let y = 0; y <= c.height; y += 16) {
      const xx = x + Math.sin(y / 140 + fase) * amp;
      if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function material(acabamento = 'branco') {
  const chave = typeof acabamento === 'string' ? acabamento : JSON.stringify(acabamento);
  if (cacheMateriais.has(chave)) return cacheMateriais.get(chave);
  const a = typeof acabamento === 'string' ? (ACABAMENTOS[acabamento] || ACABAMENTOS.branco) : acabamento;
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(a.hex),
    roughness: a.rugosidade ?? 0.5,
    metalness: a.metal ?? 0,
    clearcoat: a.metal ? 0 : (a.madeira ? 0 : 0.18),
    clearcoatRoughness: 0.45,
  });
  if (a.madeira) {
    texturaMadeira = texturaMadeira || criarTexturaMadeira();
    m.map = texturaMadeira;
    m.color = new THREE.Color('#FFFFFF');
  }
  if (a.metal) m.envMapIntensity = 2.2;
  m.userData.acabamento = typeof acabamento === 'string' ? acabamento : 'custom';
  cacheMateriais.set(chave, m);
  return m;
}

const METAL_ESCURO = () => material({ hex: '#3A3A38', rugosidade: 0.4, metal: 0.6 });

// ---------------------------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------------------------
function extrudir(formas, profundidade, raio = 0.004, curvas = 64) {
  const bt = Math.min(raio, profundidade * 0.3);
  const g = new THREE.ExtrudeGeometry(formas, {
    depth: Math.max(0.0005, profundidade - 2 * bt),
    bevelEnabled: bt > 0,
    bevelThickness: bt,
    bevelSize: bt,
    bevelOffset: -bt,
    bevelSegments: 3,
    curveSegments: curvas,
  });
  g.translate(0, 0, bt);
  g.computeVertexNormals();
  return g;
}

function malha(geo, acab, sombras = true) {
  const m = new THREE.Mesh(geo, material(acab));
  m.castShadow = sombras;
  m.receiveShadow = sombras;
  m.userData.colorivel = true;
  return m;
}

function grupo(nome, dims) {
  const g = new THREE.Group();
  g.name = nome;
  g.userData.dims = dims; // { l: largura, a: altura, p: profundidade } em metros
  return g;
}

// arco cheio (rectângulo com meio círculo em cima), da base y=0 até y=h
function formaArco(w, h) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}

// moldura em arco aberta até ao chão (U invertido): exterior wo×ho, abertura wi×hi
function formaMoldura(wo, ho, wi, hi) {
  const ro = wo / 2, ri = wi / 2;
  const s = new THREE.Shape();
  s.moveTo(-ro, 0);
  s.lineTo(-ri, 0);
  s.lineTo(-ri, hi - ri);
  s.absarc(0, hi - ri, ri, Math.PI, 0, true);
  s.lineTo(ri, 0);
  s.lineTo(ro, 0);
  s.lineTo(ro, ho - ro);
  s.absarc(0, ho - ro, ro, 0, Math.PI, false);
  s.lineTo(-ro, 0);
  return s;
}

function pes(grupoAlvo, largura, acab, profundidade = 0.34, zFrente = 0) {
  // pés por trás (T invertido), da cor da peça
  const geo = new THREE.BoxGeometry(0.045, 0.05, profundidade);
  for (const s of [-1, 1]) {
    const p = malha(geo, acab);
    p.position.set(s * (largura / 2 - 0.12), 0.025, zFrente - profundidade / 2);
    grupoAlvo.add(p);
  }
}

// ---------------------------------------------------------------------------------------------
// Arcos e painéis
// ---------------------------------------------------------------------------------------------
export function arco({ largura = 1.4, altura = 2.2, degraus = 3, passo = 0.14, camada = 0.05, aberto = true, cor = 'branco' } = {}) {
  const g = grupo('arco', { l: largura, a: altura, p: camada * degraus });
  const wi = largura - 2 * degraus * passo;
  const hi = altura - degraus * passo;
  for (let i = 0; i < degraus; i++) {
    const wo = largura - 2 * i * passo;
    const ho = altura - i * passo;
    const forma = aberto ? formaMoldura(wo, ho, wi, hi) : formaArco(wo, ho);
    const m = malha(extrudir(forma, camada * (i + 1), 0.006, 96), cor);
    m.position.z = -camada * degraus / 2;
    g.add(m);
  }
  return g;
}

export function painelRomano({ largura = 0.9, altura = 1.8, espessura = 0.03, cor = 'branco' } = {}) {
  const g = grupo('painel-romano', { l: largura, a: altura, p: espessura });
  g.add(malha(extrudir(formaArco(largura, altura), espessura, 0.006, 96), cor));
  return g;
}

export function trioRomanos({ cores = ['branco', 'rosa', 'salvia'] } = {}) {
  const g = grupo('trio-romanos', { l: 2.2, a: 1.9, p: 0.6 });
  const medidas = [
    { l: 0.8, a: 1.5, x: -0.72, z: 0.0 },
    { l: 0.95, a: 1.9, x: 0.0, z: -0.18 },
    { l: 0.7, a: 1.2, x: 0.68, z: 0.05 },
  ];
  medidas.forEach((m, i) => {
    const p = painelRomano({ largura: m.l, altura: m.a, cor: cores[i % cores.length] });
    p.position.set(m.x, 0, m.z);
    g.add(p);
  });
  return g;
}

export function painelRedondo({ diametro = 1.5, espessura = 0.025, cor = 'branco' } = {}) {
  const r = diametro / 2;
  const g = grupo('painel-redondo', { l: diametro, a: diametro + 0.03, p: 0.5 });
  const forma = new THREE.Shape();
  forma.absarc(0, 0, r, 0, Math.PI * 2, false);
  const disco = malha(extrudir(forma, espessura, 0.006, 128), cor);
  disco.position.set(0, r + 0.03, 0);
  g.add(disco);
  // cavalete por trás, da cor do painel e escondido atrás do disco: um poste e um pé
  const poste = malha(new THREE.BoxGeometry(0.04, diametro * 0.7, 0.03), cor);
  poste.position.set(0, diametro * 0.35 + 0.03, -0.035);
  const pe = malha(new THREE.BoxGeometry(0.06, 0.04, 0.3), cor);
  pe.position.set(0, 0.02, -0.19);
  g.add(poste, pe);
  return g;
}

export function arcoIris({ raio = 0.95, faixas = 4, largura = 0.13, folga = 0.02, cores = ['terracota', 'mostarda', 'salvia', 'marfim'] } = {}) {
  const g = grupo('arco-iris', { l: raio * 2 + 0.1, a: raio + 0.08, p: 0.3 });
  const base = 0.06;
  for (let i = 0; i < faixas; i++) {
    const ro = raio - i * (largura + folga);
    const ri = ro - largura;
    if (ri <= 0.02) break;
    const s = new THREE.Shape();
    s.moveTo(ro, 0);
    s.absarc(0, 0, ro, 0, Math.PI, false);
    s.lineTo(-ri, 0);
    s.absarc(0, 0, ri, Math.PI, 0, true);
    s.lineTo(ro, 0);
    const m = malha(extrudir(s, 0.03, 0.005, 128), cores[i % cores.length]);
    m.position.y = base;
    g.add(m);
  }
  // plinto
  const plinto = malha(new THREE.BoxGeometry(raio * 2 + 0.1, base, 0.24), cores[cores.length - 1]);
  plinto.position.set(0, base / 2, -0.06);
  g.add(plinto);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Cilindros, mesas, aparadores
// ---------------------------------------------------------------------------------------------
export function cilindro({ diametro = 0.5, altura = 0.7, cor = 'branco' } = {}) {
  const r = diametro / 2;
  const e = Math.min(0.016, r * 0.12);
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(r - 0.004, 0), new THREE.Vector2(r, 0.004), new THREE.Vector2(r, altura - e)];
  for (let i = 1; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - e + Math.cos(t) * e, altura - e + Math.sin(t) * e));
  }
  pts.push(new THREE.Vector2(0, altura));
  const g = grupo('cilindro', { l: diametro, a: altura, p: diametro });
  g.add(malha(new THREE.LatheGeometry(pts, 128), cor));
  return g;
}

export function trioCilindros({ cores = ['branco', 'branco', 'branco'], medidas = [[0.6, 0.9], [0.5, 0.7], [0.4, 0.5]] } = {}) {
  const g = grupo('trio-cilindros', { l: 1.55, a: medidas[0][1], p: 0.9 });
  const lugares = [[-0.42, -0.18], [0.22, -0.1], [0.62, 0.24]];
  medidas.forEach(([d, a], i) => {
    const c = cilindro({ diametro: d, altura: a, cor: cores[i % cores.length] });
    c.position.set(lugares[i][0], 0, lugares[i][1]);
    g.add(c);
  });
  return g;
}

function ripa(perfil, espessura, acab) {
  // perfil = [{r, y}] do contorno no plano (r, y); extrudido em z com a espessura da ripa
  const s = new THREE.Shape();
  perfil.forEach((p, i) => (i ? s.lineTo(p.r, p.y) : s.moveTo(p.r, p.y)));
  s.closePath();
  const geo = extrudir(s, espessura, 0.002, 12);
  geo.translate(0, 0, -espessura / 2);
  return malha(geo, acab);
}

export function cilindroVazado({ diametro = 0.5, altura = 0.9, ripas = 18, cintura = 0.22, cor = 'branco' } = {}) {
  const R = diametro / 2;
  const g = grupo('cilindro-vazado', { l: diametro + 0.04, a: altura, p: diametro + 0.04 });
  const tampo = 0.028;
  const largura = 0.034;
  const passos = 24;
  for (let i = 0; i < ripas; i++) {
    const fora = [], dentro = [];
    for (let k = 0; k <= passos; k++) {
      const y = tampo + (k / passos) * (altura - 2 * tampo);
      const u = (y - tampo) / (altura - 2 * tampo);
      const rr = R * (1 - cintura * Math.sin(Math.PI * u));
      fora.push({ r: rr, y });
      dentro.push({ r: rr - largura, y });
    }
    const perfil = [...fora, ...dentro.reverse()];
    const m = ripa(perfil, 0.016, cor);
    m.rotation.y = (i / ripas) * Math.PI * 2;
    g.add(m);
  }
  for (const [y, rr] of [[0, R + 0.005], [altura - tampo, R + 0.02]]) {
    const d = cilindro({ diametro: rr * 2, altura: tampo, cor });
    d.position.y = y;
    g.add(d);
  }
  return g;
}

function disco({ diametro, altura, cor }) {
  const g = new THREE.Group();
  const m = malha(new THREE.CylinderGeometry(diametro / 2, diametro / 2, altura, 128, 1), cor);
  m.position.y = altura / 2;
  g.add(m);
  return g;
}

export function mesaRipas({ diametro = 0.6, altura = 0.56, ripas = 22, cor = 'madeira' } = {}) {
  const Rt = diametro / 2 - 0.06;
  const Rb = diametro / 2 + 0.02;
  const g = grupo('mesa-ripas', { l: diametro + 0.04, a: altura, p: diametro + 0.04 });
  const tampo = 0.036;
  const largura = 0.05;
  const h = altura - tampo;
  for (let i = 0; i < ripas; i++) {
    const perfil = [
      { r: Rb, y: 0 }, { r: Rt, y: h }, { r: Rt - largura, y: h }, { r: Rb - largura, y: 0 },
    ];
    const m = ripa(perfil, 0.022, cor);
    m.rotation.y = (i / ripas) * Math.PI * 2;
    g.add(m);
  }
  const t = disco({ diametro, altura: tampo, cor });
  t.position.y = h;
  g.add(t);
  return g;
}

export function aparadorArco({ largura = 1.2, altura = 0.85, profundidade = 0.42, espessura = 0.06, raio = 0.2, cor = 'branco' } = {}) {
  const W = largura / 2, H = altura, e = espessura, R = raio, r = Math.max(0.02, raio - espessura);
  const s = new THREE.Shape();
  s.moveTo(-W, 0);
  s.lineTo(-W, H - R);
  s.absarc(-W + R, H - R, R, Math.PI, Math.PI / 2, true);
  s.lineTo(W - R, H);
  s.absarc(W - R, H - R, R, Math.PI / 2, 0, true);
  s.lineTo(W, 0);
  s.lineTo(W - e, 0);
  s.lineTo(W - e, H - e - r);
  s.absarc(W - e - r, H - e - r, r, 0, Math.PI / 2, false);
  s.lineTo(-W + e + r, H - e);
  s.absarc(-W + e + r, H - e - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-W + e, 0);
  s.lineTo(-W, 0);
  const g = grupo('aparador-arco', { l: largura, a: altura, p: profundidade });
  const m = malha(extrudir(s, profundidade, 0.008, 64), cor);
  m.position.z = -profundidade / 2;
  g.add(m);
  return g;
}

export function boleira({ diametro = 0.32, altura = 0.18, cor = 'branco' } = {}) {
  const r = diametro / 2;
  const pts = [
    [0, 0], [r * 0.85, 0], [r * 0.88, 0.006], [r * 0.85, 0.018], [r * 0.3, 0.03], [r * 0.24, 0.04],
    [r * 0.2, altura - 0.04], [r * 0.3, altura - 0.028], [r - 0.004, altura - 0.02], [r, altura - 0.014],
    [r, altura - 0.004], [r - 0.004, altura], [0, altura],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = grupo('boleira', { l: diametro, a: altura, p: diametro });
  g.add(malha(new THREE.LatheGeometry(pts, 128), cor));
  return g;
}

// ---------------------------------------------------------------------------------------------
// Figuras recortadas
// ---------------------------------------------------------------------------------------------
function baseFigura(g, largura, acab, profundidade = 0.16) {
  const b = malha(new THREE.BoxGeometry(largura, 0.035, profundidade), acab);
  b.position.set(0, 0.0175, 0.0);
  g.add(b);
  return 0.035;
}

function contornoBorboleta() {
  // meia borboleta (x ≥ 0) em curvas; espelhada para o lado esquerdo. Unidades: largura total ≈ 1.
  const lado = [
    ['M', 0.0, -0.30],
    ['C', 0.03, -0.30, 0.04, -0.22, 0.035, -0.12],
    // asa de baixo
    ['C', 0.09, -0.24, 0.18, -0.40, 0.27, -0.37],
    ['C', 0.37, -0.34, 0.40, -0.20, 0.33, -0.09],
    ['C', 0.29, -0.03, 0.22, 0.0, 0.16, 0.01],
    // asa de cima
    ['C', 0.26, 0.02, 0.43, 0.06, 0.48, 0.20],
    ['C', 0.52, 0.32, 0.46, 0.46, 0.33, 0.45],
    ['C', 0.20, 0.44, 0.08, 0.30, 0.04, 0.16],
    // cabeça
    ['C', 0.045, 0.22, 0.03, 0.26, 0.0, 0.26],
  ];
  return lado;
}

export function borboleta({ largura = 0.9, espessura = 0.02, cor = 'branco' } = {}) {
  const k = largura; // escala
  const lado = contornoBorboleta();
  const s = new THREE.Shape();
  const P = (x, y) => [x * k, (y + 0.4) * k];
  // lado direito, de baixo para cima
  s.moveTo(...P(lado[0][1], lado[0][2]));
  for (const seg of lado.slice(1)) {
    const [, x1, y1, x2, y2, x3, y3] = seg;
    s.bezierCurveTo(...P(x1, y1), ...P(x2, y2), ...P(x3, y3));
  }
  // lado esquerdo: o mesmo, espelhado e ao contrário
  const inv = [];
  let ant = [lado[0][1], lado[0][2]];
  const pontosFinais = [ant];
  for (const seg of lado.slice(1)) pontosFinais.push([seg[5], seg[6]]);
  for (let i = lado.length - 1; i >= 1; i--) {
    const [, x1, y1, x2, y2] = lado[i];
    const [x0, y0] = pontosFinais[i - 1];
    inv.push([-x2, y2, -x1, y1, -x0, y0]);
  }
  for (const [a, b, c, d, e, f] of inv) s.bezierCurveTo(...P(a, b), ...P(c, d), ...P(e, f));

  // recortes: círculos junto à orla e gotas que saem do corpo
  const furos = [];
  const circ = (x, y, r) => { const p = new THREE.Path(); p.absarc(...P(x, y), r * k, 0, Math.PI * 2, true); furos.push(p); };
  const gota = (x, y, rx, ry, ang) => { const p = new THREE.Path(); p.absellipse(...P(x, y), rx * k, ry * k, 0, Math.PI * 2, true, ang); furos.push(p); };
  for (const m of [1, -1]) {
    circ(m * 0.40, 0.33, 0.035); circ(m * 0.43, 0.22, 0.03); circ(m * 0.33, 0.39, 0.028); circ(m * 0.39, 0.13, 0.022); circ(m * 0.25, 0.40, 0.02);
    gota(m * 0.22, 0.22, 0.085, 0.03, m * 0.55); gota(m * 0.26, 0.10, 0.07, 0.024, m * 0.12); gota(m * 0.16, 0.31, 0.06, 0.022, m * 0.95);
    circ(m * 0.28, -0.27, 0.03); circ(m * 0.32, -0.17, 0.024); circ(m * 0.21, -0.32, 0.02);
    gota(m * 0.17, -0.15, 0.07, 0.024, m * -0.7);
  }
  s.holes.push(...furos);
  const g = grupo('borboleta', { l: largura * 1.0, a: largura * 0.86, p: 0.16 });
  const h0 = baseFigura(g, largura * 0.36, cor);
  const m = malha(extrudir(s, espessura, 0.003, 48), cor);
  m.position.set(0, h0 - 0.04 * k, -espessura / 2);
  g.add(m);
  return g;
}

export function coroa({ largura = 0.7, espessura = 0.022, cor = 'dourado' } = {}) {
  const W = largura / 2;
  const hb = 0.12 * largura / 0.7;
  const picos = [[-W, 0.40], [-W / 2, 0.47], [0, 0.56], [W / 2, 0.47], [W, 0.40]].map(([x, y]) => [x, y * largura / 0.7]);
  const vale = 0.22 * largura / 0.7;
  const s = new THREE.Shape();
  s.moveTo(-W * 0.92, 0);
  s.lineTo(W * 0.92, 0);
  s.lineTo(W * 0.96, hb);
  s.lineTo(picos[4][0], picos[4][1]);
  for (let i = 3; i >= 0; i--) {
    const xv = (picos[i][0] + picos[i + 1][0]) / 2;
    s.lineTo(xv, vale);
    s.lineTo(picos[i][0], picos[i][1]);
  }
  s.lineTo(-W * 0.96, hb);
  s.lineTo(-W * 0.92, 0);
  // losangos na banda
  for (const x of [-W * 0.55, 0, W * 0.55]) {
    const p = new THREE.Path();
    const h = hb * 0.32, w = largura * 0.05;
    p.moveTo(x, hb / 2 - h); p.lineTo(x - w, hb / 2); p.lineTo(x, hb / 2 + h); p.lineTo(x + w, hb / 2); p.lineTo(x, hb / 2 - h);
    s.holes.push(p);
  }
  const g = grupo('coroa', { l: largura + 0.06, a: picos[2][1] + 0.08, p: 0.16 });
  const h0 = baseFigura(g, largura * 0.6, cor);
  const corpo = malha(extrudir(s, espessura, 0.003, 24), cor);
  corpo.position.set(0, h0, -espessura / 2);
  g.add(corpo);
  for (const [x, y] of picos) {
    const bola = malha(new THREE.SphereGeometry(0.032 * largura / 0.7, 32, 16), cor);
    bola.position.set(x, h0 + y + 0.02 * largura / 0.7, 0);
    g.add(bola);
  }
  return g;
}

function contornoAmostrado(fn, n = 240) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const [x, y] = fn(i / n);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  return s;
}

export function nuvem({ largura = 1.0, espessura = 0.022, cor = 'branco' } = {}) {
  const k = largura;
  const circulos = [[-0.33, 0.13, 0.15], [-0.12, 0.25, 0.21], [0.13, 0.27, 0.2], [0.33, 0.15, 0.16]].map(([x, y, r]) => [x * k, y * k, r * k]);
  const topo = (x) => {
    let y = 0.06 * k;
    for (const [cx, cy, r] of circulos) {
      const dx = x - cx;
      if (Math.abs(dx) <= r) y = Math.max(y, cy + Math.sqrt(r * r - dx * dx));
    }
    return y;
  };
  const x0 = -0.47 * k, x1 = 0.47 * k, rb = 0.06 * k;
  const s = new THREE.Shape();
  s.moveTo(x0 + rb, 0);
  s.lineTo(x1 - rb, 0);
  s.absarc(x1 - rb, rb, rb, -Math.PI / 2, 0, false);
  const N = 200;
  for (let i = 0; i <= N; i++) {
    const x = x1 - (i / N) * (x1 - x0);
    s.lineTo(x, Math.max(rb, topo(x)));
  }
  s.absarc(x0 + rb, rb, rb, Math.PI, Math.PI * 1.5, false);
  const g = grupo('nuvem', { l: largura, a: 0.5 * k, p: 0.16 });
  const h0 = baseFigura(g, largura * 0.5, cor);
  const m = malha(extrudir(s, espessura, 0.003, 24), cor);
  m.position.set(0, h0, -espessura / 2);
  g.add(m);
  return g;
}

export function lua({ altura = 0.8, espessura = 0.022, cor = 'dourado' } = {}) {
  const R = altura / 2;
  const off = R * 0.42, r2 = R * 0.86;
  // crescente: arco exterior do círculo grande por fora do círculo pequeno deslocado
  const s = new THREE.Shape();
  const ang = Math.acos((R * R + off * off - r2 * r2) / (2 * R * off)); // ângulo do cruzamento no círculo grande
  const angIn = Math.acos((r2 * r2 + off * off - R * R) / (2 * r2 * off));
  s.moveTo(R * Math.cos(ang), R * Math.sin(ang));
  s.absarc(0, 0, R, ang, 2 * Math.PI - ang, false);
  s.absarc(off, 0, r2, 2 * Math.PI - (Math.PI - angIn), Math.PI - angIn, true);
  const g = grupo('lua', { l: altura * 0.62, a: altura + 0.04, p: 0.16 });
  const h0 = baseFigura(g, altura * 0.4, cor);
  const m = malha(extrudir(s, espessura, 0.003, 96), cor);
  m.rotation.z = 0.35;
  m.position.set(0.05 * altura, h0 + R + 0.01, -espessura / 2);
  g.add(m);
  return g;
}

export function estrela({ altura = 0.6, pontas = 5, espessura = 0.022, cor = 'dourado' } = {}) {
  const R = altura / 2, r = R * 0.48;
  const pts = [];
  for (let i = 0; i < pontas * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / pontas;
    const rr = i % 2 ? r : R;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  // pontas arredondadas: curva quadrática em cada vértice
  const s = new THREE.Shape();
  const n = pts.length;
  const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 0; i < n; i++) {
    const p = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const t = i % 2 ? 0.12 : 0.1;
    const a = mid(p, prev, t), b = mid(p, next, t);
    if (i === 0) s.moveTo(...a); else s.lineTo(...a);
    s.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  }
  s.closePath();
  const g = grupo('estrela', { l: altura, a: altura + 0.05, p: 0.16 });
  const h0 = baseFigura(g, altura * 0.42, cor);
  const m = malha(extrudir(s, espessura, 0.003, 24), cor);
  m.position.set(0, h0 + R * 0.95, -espessura / 2);
  g.add(m);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Letras e números (opentype.js): o texto vira contorno, o contorno vira MDF
// ---------------------------------------------------------------------------------------------
export function formasDeTexto(fonte, texto, alturaMaiuscula) {
  // fonte: objecto do opentype.js. Devolve { formas, largura, altura } com y para cima, base em 0.
  const escala = alturaMaiuscula / (fonte.tables.os2?.sCapHeight || fonte.unitsPerEm * 0.7);
  const caminho = fonte.getPath(texto, 0, 0, fonte.unitsPerEm, { kerning: true });
  const sp = new THREE.ShapePath();
  const k = escala; // getPath usa y para baixo: inverter
  for (const c of caminho.commands) {
    if (c.type === 'M') sp.moveTo(c.x * k, -c.y * k);
    else if (c.type === 'L') sp.lineTo(c.x * k, -c.y * k);
    else if (c.type === 'Q') sp.quadraticCurveTo(c.x1 * k, -c.y1 * k, c.x * k, -c.y * k);
    else if (c.type === 'C') sp.bezierCurveTo(c.x1 * k, -c.y1 * k, c.x2 * k, -c.y2 * k, c.x * k, -c.y * k);
  }
  let formas = sp.toShapes(false);
  if (!formas.some((f) => f.holes.length) && /[0689ABDOPQRabdegopq]/.test(texto)) {
    const alt = sp.toShapes(true);
    if (alt.some((f) => f.holes.length)) formas = alt;
  }
  const box = new THREE.Box2();
  for (const f of formas) for (const p of f.getPoints(12)) box.expandByPoint(p);
  return { formas, caixa: box };
}

export function textoMdf({ fonte, texto = 'Sofia', altura = 0.32, espessura = 0.02, cor = 'branco', comBase = true, nome = 'texto' } = {}) {
  const { formas, caixa } = formasDeTexto(fonte, texto, altura);
  const geo = extrudir(formas, espessura, 0.0025, 18);
  const cx = (caixa.min.x + caixa.max.x) / 2;
  geo.translate(-cx, -caixa.min.y, -espessura / 2);
  const largura = caixa.max.x - caixa.min.x;
  const alturaReal = caixa.max.y - caixa.min.y;
  const g = grupo(nome, { l: largura + 0.04, a: alturaReal + (comBase ? 0.035 : 0), p: comBase ? 0.16 : espessura });
  let h0 = 0;
  if (comBase) h0 = baseFigura(g, Math.min(largura + 0.06, Math.max(0.3, largura * 0.9)), cor, 0.14);
  const m = malha(geo, cor);
  m.position.y = h0;
  g.add(m);
  g.userData.texto = texto;
  return g;
}

// ---------------------------------------------------------------------------------------------
// Balões (só para compor cenas: a capa e o «Monta o teu cenário»; não se vendem)
// ---------------------------------------------------------------------------------------------
export function baloes({ pontos = [[-0.9, 0.4, 0.1], [-0.85, 1.4, 0.15], [-0.4, 2.15, 0.1], [0.35, 2.35, 0.05]], cores = ['rosa', 'branco', 'marfim'], n = 46, raio = [0.07, 0.17], semente = 3 } = {}) {
  const g = grupo('baloes', { l: 2, a: 2.5, p: 0.6 });
  let s = semente;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const curva = new THREE.CatmullRomCurve3(pontos.map((p) => new THREE.Vector3(...p)));
  const mats = {};
  const matBalao = (c) => (mats[c] ||= new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(ACABAMENTOS[c]?.hex || c), roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.18,
    sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff'),
  }));
  const geo = new THREE.SphereGeometry(1, 48, 32);
  // posições iniciais à volta da curva; depois afastam-se uns dos outros (como balões apertados num arco)
  const bs = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = curva.getPointAt(t);
    const r = raio[0] + rnd() * (raio[1] - raio[0]) * (1 - Math.abs(t - 0.45) * 0.6);
    bs.push({ t, r, cor: cores[Math.floor(rnd() * cores.length)], p: new THREE.Vector3(c.x + (rnd() - 0.5) * 0.3, c.y + (rnd() - 0.5) * 0.3, c.z + (rnd() - 0.5) * 0.34) });
  }
  const d = new THREE.Vector3();
  for (let it = 0; it < 60; it++) {
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j];
        d.subVectors(b.p, a.p);
        const dist = d.length() || 1e-4;
        const min = (a.r + b.r) * 0.96;
        if (dist < min) {
          d.multiplyScalar((min - dist) / dist / 2);
          a.p.sub(d);
          b.p.add(d);
        }
      }
    }
    // mola para a curva: o arco não se desfaz
    for (const b of bs) {
      const c = curva.getPointAt(b.t);
      d.subVectors(c, b.p);
      if (d.length() > 0.24) b.p.addScaledVector(d, 0.08);
    }
  }
  for (const b of bs) {
    const m = new THREE.Mesh(geo, matBalao(b.cor));
    m.scale.set(b.r, b.r * 1.06, b.r);
    m.position.copy(b.p);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Silhueta de uma pessoa (1,70 m), para dar a escala ao lado da peça
// ---------------------------------------------------------------------------------------------
export function silhueta({ altura = 1.7 } = {}) {
  // pictograma de pessoa: cabeça redonda solta, ombros redondos, braços junto ao corpo, pernas separadas
  const k = altura / 1.7;
  const P = (x, y) => [x * k, y * k];
  const corpo = new THREE.Shape();
  const lado = (m) => {
    // m = 1 (direita) ou -1 (esquerda); devolve a sequência de baixo para cima
    return [
      ['L', m * 0.016, 0.0],
      ['L', m * 0.118, 0.0],
      ['Q', m * 0.13, 0.0, m * 0.128, 0.03],
      ['L', m * 0.12, 0.5],
      ['L', m * 0.128, 0.84],
      ['Q', m * 0.15, 0.86, m * 0.168, 0.84],
      ['Q', m * 0.205, 0.8, m * 0.222, 0.86],
      ['Q', m * 0.236, 0.9, m * 0.238, 1.0],
      ['L', m * 0.238, 1.26],
      ['Q', m * 0.236, 1.4, m * 0.13, 1.425],
      ['L', m * 0.052, 1.44],
      ['Q', m * 0.044, 1.45, m * 0.044, 1.47],
    ];
  };
  corpo.moveTo(...P(0, 0.78));
  for (const [t, ...v] of lado(1)) {
    if (t === 'L') corpo.lineTo(...P(v[0], v[1]));
    else corpo.quadraticCurveTo(...P(v[0], v[1]), ...P(v[2], v[3]));
  }
  corpo.lineTo(...P(-0.044, 1.47));
  const esq = lado(-1);
  // o lado esquerdo percorrido de cima para baixo
  for (let i = esq.length - 1; i >= 1; i--) {
    const [t, ...v] = esq[i];
    const [, ...ant] = esq[i - 1];
    const fim = ant.length === 2 ? ant : [ant[2], ant[3]];
    if (t === 'L') corpo.lineTo(...P(fim[0], fim[1]));
    else corpo.quadraticCurveTo(...P(v[0], v[1]), ...P(fim[0], fim[1]));
  }
  corpo.lineTo(...P(-0.016, 0.0));
  corpo.lineTo(...P(0, 0.78));
  const cabeca = new THREE.Shape();
  cabeca.absarc(0, 1.6 * k, 0.105 * k, 0, Math.PI * 2, false);
  const g = grupo('silhueta', { l: 0.48 * k, a: altura, p: 0.02 });
  const m = new THREE.Mesh(extrudir([corpo, cabeca], 0.02, 0.003, 32), new THREE.MeshStandardMaterial({ color: '#C4BCA9', roughness: 0.95 }));
  m.castShadow = true;
  g.add(m);
  g.userData.semCor = true;
  return g;
}

// ---------------------------------------------------------------------------------------------
// Catálogo de construtores (o id do «modelo3d» no conteúdo do produto)
// ---------------------------------------------------------------------------------------------
export const MODELOS = {
  'arco-triplo': (o) => arco({ largura: 1.4, altura: 2.2, degraus: 3, passo: 0.12, ...o }),
  'arco-duplo': (o) => arco({ largura: 1.2, altura: 2.1, degraus: 2, passo: 0.12, ...o }),
  'arco-simples': (o) => arco({ largura: 1.0, altura: 2.0, degraus: 1, passo: 0.17, camada: 0.06, ...o }),
  'painel-romano': (o) => painelRomano(o),
  'trio-romanos': (o) => trioRomanos(o),
  'painel-redondo': (o) => painelRedondo(o),
  'arco-iris': (o) => arcoIris(o),
  'cilindro': (o) => cilindro(o),
  'trio-cilindros': (o) => trioCilindros(o),
  'cilindro-vazado': (o) => cilindroVazado(o),
  'mesa-ripas': (o) => mesaRipas(o),
  'aparador-arco': (o) => aparadorArco(o),
  'boleira': (o) => boleira(o),
  'borboleta': (o) => borboleta(o),
  'coroa': (o) => coroa(o),
  'nuvem': (o) => nuvem(o),
  'lua': (o) => lua(o),
  'estrela': (o) => estrela(o),
  'baloes': (o) => baloes(o),
};

export function criar(id, opcoes = {}) {
  const f = MODELOS[id];
  if (!f) throw new Error(`modelo 3D desconhecido: ${id}`);
  return f(opcoes);
}

// muda a cor de uma peça já montada (as partes «coloríveis»)
export function pintar(objeto, acab) {
  objeto.traverse((o) => {
    if (o.isMesh && o.userData.colorivel) o.material = material(acab);
  });
}

export function caixaDe(objeto) {
  return new THREE.Box3().setFromObject(objeto);
}
