// Visualizador 3D do site: rodar a peça com o dedo/rato, mudar a cor ao vivo, trocar as peças (Monta o teu
// cenário). Só desenha quando alguma coisa muda (poupa a bateria). Sem WebGL, a página fica com a fotografia.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { prepararRenderer, ambiente, luzes, sombraDeContacto, enquadrar, montar } from './cena.js';
import * as P from './pecas.js';

export function temWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export async function criarVisor(contentor, { itens, vista = { az: 24, el: 10, margem: 0.08 }, raiz = '', balanco = true, aoMudar } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'visor3d__tela';
  canvas.setAttribute('role', 'img');
  contentor.appendChild(canvas);
  const renderer = prepararRenderer(new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  ambiente(scene, renderer, 0.62);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 200);
  const controlos = new OrbitControls(camera, canvas);
  controlos.enableDamping = true;
  controlos.dampingFactor = 0.08;
  controlos.enablePan = false;
  controlos.enableZoom = false;
  controlos.rotateSpeed = 0.7;
  // até 35° acima do horizonte; as peças deitadas (o balão com as nuvens) deixam ver mais de cima (vista.elMax)
  controlos.minPolarAngle = THREE.MathUtils.degToRad(90 - (vista.elMax ?? 35));
  controlos.maxPolarAngle = THREE.MathUtils.degToRad(88);

  let grupoPecas = new THREE.Group();
  let grupoLuzes = null;
  let sombras = [];
  let pedido = false;
  let tocou = false;
  let t0 = performance.now();
  let destruido = false;
  let vistaAtual = vista;

  const pedir = () => { if (!pedido && !destruido) { pedido = true; requestAnimationFrame(desenhar); } };

  function tamanho() {
    const r = contentor.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  async function porItens(lista, { reenquadrar = true } = {}) {
    const novo = new THREE.Group();
    for (const it of lista) novo.add(await montar(it, raiz));
    scene.remove(grupoPecas);
    grupoPecas = novo;
    scene.add(grupoPecas);
    if (grupoLuzes) scene.remove(grupoLuzes);
    grupoLuzes = luzes(scene, grupoPecas, { mapa: 2048 });
    sombras.forEach((s) => s.libertar());
    sombras = [
      sombraDeContacto(scene, grupoPecas, { resolucao: 512 }),
      sombraDeContacto(scene, grupoPecas, { escuridao: 0.7, desfoque: 9, altura: 1.4, opacidade: 0.35, resolucao: 256 }),
    ];
    sombras.forEach((s) => s.gerar(renderer));
    if (reenquadrar) {
      tamanho();
      const { alvo } = enquadrar(camera, grupoPecas, vistaAtual);
      controlos.target.copy(alvo);
      controlos.update();
    }
    canvas.setAttribute('aria-label', 'Vista 3D: ' + lista.map((i) => i.rotulo || i.modelo || i.texto?.texto).filter(Boolean).join(', '));
    pedir();
  }

  function desenhar(agora) {
    pedido = false;
    if (destruido) return;
    // balanço suave até a pessoa mexer (±10°), parado com «menos movimento»
    if (balanco && !tocou && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const ang = Math.sin((agora - t0) / 2600) * 0.17;
      const off = new THREE.Vector3().subVectors(camera.position, controlos.target);
      const r = Math.hypot(off.x, off.z);
      const base = THREE.MathUtils.degToRad(vistaAtual.az ?? 24);
      off.x = Math.sin(base + ang) * r;
      off.z = Math.cos(base + ang) * r;
      camera.position.copy(controlos.target).add(off);
      camera.lookAt(controlos.target);
      pedir();
    }
    const mudou = controlos.update();
    renderer.render(scene, camera);
    if (mudou) pedir();
  }

  controlos.addEventListener('start', () => { tocou = true; contentor.classList.add('visor3d--mexido'); });
  controlos.addEventListener('change', pedir);
  const ro = new ResizeObserver(() => { tamanho(); pedir(); });
  ro.observe(contentor);
  // fora do ecrã não se desenha
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) pedir(); });
  io.observe(contentor);

  await porItens(itens);
  contentor.classList.add('visor3d--pronto');

  return {
    pintar(funcao) {
      // funcao(itemOriginal) → cor a usar (ou null para deixar)
      grupoPecas.children.forEach((obj) => {
        const cor = funcao(obj.userData.item);
        if (cor) P.pintar(obj, cor);
      });
      sombras.forEach((s) => s.gerar(renderer));
      aoMudar?.();
      pedir();
    },
    async trocar(lista, opcoes) { await porItens(lista, opcoes); aoMudar?.(); },
    vista(v) { vistaAtual = { ...vistaAtual, ...v }; const { alvo } = enquadrar(camera, grupoPecas, vistaAtual); controlos.target.copy(alvo); controlos.update(); pedir(); },
    imagem() { renderer.render(scene, camera); return canvas.toDataURL('image/png'); },
    destruir() { destruido = true; ro.disconnect(); io.disconnect(); controlos.dispose(); renderer.dispose(); canvas.remove(); },
  };
}
