import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { addBokeh, coinGeometry, createRenderer, glowTexture, goldMaterial, loadLogoMaps, logoFaceMaterial, runLoop, starTexture, studioEnvironment, trackPointer } from './three-kit';

/** Núcleo que brilha dentro do vidro: claro no centro, laranja queimado nas bordas */
function coreTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, '#ffc48a');
  r.addColorStop(0.4, '#ff7a1a');
  r.addColorStop(0.8, '#c94800');
  r.addColorStop(1, '#6e2200');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Retângulo arredondado com UV 0..1 (núcleo no mesmo formato do vidro) */
function roundedRect(size: number, radius: number) {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h + radius, -h);
  s.lineTo(h - radius, -h);
  s.quadraticCurveTo(h, -h, h, -h + radius);
  s.lineTo(h, h - radius);
  s.quadraticCurveTo(h, h, h - radius, h);
  s.lineTo(-h + radius, h);
  s.quadraticCurveTo(-h, h, -h, h - radius);
  s.lineTo(-h, -h + radius);
  s.quadraticCurveTo(-h, -h, -h + radius, -h);
  const geo = new THREE.ShapeGeometry(s, 24);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / size + 0.5, pos.getY(i) / size + 0.5);
  return geo;
}

/** Brilho de borda (fresnel): acende as quinas como o neon da referência */
function rimMaterial(color: THREE.Color, power: number, intensity: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uPower: { value: power }, uIntensity: { value: intensity } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), uPower);
        gl_FragColor = vec4(uColor * f * uIntensity, f);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Bloco de vidro laranja com a logo da academia (three.js).
 * Refração real, núcleo brilhando, borda neon e moeda dourada com a logo em relevo.
 * Inclina seguindo o ponteiro e gira conforme a página rola.
 */
export default function LogoTile3D({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createRenderer(el);
    } catch {
      setFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    const env = studioEnvironment(renderer);
    scene.environment = env.texture;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 60);
    camera.position.set(0, 0, 7.8);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 4, 5);
    const inner = new THREE.PointLight(0xff7a1a, 18, 6);
    scene.add(key, inner);

    const tile = new THREE.Group();
    scene.add(tile);

    // vidro
    const glassGeo = new RoundedBoxGeometry(2.5, 2.5, 0.62, 10, 0.48);
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffe9d6,
      transmission: 1,
      thickness: 0.5,
      roughness: 0.3,
      ior: 1.25,
      attenuationColor: new THREE.Color(0xff9a3c),
      attenuationDistance: 1.8,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      specularIntensity: 1,
      iridescence: 0.12,
      iridescenceIOR: 1.3,
    });
    tile.add(new THREE.Mesh(glassGeo, glass));

    // núcleo luminoso dentro do vidro, no mesmo formato dele (sem bordas que risquem a refração)
    const coreTex = coreTexture();
    const coreGeo = roundedRect(2.42, 0.44);
    const coreMat = new THREE.MeshBasicMaterial({ map: coreTex, side: THREE.DoubleSide });
    tile.add(new THREE.Mesh(coreGeo, coreMat));

    // moeda dourada com a logo, na frente e atrás
    // a moeda fica fora da imagem refratada pelo vidro (senão aparece em arcos por dentro)
    const gold = goldMaterial(0.2);
    gold.transparent = true;
    const coin = coinGeometry(0.98, 0.085);
    const faces: THREE.Mesh[] = [];
    const maps = loadLogoMaps(renderer, () => faces.forEach((m) => (m.visible = true)));
    const face = logoFaceMaterial(maps);
    face.transparent = true;
    const faceGeo = new THREE.CircleGeometry(coin.face, 160);
    for (const side of [1, -1]) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(coin.geo, gold));
      const f = new THREE.Mesh(faceGeo, face);
      f.position.z = coin.faceZ;
      f.visible = false;
      faces.push(f);
      g.add(f);
      g.position.z = side * 0.4; // inteira para fora do vidro
      if (side < 0) g.rotation.y = Math.PI;
      tile.add(g);
    }

    // borda neon
    const rimGeo = new RoundedBoxGeometry(2.53, 2.53, 0.65, 10, 0.5);
    const rim = rimMaterial(new THREE.Color(1, 0.5, 0.15), 2.2, 2.2);
    tile.add(new THREE.Mesh(rimGeo, rim));

    // reflexo em estrela que passa pela quina
    const star = starTexture();
    const glintMat = new THREE.SpriteMaterial({ map: star, color: 0xffe6c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const glint = new THREE.Sprite(glintMat);
    glint.position.set(1.02, 1.02, 0.36);
    tile.add(glint);

    const glow = glowTexture();
    const bokeh = addBokeh(scene, glow, 18, [0xffa057, 0xffffff, 0x5b7cff]);

    const ptr = trackPointer(el);
    let px = 0;
    let py = 0;
    const stop = runLoop(el, renderer, camera, (t) => {
      px += (ptr.target.x - px) * 0.05;
      py += (ptr.target.y - py) * 0.05;
      // progresso da rolagem: 0 quando entra por baixo, 1 quando sai por cima
      const r = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      tile.rotation.y = 0.32 + Math.sin(t * 0.5) * 0.25 + px * 0.5 + (p - 0.5) * 1.2;
      tile.rotation.x = Math.sin(t * 0.7) * 0.07 + py * 0.3 - 0.16;
      tile.rotation.z = (0.5 - p) * 0.3;
      tile.position.y = Math.sin(t * 1.1) * 0.08;
      const k = Math.pow(Math.max(0, Math.sin(t * 0.9)), 10);
      glint.scale.setScalar(0.05 + k * 0.9);
      glintMat.opacity = k;
      glintMat.rotation = t * 0.5;
      bokeh.update(t);
      renderer.render(scene, camera);
    });

    return () => {
      stop();
      ptr.dispose();
      [glassGeo, coreGeo, coin.geo, faceGeo, rimGeo].forEach((g) => g.dispose());
      [glass, coreMat, gold, face, rim, glintMat].forEach((m) => m.dispose());
      [coreTex, maps.color, maps.bump, maps.orm, star, glow].forEach((tx) => tx.dispose());
      bokeh.dispose();
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={host} className={className}>
      {failed && <img src="/site/logo-hd.png" alt="Easy Wrestling" className="mx-auto mt-[18%] w-1/2 rounded-full" />}
    </div>
  );
}
