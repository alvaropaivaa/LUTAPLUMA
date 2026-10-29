import * as THREE from 'three';

/** Renderizador padrão das peças 3D do site (cores fiéis, sem lavar o laranja) */
export function createRenderer(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  // 1,5x já fica nítido e evita estourar a memória de vídeo com duas cenas na página
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.style.display = 'block';
  host.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Estúdio fotográfico virtual: softbox branca em cima, tiras laranja nas laterais,
 * rebatida azul por baixo e contraluz laranja. É o que dá os reflexos no ouro e no vidro.
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const room = new THREE.SphereGeometry(30, 32, 16);
  const roomMat = new THREE.MeshBasicMaterial({ color: 0x141a2e, side: THREE.BackSide });
  scene.add(new THREE.Mesh(room, roomMat));
  geos.push(room);
  mats.push(roomMat);
  const plane = new THREE.PlaneGeometry(1, 1);
  geos.push(plane);
  const panel = (w: number, h: number, color: number, power: number, x: number, y: number, z: number) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide });
    mats.push(mat);
    const m = new THREE.Mesh(plane, mat);
    m.scale.set(w, h, 1);
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(9, 3, 0xffffff, 7, 0, 8, 5);
  panel(2.5, 12, 0xff8a3d, 6, -9, 1, 3);
  panel(2.5, 12, 0xffd9b0, 3.5, 9, 2, 2);
  panel(12, 2.5, 0x4d6dff, 2.2, 0, -8, 4);
  panel(4, 4, 0xffffff, 1.4, 6, 4, 8);
  panel(16, 10, 0xffe4c8, 0.75, 0, 0, 12); // luz suave de frente: o ouro da face não fica escuro
  panel(8, 8, 0xff6a10, 2.4, 0, 0, -10);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.03);
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return target;
}

export type LogoMaps = { color: THREE.Texture; bump: THREE.Texture; orm: THREE.Texture };

/** Logo vetorizada: cor (branco vira ouro), relevo e metal/rugosidade. `onReady` avisa quando as três chegaram */
export function loadLogoMaps(renderer: THREE.WebGLRenderer, onReady?: () => void): LogoMaps {
  const manager = new THREE.LoadingManager(onReady);
  const loader = new THREE.TextureLoader(manager);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const load = (url: string, srgb: boolean) => {
    const t = loader.load(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  return { color: load('/site/3d/logo-ouro.webp', true), bump: load('/site/3d/logo-relevo.webp', false), orm: load('/site/3d/logo-metal.webp', false) };
}

/** Material da face com a logo: ouro em relevo e esmalte azul/laranja envernizado */
export function logoFaceMaterial(maps: LogoMaps) {
  return new THREE.MeshPhysicalMaterial({
    map: maps.color,
    bumpMap: maps.bump,
    bumpScale: 3.2,
    roughnessMap: maps.orm,
    metalnessMap: maps.orm,
    roughness: 1,
    metalness: 1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.14,
  });
}

/**
 * Corpo de moeda/medalha torneado: face rebaixada, aro alto e borda chanfrada.
 * Eixo em Z (a face olha para a câmera). A logo vai num círculo de raio `r * 0.81`.
 */
export function coinGeometry(r = 1.2, t = 0.125) {
  const k = r / 1.2;
  const top: [number, number][] = [
    [0, 0.44],
    [0.97, 0.44],
    [0.99, 0.52],
    [1.02, 0.8],
    [1.06, 0.976],
    [1.12, 1],
    [1.165, 0.88],
    [1.195, 0.6],
    [1.205, 0.24],
  ];
  const pts = [...top, ...[...top].reverse().map(([x, y]) => [x, -y] as [number, number])].map(([x, y]) => new THREE.Vector2(x * k, y * t));
  const geo = new THREE.LatheGeometry(pts, 160);
  geo.rotateX(Math.PI / 2);
  return { geo, face: 0.972 * k, faceZ: 0.44 * t + 0.0015 };
}

/** Ouro polido */
export function goldMaterial(roughness = 0.2) {
  return new THREE.MeshPhysicalMaterial({ color: 0xf3c463, metalness: 1, roughness, clearcoat: 0.5, clearcoatRoughness: 0.1 });
}

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Bolinha de luz desfocada (bokeh) */
export function glowTexture() {
  return canvasTexture(128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
}

/** Brilho em estrela de 4 pontas (reflexo no metal) */
export function starTexture() {
  return canvasTexture(128, (g, s) => {
    const c = s / 2;
    const r = g.createRadialGradient(c, c, 0, c, c, c * 0.35);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter';
    for (const horiz of [true, false]) {
      const l = horiz ? g.createLinearGradient(0, c, s, c) : g.createLinearGradient(c, 0, c, s);
      l.addColorStop(0, 'rgba(255,255,255,0)');
      l.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      l.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = l;
      if (horiz) g.fillRect(0, c - 1.5, s, 3);
      else g.fillRect(c - 1.5, 0, 3, s);
    }
  });
}

type Bokeh = { s: THREE.Sprite; base: number; speed: number; phase: number; drift: number };

/** Partículas de luz em várias profundidades: dá a sensação de foto com profundidade de campo */
export function addBokeh(scene: THREE.Scene, tex: THREE.Texture, count: number, colors: number[]) {
  const list: Bokeh[] = [];
  const mats: THREE.SpriteMaterial[] = [];
  for (let i = 0; i < count; i++) {
    const near = i % 4 === 0;
    const mat = new THREE.SpriteMaterial({ map: tex, color: colors[i % colors.length], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    mats.push(mat);
    const s = new THREE.Sprite(mat);
    const size = near ? 0.6 + Math.random() * 0.7 : 0.08 + Math.random() * 0.25;
    s.scale.setScalar(size);
    s.position.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5, near ? 2 + Math.random() * 2 : -1 - Math.random() * 3);
    const base = near ? 0.06 + Math.random() * 0.06 : 0.25 + Math.random() * 0.45;
    mat.opacity = base;
    scene.add(s);
    list.push({ s, base, speed: 0.6 + Math.random() * 1.4, phase: Math.random() * 6, drift: 0.05 + Math.random() * 0.12 });
  }
  return {
    update(t: number) {
      for (const b of list) {
        (b.s.material as THREE.SpriteMaterial).opacity = b.base * (0.55 + 0.45 * Math.sin(t * b.speed + b.phase));
        b.s.position.y += Math.sin(t * 0.3 + b.phase) * 0.0008 + b.drift * 0.004;
        if (b.s.position.y > 2.8) b.s.position.y = -2.8;
      }
    },
    dispose() {
      mats.forEach((m) => m.dispose());
    },
  };
}

/** Acompanha o ponteiro (suavizado) em relação ao elemento */
export function trackPointer(el: HTMLElement) {
  const target = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  return { target, dispose: () => window.removeEventListener('pointermove', onMove) };
}

/** Ajusta tamanho, pausa fora da tela e roda o laço de animação */
export function runLoop(el: HTMLElement, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, frame: (t: number, dt: number) => void) {
  const resize = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  let raf = 0;
  let last = -1;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (document.hidden) return;
    // confere a posição a cada quadro (o IntersectionObserver às vezes não avisa depois de rolagem por código)
    const r = el.getBoundingClientRect();
    if (r.bottom < -120 || r.top > window.innerHeight + 120) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (reduce) {
      // sem animação: só redesenha de vez em quando (ex.: quando as texturas chegam)
      if (clock.elapsedTime - last < 0.5) return;
      last = clock.elapsedTime;
      frame(1.2, 0);
      return;
    }
    frame(clock.elapsedTime, dt);
  };
  tick();
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
