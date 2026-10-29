import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { addBokeh, coinGeometry, createRenderer, glowTexture, goldMaterial, loadLogoMaps, logoFaceMaterial, runLoop, starTexture, studioEnvironment, trackPointer } from './three-kit';

/** Fita de cetim: laranja, faixa azul-marinho no meio e filetes brancos, com trama fina */
function ribbonTextures() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#F2701C';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#0E2457';
  g.fillRect(176, 0, 160, 256);
  g.fillStyle = '#FFFFFF';
  g.fillRect(160, 0, 14, 256);
  g.fillRect(338, 0, 14, 256);
  g.globalAlpha = 0.07;
  g.strokeStyle = '#000';
  for (let x = -256; x < 512; x += 6) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 256, 256);
    g.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;

  // some suavemente para cima (sem corte seco na borda da tela)
  const a = document.createElement('canvas');
  a.width = 4;
  a.height = 256;
  const ga = a.getContext('2d')!;
  const grad = ga.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#000');
  grad.addColorStop(0.45, '#000');
  grad.addColorStop(0.75, '#fff');
  grad.addColorStop(1, '#fff');
  ga.fillStyle = grad;
  ga.fillRect(0, 0, 4, 256);
  const alpha = new THREE.CanvasTexture(a);
  return { map, alpha };
}

/** Fita levemente curvada (bojo no meio) */
function ribbonGeometry() {
  const geo = new THREE.PlaneGeometry(0.5, 2.15, 1, 48);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 1.075) / 2.15;
    pos.setZ(i, Math.sin(t * Math.PI) * 0.09 + pos.getX(i) * 0.12 * (1 - t));
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Medalha 3D com a logo da academia (three.js).
 * Ouro polido com reflexos de estúdio, logo em relevo, fita de cetim e confetes.
 */
