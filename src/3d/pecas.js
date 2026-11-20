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

// a silhueta da borboleta (sem recortes), com a largura k; desvioY sobe ou desce o desenho
function silhuetaBorboleta(k, desvioY = 0.4) {
  const lado = contornoBorboleta();
  const s = new THREE.Shape();
  const P = (x, y) => [x * k, (y + desvioY) * k];
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
  return { forma: s, P };
}

export function borboleta({ largura = 0.9, espessura = 0.02, cor = 'branco' } = {}) {
  const k = largura; // escala
  const { forma: s, P } = silhuetaBorboleta(k);

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

// estrela de pontas arredondadas, centrada em (0, 0), com o raio R das pontas
function formaEstrela(R, pontas = 5, interior = 0.48) {
  const r = R * interior;
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
  return s;
}

export function estrela({ altura = 0.6, pontas = 5, espessura = 0.022, cor = 'dourado' } = {}) {
  const R = altura / 2;
  const s = formaEstrela(R, pontas);
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
// Personalizados: peças pequenas cortadas e gravadas a laser (o quadro do primeiro ano, o enfeite do
// primeiro Natal, o balão com as nuvens dos meses). Os textos vêm gravados (castanho) ou em relevo.
// ---------------------------------------------------------------------------------------------
// as letras de cada modelo: o cena.js carrega-as antes de montar a peça e passa-as em opcoes.fontes
export const LETRAS = {
  'quadro-primeiro-ano': { escrita: '/media/fontes-3d/Yellowtail-Regular.ttf', nome: '/media/fontes-3d/Pacifico-Regular.ttf' },
  'enfeite-primeiro-natal': { escrita: '/media/fontes-3d/Yellowtail-Regular.ttf', numeros: '/media/fontes-3d/DMSerifDisplay-Regular.ttf' },
  'balao-meses': { escrita: '/media/fontes-3d/Yellowtail-Regular.ttf' },
};

const foscos = new Map();
function fosco(chave, hex, rugosidade = 0.9) {
  if (!foscos.has(chave)) foscos.set(chave, new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rugosidade, metalness: 0 }));
  return foscos.get(chave);
}
const matGravado = () => fosco('gravado', '#6A452C', 0.92); // a marca do laser no MDF
const matGravadoEscuro = () => fosco('gravado-escuro', '#3A2618', 0.8); // no dourado
const matQueimado = () => fosco('queimado', '#3F2B1F', 0.88); // a borda do MDF branco cortado a laser
const matJuta = () => fosco('juta', '#B08D63', 1);

// MDF cortado a laser: a face na cor; a borda queimada no MDF branco (ou marfim), pintada nas outras cores
function recorte(formas, espessura, acab, { borda = acab === 'branco' || acab === 'marfim', colorivel = true, curvas = 24 } = {}) {
  const geo = extrudir(formas, espessura, Math.min(0.0005, espessura * 0.15), curvas);
  const m = new THREE.Mesh(geo, borda ? [material(acab), matQueimado()] : material(acab));
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.colorivel = colorivel;
  return m;
}

// texto gravado: à flor da face (0,15 mm acima), sem sombra própria; (x, y) é o centro da caixa das letras.
// Se não couber em larguraMax, encolhe.
function gravar(fonte, texto, { altura, x = 0, y = 0, z = 0, larguraMax = Infinity, mat = matGravado() } = {}) {
  if (!fonte || !texto) return null;
  const { formas, caixa } = formasDeTexto(fonte, texto, altura);
  if (!formas.length) return null;
  const k = Math.min(1, larguraMax / Math.max(1e-6, caixa.max.x - caixa.min.x));
  const geo = new THREE.ShapeGeometry(formas, 8);
  geo.translate(-(caixa.min.x + caixa.max.x) / 2, -(caixa.min.y + caixa.max.y) / 2, 0);
  geo.scale(k, k, 1);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z + 0.00015);
  m.receiveShadow = true;
  return m;
}

// texto em relevo (letras de MDF coladas), centrado em (x, y), com a face de trás em z
function relevo(fonte, texto, { altura, espessura = 0.003, acab, x = 0, y = 0, z = 0, larguraMax = Infinity }) {
  if (!fonte || !texto) return null;
  const { formas, caixa } = formasDeTexto(fonte, texto, altura);
  if (!formas.length) return null;
  const k = Math.min(1, larguraMax / Math.max(1e-6, caixa.max.x - caixa.min.x));
  const m = recorte(formas, espessura, acab, { curvas: 14 });
  m.geometry.translate(-(caixa.min.x + caixa.max.x) / 2, -(caixa.min.y + caixa.max.y) / 2, 0);
  m.geometry.scale(k, k, 1);
  m.position.set(x, y, z);
  return m;
}

