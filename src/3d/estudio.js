// Estúdio de fotografia virtual: monta uma cena com as peças e devolve a imagem (PNG com transparência).
// Usado pelo scripts/renders.mjs e pelo scripts/renders-cenas.mjs (Chromium do Playwright).
import * as THREE from 'three';
import { prepararRenderer, ambiente, luzes, sombraDeContacto, enquadrar, montar } from './cena.js';
import { silhueta } from './pecas.js';

let renderer;
function obterRenderer(w, h) {
  if (!renderer) {
    renderer = prepararRenderer(new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }));
    document.body.appendChild(renderer.domElement);
  }
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  return renderer;
}

// spec: { itens: [...], vista: {az, el, fov, margem, desvioY}, tamanho: [w, h], fundo: null | '#hex', luz: {...} }
export async function renderizar(spec) {
  const [w, h] = spec.tamanho || [1600, 2000];
  const r = obterRenderer(w, h);
  const scene = new THREE.Scene();
  scene.background = spec.fundo ? new THREE.Color(spec.fundo) : null;
  ambiente(scene, r, spec.luz?.ambiente ?? 0.62);
  const raiz = new THREE.Group();
  for (const item of spec.itens) raiz.add(await montar(item));
  if (spec.escala) {
    // a pessoa de 1,70 m à direita da peça, para dar a escala
    raiz.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(raiz);
    const pessoa = silhueta();
    pessoa.position.set(b.max.x + 0.45, 0, (b.min.z + b.max.z) / 2);
    raiz.add(pessoa);
  }
  scene.add(raiz);
  luzes(scene, raiz, spec.luz || {});
  const contacto = sombraDeContacto(scene, raiz, spec.sombra || {});
  const largo = sombraDeContacto(scene, raiz, { escuridao: 0.7, desfoque: 9, altura: 1.4, opacidade: 0.35, resolucao: 512 });
  const camera = new THREE.PerspectiveCamera(spec.vista?.fov ?? 24, w / h, 0.05, 200);
  enquadrar(camera, raiz, spec.vista || {});
  contacto.gerar(r);
  largo.gerar(r);
  r.setClearColor(0x000000, 0);
  r.render(scene, camera);
  const url = r.domElement.toDataURL('image/png');
  contacto.libertar();
  largo.libertar();
  return url;
}

window.renderizar = renderizar;
window.estudioPronto = true;