export default function Medal3D({ className }: { className?: string }) {
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

    const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 60);
    camera.position.set(0, 0.85, 7.7);
    camera.lookAt(0, 0.85, 0);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 4, 5);
    const back = new THREE.PointLight(0xff7a1a, 30, 12);
    back.position.set(0, 0.4, -2.6);
    scene.add(key, back);

    // ---------- medalha ----------
    const hang = new THREE.Group(); // balança a partir do topo
    hang.position.y = 3.4;
    scene.add(hang);
    const medal = new THREE.Group();
    medal.position.y = -3.4;
    hang.add(medal);

    const gold = goldMaterial(0.18);
    const coin = coinGeometry(1.2, 0.125);
    medal.add(new THREE.Mesh(coin.geo, gold));

    // a face só aparece com as texturas prontas (nada de disco escuro enquanto carrega)
    const maps = loadLogoMaps(renderer, () => {
      front.visible = rear.visible = true;
    });
    const face = logoFaceMaterial(maps);
    const faceGeo = new THREE.CircleGeometry(coin.face, 160);
    const front = new THREE.Mesh(faceGeo, face);
    front.position.z = coin.faceZ;
    const rear = new THREE.Mesh(faceGeo, face);
    rear.position.z = -coin.faceZ;
    rear.rotation.y = Math.PI;
    front.visible = rear.visible = false;
    medal.add(front, rear);

    const loopGeo = new THREE.TorusGeometry(0.16, 0.05, 24, 64);
    const loop = new THREE.Mesh(loopGeo, gold);
    loop.position.y = 1.33;
    medal.add(loop);

    const rib = ribbonTextures();
    const ribbonMat = new THREE.MeshPhysicalMaterial({
      map: rib.map,
      alphaMap: rib.alpha,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.48,
      sheen: 1,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color(0xffffff),
    });
    const ribbonGeo = ribbonGeometry();
    const left = new THREE.Mesh(ribbonGeo, ribbonMat);
    left.position.set(-0.27, 2.45 - 3.4, -0.03);
    left.rotation.z = 0.27;
    const right = new THREE.Mesh(ribbonGeo, ribbonMat);
    right.position.set(0.27, 2.45 - 3.4, -0.07);
    right.rotation.z = -0.27;
    right.scale.x = -1;
    hang.add(left, right);

    // brilhos em estrela que piscam no ouro
    const star = starTexture();
    const glints = [
      [0.86, 0.84, 0.16, 0],
      [-1.12, -0.3, 0.14, 2.1],
      [0.2, -1.16, 0.14, 4.2],
      [0.12, 1.4, 0.08, 1.2],
    ].map(([x, y, z, phase]) => {
      const m = new THREE.SpriteMaterial({ map: star, color: 0xfff1d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const s = new THREE.Sprite(m);
      s.position.set(x, y, z);
      medal.add(s);
      return { s, m, phase };
    });

    // ---------- confetes metálicos ----------
    const confGeo = new THREE.PlaneGeometry(0.13, 0.06);
    const confMats = [
      goldMaterial(0.25),
      new THREE.MeshPhysicalMaterial({ color: 0xf2701c, roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide }),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }),
    ];
    confMats[0].side = THREE.DoubleSide;
    const PER = 12;
    const dummy = new THREE.Object3D();
    const confetti = confMats.map((mat) => {
      const mesh = new THREE.InstancedMesh(confGeo, mat, PER);
      const items = Array.from({ length: PER }, () => {
        const x = (Math.random() - 0.5) * 4.6;
        return {
          p: new THREE.Vector3(x, -1.6 + Math.random() * 5, Math.abs(x) < 1.4 ? -1.6 - Math.random() * 1.2 : -1.2 + Math.random() * 2.2),
          r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
          spin: new THREE.Vector3(Math.random() * 2 + 0.5, Math.random() * 2 + 0.5, Math.random()),
          fall: 0.18 + Math.random() * 0.25,
          sway: Math.random() * 6,
        };
      });
      scene.add(mesh);
      return { mesh, items };
    });

    const glow = glowTexture();
    const bokeh = addBokeh(scene, glow, 16, [0xffb46b, 0xffffff, 0xff7a1a]);

    // ---------- movimento ----------
    const ptr = trackPointer(el);
    let px = 0;
    let py = 0;
    const stop = runLoop(el, renderer, camera, (t, dt) => {
      px += (ptr.target.x - px) * 0.05;
      py += (ptr.target.y - py) * 0.05;
      hang.rotation.z = Math.sin(t * 0.8) * 0.035 + px * 0.04;
      medal.rotation.y = Math.sin(t * 0.5) * 0.5 + px * 0.45;
      medal.rotation.x = py * 0.12;
      for (const g of glints) {
        const k = Math.pow(Math.max(0, Math.sin(t * 1.1 + g.phase)), 8);
        g.s.scale.setScalar(0.05 + k * 0.62);
        g.m.opacity = k;
        g.m.rotation = t * 0.6;
      }
      for (const c of confetti) {
        c.items.forEach((it, i) => {
          it.p.y -= it.fall * dt;
          if (it.p.y < -1.8) it.p.y = 3.6;
          it.r.x += it.spin.x * dt;
          it.r.y += it.spin.y * dt;
          dummy.position.set(it.p.x + Math.sin(t * 0.7 + it.sway) * 0.12, it.p.y, it.p.z);
          dummy.rotation.copy(it.r);
          dummy.updateMatrix();
          c.mesh.setMatrixAt(i, dummy.matrix);
        });
        c.mesh.instanceMatrix.needsUpdate = true;
      }
      bokeh.update(t);
      renderer.render(scene, camera);
    });

    return () => {
      stop();
      ptr.dispose();
      [coin.geo, faceGeo, loopGeo, ribbonGeo, confGeo].forEach((g) => g.dispose());
      [gold, face, ribbonMat, ...confMats, ...glints.map((g) => g.m)].forEach((m) => m.dispose());
      [maps.color, maps.bump, maps.orm, rib.map, rib.alpha, star, glow].forEach((t) => t.dispose());
      confetti.forEach((c) => c.mesh.dispose());
      bokeh.dispose();
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={host} className={className}>
      {failed && <img src="/fotos/medalha.png" alt="Medalha Easy Wrestling" className="h-full w-full object-contain" />}
    </div>
  );
}