function retanguloRedondo(w, h, r, cx = 0, cy = 0, Classe = THREE.Shape) {
  const s = new Classe();
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function circulo(cx, cy, r) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}

// forma simétrica: o lado direito em segmentos ['Q', cx, cy, x, y] ou ['L', x, y], do topo (no eixo) até
// voltar ao eixo; o lado esquerdo é o mesmo, espelhado
function formaSimetrica(inicio, segs) {
  const s = new THREE.Shape();
  s.moveTo(inicio[0], inicio[1]);
  const pts = [inicio];
  for (const g of segs) {
    if (g[0] === 'Q') s.quadraticCurveTo(g[1], g[2], g[3], g[4]); else s.lineTo(g[1], g[2]);
    pts.push(g[0] === 'Q' ? [g[3], g[4]] : [g[1], g[2]]);
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const g = segs[i];
    const [px, py] = pts[i];
    if (g[0] === 'Q') s.quadraticCurveTo(-g[1], g[2], -px, py); else s.lineTo(-px, py);
  }
  return s;
}

// nuvem de placa (as nuvens dos meses): bolhas em cima, base direita; centrada em (0, 0)
function formaNuvemPlaca(largura) {
  const C = [[-0.30, -0.06, 0.15], [-0.10, 0.06, 0.22], [0.15, 0.08, 0.21], [0.33, -0.07, 0.14]];
  const topo = (x) => {
    let y = -Infinity;
    for (const [cx, cy, r] of C) { const dx = x - cx; if (Math.abs(dx) <= r) y = Math.max(y, cy + Math.sqrt(r * r - dx * dx)); }
    return y;
  };
  const L = C[0], R = C[C.length - 1];
  const pts = [];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * (Math.PI / 2); pts.push([R[0] + R[2] * Math.cos(a), R[1] + R[2] * Math.sin(a)]); }
  const x1 = R[0] + R[2], x0 = L[0] - L[2], N = 140;
  for (let i = 1; i < N; i++) { const x = x1 - (i / N) * (x1 - x0); pts.push([x, topo(x)]); }
  for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * (Math.PI / 2); pts.push([L[0] + L[2] * Math.cos(a), L[1] + L[2] * Math.sin(a)]); }
  const k = largura / (x1 - x0);
  const cx = (x0 + x1) / 2, cy = (-0.21 + 0.29) / 2;
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo((x - cx) * k, (y - cy) * k) : s.moveTo((x - cx) * k, (y - cy) * k)));
  s.closePath();
  return s;
}

// a árvore do enfeite: três andares e o tronco; base em y = 0, topo em y = 0.142, largura ≈ 0.14
function formaArvore() {
  return formaSimetrica([0, 0.142], [
    ['Q', 0.016, 0.130, 0.036, 0.117],
    ['Q', 0.042, 0.113, 0.033, 0.111],
    ['L', 0.022, 0.114],
    ['Q', 0.033, 0.100, 0.051, 0.085],
    ['Q', 0.057, 0.080, 0.047, 0.078],
    ['L', 0.031, 0.082],
    ['Q', 0.045, 0.063, 0.066, 0.043],
    ['Q', 0.073, 0.037, 0.062, 0.035],
    ['Q', 0.030, 0.030, 0.009, 0.023],
    ['L', 0.0095, 0.006],
    ['Q', 0.010, 0.0, 0.015, 0.0],
    ['L', 0, 0],
  ]);
}

