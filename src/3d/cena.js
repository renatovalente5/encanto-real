// Montar uma cena de estúdio (luzes, sombras de contacto, enquadramento): partilhado pelo estúdio das
// fotografias (estudio.js) e pelo visualizador interactivo do site (visor.js).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';
import * as P from './pecas.js';

const fontes = {};
export async function fonte(url) {
  if (!fontes[url]) {
    fontes[url] = (async () => {
      const opentype = window.opentype || (await import(/* @vite-ignore */ window.__opentypeUrl)).default;
      const buf = await (await fetch(url)).arrayBuffer();
      return opentype.parse(buf);
    })();
  }
  return fontes[url];
}

// raiz: prefixo dos endereços das letras (no site: a base do GitHub Pages)
export async function montar(item, raiz = '') {
  let obj;
  if (item.texto) {
    const f = await fonte(raiz + item.texto.fonte);
    obj = P.textoMdf({ ...item.texto, fonte: f });
  } else {
    const opcoes = { ...(item.opcoes || {}) };
    // peças com textos gravados ou em relevo: as letras carregam-se antes de montar
    const letras = P.LETRAS[item.modelo];
    if (letras) {
      opcoes.fontes = {};
      for (const [k, url] of Object.entries(letras)) opcoes.fontes[k] = await fonte(raiz + url);
    }
    obj = P.criar(item.modelo, opcoes);
  }
  if (item.pos) obj.position.set(...item.pos);
  if (item.rot) obj.rotation.y = item.rot;
  if (item.escala) obj.scale.setScalar(item.escala);
  obj.userData.item = item;
  return obj;
}

export function prepararRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function ambiente(scene, renderer, intensidade = 0.62) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = intensidade;
  pmrem.dispose();
  return env;
}

export function luzes(scene, raiz, luz = {}) {
  raiz.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(raiz);
  const tam = box.getSize(new THREE.Vector3());
  const centro = box.getCenter(new THREE.Vector3());
  const L = Math.max(tam.x, tam.y, tam.z) * 2 + 1;
  const chave = new THREE.DirectionalLight(0xfff5ea, luz.chave ?? 2.3);
  chave.position.set(centro.x - 0.55 * L, 1.0 * L, centro.z + 0.8 * L);
  chave.target.position.copy(centro);
  chave.castShadow = true;
  chave.shadow.mapSize.set(luz.mapa ?? 4096, luz.mapa ?? 4096);
  const s = Math.max(tam.x, tam.y, tam.z) * 0.9 + 0.3;
  Object.assign(chave.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: L * 3 });
  chave.shadow.bias = -0.0004;
  chave.shadow.normalBias = 0.012;
  chave.shadow.radius = 6;
  const preenchimento = new THREE.DirectionalLight(0xf2f4ff, luz.preenchimento ?? 0.32);
  preenchimento.position.set(centro.x + 0.9 * L, 0.35 * L, centro.z + 0.6 * L);
  const contraluz = new THREE.DirectionalLight(0xffffff, luz.contraluz ?? 0.7);
  contraluz.position.set(centro.x + 0.4 * L, 0.9 * L, centro.z - 0.9 * L);
  const grupo = new THREE.Group();
  grupo.name = 'luzes';
  grupo.add(chave, chave.target, preenchimento, contraluz);
  // chão que só recebe a sombra comprida
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: luz.sombraChao ?? 0.13 }));
  chao.receiveShadow = true;
  chao.userData.semSombraDeContacto = true;
  grupo.add(chao);
  scene.add(grupo);
  return grupo;
}