// o balão de ar quente (a camada de cor): o envelope, as cordas com três vãos e o cesto; base do cesto em y = 0
const BALAO = { cy: 0.205, r: 0.105, pescoco: [0.0415, 0.073], c1: [0.05, 0.10], c2: [0.105, 0.14] };
function formaBalao() {
  const { cy, r, pescoco: [px, py], c1, c2 } = BALAO;
  const s = new THREE.Shape();
  s.moveTo(-0.021, 0);
  s.lineTo(0.021, 0);
  s.quadraticCurveTo(0.026, 0, 0.0265, 0.005);
  s.lineTo(0.029, 0.030);
  s.lineTo(0.034, 0.030);
  s.quadraticCurveTo(0.036, 0.030, 0.036, 0.032);
  s.lineTo(0.036, 0.036);
  s.quadraticCurveTo(0.036, 0.038, 0.034, 0.038);
  s.lineTo(0.031, 0.038);
  s.lineTo(px, py);
  s.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], r, cy);
  s.absarc(0, cy, r, 0, Math.PI, false);
  s.bezierCurveTo(-c2[0], c2[1], -c1[0], c1[1], -px, py);
  s.lineTo(-0.031, 0.038);
  s.lineTo(-0.034, 0.038);
  s.quadraticCurveTo(-0.036, 0.038, -0.036, 0.036);
  s.lineTo(-0.036, 0.032);
  s.quadraticCurveTo(-0.036, 0.030, -0.034, 0.030);
  s.lineTo(-0.029, 0.030);
  s.lineTo(-0.0265, 0.005);
  s.quadraticCurveTo(-0.026, 0, -0.021, 0);
  // os vãos entre as quatro cordas
  const vao = (pontos) => { const p = new THREE.Path(); pontos.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
  s.holes.push(
    vao([[0.0125, 0.041], [0.0278, 0.041], [0.0366, 0.0695], [0.016, 0.0695]]),
    vao([[-0.0085, 0.041], [0.0085, 0.041], [0.012, 0.0695], [-0.012, 0.0695]]),
    vao([[-0.0278, 0.041], [-0.0125, 0.041], [-0.016, 0.0695], [-0.0366, 0.0695]]),
  );
  return s;
}

// a meia-largura do envelope do balão à altura y
function larguraBalao(y) {
  const { cy, r, pescoco: [px, py], c1, c2 } = BALAO;
  if (y >= cy) return Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
  if (y <= py) return px;
  // a curva de baixo (Bézier) sobe sempre: procurar o t da altura y
  const B = (t, a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (B(m, py, c1[1], c2[1], cy) < y) lo = m; else hi = m; }
  return B((lo + hi) / 2, px, c1[0], c2[0], r);
}

// os três gomos brancos por cima do envelope (o do meio em lente, os de lado em crescente)
function gomosBalao() {
  const s = 0.86, yc = 0.2, yMin = 0.094, folga = 0.007;
  const wi = (y) => s * larguraBalao(yc + (y - yc) / s);
  const yMax = yc + (BALAO.cy + BALAO.r - yc) * s - 0.0005;
  const N = 90;
  const meio = [], dir = [];
  for (let i = 0; i <= N; i++) {
    const y = yMin + (i / N) * (yMax - yMin);
    const w = wi(y);
    meio.push([Math.max(0, 0.38 * w - folga), y]);
    dir.push([0.38 * w + folga, w, y]);
  }
  const poligono = (pts) => { const p = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
  const centro = poligono([...meio.filter(([x]) => x > 0), ...meio.filter(([x]) => x > 0).reverse().map(([x, y]) => [-x, y])]);
  const lado = dir.filter(([a, b]) => b - a > 0.001);
  const direito = poligono([...lado.map(([, b, y]) => [b, y]), ...lado.slice().reverse().map(([a, , y]) => [a, y])]);
  const esquerdo = poligono([...lado.map(([a, , y]) => [-a, y]), ...lado.slice().reverse().map(([, b, y]) => [-b, y])]);
  return [centro, direito, esquerdo];
}

const MESES_ROTULOS = ['1 mês', '2 meses', '3 meses', '4 meses', '5 meses', '6 meses', '7 meses', '8 meses', '9 meses', '10 meses', '11 meses', '1 ano'];

export function quadroPrimeiroAno({ cor = 'branco', nome = 'Sofia', fontes = {} } = {}) {
  const L = 0.42, A = 0.54, E = 0.005, M = 0.003; // placa e molduras
  const F = fontes;
  const g = grupo('quadro-primeiro-ano', { l: L, a: 0.56, p: 0.13 });
  const q = new THREE.Group();
  const add = (o) => o && q.add(o);
  q.add(recorte(retanguloRedondo(L, A, 0.02, 0, A / 2), E, 'branco', { borda: false, colorivel: false, curvas: 32 }));
  const molduraEm = (cx, cy, w, h) => {
    const s = retanguloRedondo(w, h, 0.007);
    s.holes.push(retanguloRedondo(w - 0.018, h - 0.018, 0.003, 0, 0, THREE.Path));
    const m = recorte(s, M, 'branco', { borda: false, colorivel: false, curvas: 10 });
    m.position.set(cx, cy, E);
    q.add(m);
  };
  const etiqueta = (texto, cx, cy) => add(gravar(F.escrita, texto, { altura: 0.0085, x: cx, y: cy, z: E, larguraMax: 0.078 }));
  // os doze meses: 4 colunas × 3 filas
  const colunas = [-0.1485, -0.0495, 0.0495, 0.1485];
  const filas = [0.276, 0.150, 0.024];
  const fw = 0.080, fh = 0.098;
  MESES_ROTULOS.forEach((r, i) => {
    const cx = colunas[i % 4], y0 = filas[Math.floor(i / 4)];
    molduraEm(cx, y0 + fh / 2, fw, fh);
    etiqueta(r, cx, y0 + fh + 0.0115);
  });
  // o primeiro dia, ao alto e à esquerda; o título e o nome à direita
  molduraEm(-0.127, 0.4525, 0.122, 0.089);
  etiqueta('O meu primeiro dia', -0.127, 0.509);
  add(gravar(F.escrita, 'O meu primeiro ano', { altura: 0.0135, x: 0.072, y: 0.501, z: E, larguraMax: 0.2 }));
  add(relevo(F.nome, nome, { altura: 0.03, espessura: 0.004, acab: cor, x: 0.072, y: 0.446, z: E, larguraMax: 0.21 }));
  // borboletas na cor do nome, pousadas nos cantos de algumas molduras
  const borb = (x, y, w, rot, z = E + M) => {
    const { forma } = silhuetaBorboleta(w, -0.08);
    const m = recorte(forma, 0.003, cor, { curvas: 10 });
    m.position.set(x, y, z);
    m.rotation.z = rot;
    q.add(m);
  };
  borb(-0.186, 0.495, 0.026, 0.35);
  borb(-0.1865, 0.372, 0.024, 0.3);
  borb(0.1865, 0.372, 0.024, -0.3);
  borb(0.0115, 0.246, 0.024, 0.25);
  borb(-0.1105, 0.120, 0.024, -0.3);
  borb(0.1115, 0.120, 0.024, 0.3);
  borb(0.183, 0.497, 0.034, -0.25, E);
  // o quadro inclina-se para trás e assenta nos dois pés de madeira
  q.rotation.x = -0.14;
  q.position.set(0, 0.016, -E / 2);
  g.add(q);
  const pe = new THREE.Shape();
  pe.moveTo(-0.045, 0);
  pe.lineTo(0.075, 0);
  pe.lineTo(0.075, 0.010);
  pe.quadraticCurveTo(0.03, 0.02, 0.012, 0.042);
  pe.lineTo(-0.012, 0.042);
  pe.quadraticCurveTo(-0.03, 0.02, -0.045, 0.010);
  pe.lineTo(-0.045, 0);
  const geoPe = extrudir(pe, 0.008, 0.001, 16);
  geoPe.translate(0, 0, -0.004);
  geoPe.rotateY(Math.PI / 2);
  for (const sx of [-0.13, 0.13]) {
    const m = malha(geoPe, 'madeira');
    m.userData.colorivel = false;
    m.position.x = sx;
    g.add(m);
  }
  return g;
}

export function enfeitePrimeiroNatal({ cor = 'branco', nome = 'Tomás', ano = 2026, fontes = {} } = {}) {
  const E = 0.004;
  const F = fontes;
  const g = grupo('enfeite-primeiro-natal', { l: 0.14, a: 0.26, p: 0.02 });
  const e = new THREE.Group();
  const add = (o) => o && e.add(o);
  const arvore = recorte(formaArvore(), E, cor, { curvas: 20 });
  arvore.position.z = -E / 2;
  e.add(arvore);
  const zf = E / 2;
  add(gravar(F.escrita, 'O meu', { altura: 0.0085, x: 0, y: 0.121, z: zf }));
  add(gravar(F.escrita, 'primeiro', { altura: 0.0085, x: 0, y: 0.1015, z: zf, larguraMax: 0.05 }));
  add(gravar(F.escrita, 'Natal', { altura: 0.0095, x: 0, y: 0.084, z: zf }));
  add(gravar(F.escrita, nome, { altura: 0.0135, x: 0, y: 0.055, z: zf, larguraMax: 0.08 }));
  // três estrelinhas de MDF branco coladas por cima
  for (const [x, y, r] of [[-0.026, 0.118, 0.35], [0.034, 0.083, -0.2], [-0.041, 0.043, 0.15]]) {
    const st = recorte(formaEstrela(0.0062), 0.003, 'branco', { colorivel: false, curvas: 6 });
    st.position.set(x, y, zf);
    st.rotation.z = r;
    e.add(st);
  }
  // a estrela dourada com o ano, e o furo do fio na ponta de cima
  const yEst = 0.151, rEst = 0.022;
  const fe = formaEstrela(rEst, 5, 0.5);
  fe.holes.push(circulo(0, 0.0148, 0.0021));
  const est = recorte(fe, E, 'dourado', { borda: false, colorivel: false, curvas: 8 });
  est.position.set(0, yEst, zf);
  e.add(est);
  add(gravar(F.numeros, String(ano), { altura: 0.0052, x: 0, y: yEst - 0.0012, z: zf + E, larguraMax: 0.017, mat: matGravadoEscuro() }));
  // o fio de juta, a passar pelo furo
  const H = new THREE.Vector3(0, yEst + 0.0148, zf + E / 2);
  const curva = new THREE.CatmullRomCurve3([
    [0, 0, 0.0035], [-0.004, 0.006, 0.002], [-0.007, 0.03, 0], [0, 0.058, 0], [0.007, 0.03, 0], [0.004, 0.006, -0.002], [0, 0, -0.0035],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).add(H)), true);
  const fio = new THREE.Mesh(new THREE.TubeGeometry(curva, 140, 0.0014, 8, true), matJuta());
  fio.castShadow = true;
  e.add(fio);
  // pendurado: fica um pouco acima do chão
  e.position.y = 0.03;
  g.add(e);
  return g;
}