export function sombraDeContacto(scene, objeto, { escuridao = 1.0, desfoque = 3.2, altura = 0.5, opacidade = 0.55, resolucao = 1024 } = {}) {
  const box = new THREE.Box3().setFromObject(objeto);
  const tam = box.getSize(new THREE.Vector3());
  const lado = Math.max(tam.x, tam.z) * 1.5 + 1.2;
  const grupo = new THREE.Group();
  grupo.position.set((box.min.x + box.max.x) / 2, 0.0005, (box.min.z + box.max.z) / 2);
  scene.add(grupo);
  const rt = new THREE.WebGLRenderTarget(resolucao, resolucao);
  rt.texture.generateMipmaps = false;
  const rtBlur = new THREE.WebGLRenderTarget(resolucao, resolucao);
  rtBlur.texture.generateMipmaps = false;
  const geo = new THREE.PlaneGeometry(lado, lado).rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: rt.texture, opacity: opacidade, transparent: true, depthWrite: false });
  const plano = new THREE.Mesh(geo, mat);
  plano.renderOrder = 1;
  plano.scale.y = -1;
  plano.userData.semSombraDeContacto = true;
  grupo.add(plano);
  const planoBlur = new THREE.Mesh(geo);
  planoBlur.visible = false;
  grupo.add(planoBlur);
  const cam = new THREE.OrthographicCamera(-lado / 2, lado / 2, lado / 2, -lado / 2, 0, altura);
  cam.rotation.x = Math.PI / 2;
  grupo.add(cam);
  const depthMat = new THREE.MeshDepthMaterial();
  depthMat.userData.darkness = { value: escuridao };
  depthMat.onBeforeCompile = (shader) => {
    shader.uniforms.darkness = depthMat.userData.darkness;
    shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
      'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
      'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'
    )}`;
  };
  depthMat.depthTest = false;
  depthMat.depthWrite = false;
  const hMat = new THREE.ShaderMaterial(HorizontalBlurShader);
  hMat.depthTest = false;
  const vMat = new THREE.ShaderMaterial(VerticalBlurShader);
  vMat.depthTest = false;
  return {
    grupo,
    gerar(renderer) {
      const fundo = scene.background;
      scene.background = null;
      const escondidos = [];
      scene.traverse((o) => { if (o.userData.semSombraDeContacto && o.visible) { o.visible = false; escondidos.push(o); } });
      scene.overrideMaterial = depthMat;
      const alfa = renderer.getClearAlpha();
      const corLimpeza = renderer.getClearColor(new THREE.Color());
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      scene.overrideMaterial = null;
      for (const q of [desfoque, desfoque * 0.4]) {
        planoBlur.visible = true;
        planoBlur.material = hMat;
        hMat.uniforms.tDiffuse.value = rt.texture;
        hMat.uniforms.h.value = q / 256;
        renderer.setRenderTarget(rtBlur);
        renderer.clear();
        renderer.render(planoBlur, cam);
        planoBlur.material = vMat;
        vMat.uniforms.tDiffuse.value = rtBlur.texture;
        vMat.uniforms.v.value = q / 256;
        renderer.setRenderTarget(rt);
        renderer.clear();
        renderer.render(planoBlur, cam);
        planoBlur.visible = false;
      }
      renderer.setRenderTarget(null);
      renderer.setClearColor(corLimpeza, alfa);
      scene.background = fundo;
      escondidos.forEach((o) => (o.visible = true));
    },
    libertar() {
      rt.dispose(); rtBlur.dispose(); geo.dispose(); mat.dispose(); depthMat.dispose(); hMat.dispose(); vMat.dispose();
      grupo.removeFromParent();
    },
  };
}

function pontosDe(objeto, max = 6000) {
  const pts = [];
  objeto.updateMatrixWorld(true);
  objeto.traverse((o) => {
    if (!o.isMesh || o.userData.semSombraDeContacto) return;
    const pos = o.geometry.attributes.position;
    const passo = Math.max(1, Math.floor(pos.count / 400));
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += passo) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone());
  });
  if (pts.length > max) {
    const k = Math.ceil(pts.length / max);
    return pts.filter((_, i) => i % k === 0);
  }
  return pts;
}

// põe a câmara a olhar para o objecto, com a margem pedida, a partir de az/el (graus)
export function enquadrar(camera, objeto, { az = 30, el = 12, margem = 0.1, desvioY = 0 } = {}) {
  const box = new THREE.Box3().setFromObject(objeto);
  const centro = box.getCenter(new THREE.Vector3());
  const raio = box.getSize(new THREE.Vector3()).length() / 2;
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  const dir = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  const pts = pontosDe(objeto);
  const alvo = centro.clone();
  let dist = raio / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
  for (let it = 0; it < 8; it++) {
    camera.position.copy(alvo).addScaledVector(dir, dist);
    camera.lookAt(alvo);
    camera.updateMatrixWorld(true);
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    const q = new THREE.Vector3();
    for (const p of pts) {
      q.copy(p).project(camera);
      minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x);
      miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y);
    }
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    const limite = 1 - margem * 2;
    const f = Math.max((maxx - minx) / 2 / limite, (maxy - miny) / 2 / limite);
    const meiaAltura = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    alvo.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), cx * meiaAltura * camera.aspect);
    alvo.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), (cy + desvioY) * meiaAltura);
    dist *= f;
  }
  camera.position.copy(alvo).addScaledVector(dir, dist);
  camera.lookAt(alvo);
  camera.updateMatrixWorld(true);
  return { alvo, dist, dir };
}