export function balaoMeses({ cor = 'azul', nome = 'Leonor', fontes = {}, nuvens = true } = {}) {
  const E = 0.003;
  const F = fontes;
  const g = grupo('balao-meses', { l: 0.6, a: 0.02, p: 0.5 });
  // o balão, desenhado ao alto (y para cima, a face para +z) e depois deitado
  const b = new THREE.Group();
  const add = (o) => o && b.add(o);
  b.add(recorte(formaBalao(), E, cor, { curvas: 48 }));
  for (const gomo of gomosBalao()) {
    const m = recorte(gomo, E, 'branco', { colorivel: false, curvas: 4 });
    m.position.z = E;
    b.add(m);
  }
  const placa = recorte(formaNuvemPlaca(0.15), E, 'branco', { colorivel: false, curvas: 4 });
  placa.position.set(0, 0.19, 2 * E);
  b.add(placa);
  add(gravar(F.escrita, 'Cheguei ao mundo', { altura: 0.0085, x: 0, y: 0.1985, z: 3 * E, larguraMax: 0.11 }));
  add(gravar(F.escrita, nome, { altura: 0.0125, x: 0, y: 0.1765, z: 3 * E, larguraMax: 0.11 }));
  b.rotation.x = -Math.PI / 2;
  b.position.z = 0.155;
  g.add(b);
  // as doze nuvens dos meses à volta do balão, como num relógio: o 1.º mês à uma hora, o 1.º ano ao meio-dia
  if (nuvens) {
    const rx = 0.232, rz = 0.218;
    const viradas = [0.05, -0.04, 0.03, -0.06, 0.04, -0.02, 0.05, -0.03, 0.04, -0.05, 0.03, -0.02];
    MESES_ROTULOS.forEach((r, i) => {
      const ang = Math.PI / 2 - (i + 1) * (Math.PI / 6);
      const n = new THREE.Group();
      n.add(recorte(formaNuvemPlaca(0.11), E, 'branco', { colorivel: false, curvas: 4 }));
      const t = gravar(F.escrita, r, { altura: 0.0105, x: 0, y: -0.004, z: E, larguraMax: 0.08 });
      if (t) n.add(t);
      n.rotation.z = viradas[i];
      const deitada = new THREE.Group();
      deitada.add(n);
      deitada.rotation.x = -Math.PI / 2;
      deitada.position.set(rx * Math.cos(ang), 0, -rz * Math.sin(ang));
      g.add(deitada);
    });
  }
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
  'quadro-primeiro-ano': (o) => quadroPrimeiroAno(o),
  'enfeite-primeiro-natal': (o) => enfeitePrimeiroNatal(o),
  'balao-meses': (o) => balaoMeses(o),
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
