// 하늘과 언덕의 살아있는 소품들 — 풍차, 열기구, 새떼, 호수 위 무지개
import * as THREE from 'three';
import { C, toon } from '../palette.js';
import { MeshBuilder } from '../merge.js';
import { WORLD, heightAt } from './terrain.js';
import { mulberry32 } from '../noise.js';

function createWindmill(group) {
  const { x, y: z } = WORLD.windmill;
  const y = heightAt(x, z) - 0.3;
  const b = new MeshBuilder();
  b.add(new THREE.CylinderGeometry(2.4, 3.4, 14, 10), 0xf2e8d5, { x, y: y + 7, z });
  b.add(new THREE.ConeGeometry(3.0, 3.2, 10), C.roof1, { x, y: y + 15.5, z });
  b.add(new THREE.BoxGeometry(1.3, 2.0, 0.24), C.trunk, { x, y: y + 1.2, z: z + 3.15 });
  b.add(new THREE.BoxGeometry(1.1, 1.1, 0.2), C.windowDark, { x, y: y + 9, z: z + 2.9 });
  group.add(b.build());

  // 날개 4장 — 천천히 돈다
  const blades = new THREE.Group();
  blades.position.set(x, y + 13.2, z + 3.4);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), toon(C.trunk));
  blades.add(hub);
  const bladeMat = toon(0xe8ddc4);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.2, 0.14), bladeMat);
    blade.position.y = 4.2;
    blade.castShadow = true;
    arm.add(blade);
    blades.add(arm);
  }
  group.add(blades);
  return (dt) => { blades.rotation.z += dt * 0.55; };
}

function createBalloon(group) {
  const balloon = new THREE.Group();
  const envelope = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), toon(C.roof1));
  envelope.scale.set(1, 1.15, 1);
  balloon.add(envelope);
  const stripe = new THREE.Mesh(new THREE.SphereGeometry(4.06, 12, 4, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.24), toon(0xf7f0e0));
  stripe.scale.copy(envelope.scale);
  balloon.add(stripe);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5), toon(0x9c6b3f));
  basket.position.y = -6.4;
  balloon.add(basket);
  const ropeMat = toon(0x6b5a48);
  for (const [ox, oz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 4), ropeMat);
    rope.position.set(ox, -4.9, oz);
    balloon.add(rope);
  }
  balloon.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  group.add(balloon);
  return (dt, t) => {
    const a = t * 0.022 + 1.2;
    balloon.position.set(Math.cos(a) * 170, 74 + Math.sin(t * 0.4) * 3, Math.sin(a) * 170);
    balloon.rotation.y = -a;
  };
}

function createFlock(group, center, radius, alt, count, speed, seed) {
  const rand = mulberry32(seed);
  const flock = new THREE.Group();
  const mat = toon(0x3a3f52, { side: THREE.DoubleSide });
  const wingGeo = new THREE.PlaneGeometry(0.85, 0.32);
  wingGeo.translate(0.42, 0, 0); // 날개 뿌리를 피벗으로
  const birds = [];
  for (let i = 0; i < count; i++) {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), mat);
    body.scale.set(1, 0.8, 1.8);
    const wingL = new THREE.Mesh(wingGeo, mat);
    const wingR = new THREE.Mesh(wingGeo, mat);
    wingL.rotation.x = -Math.PI / 2;
    wingR.rotation.x = -Math.PI / 2;
    wingR.rotation.y = Math.PI;
    bird.add(body, wingL, wingR);
    bird.userData = {
      phase: i * 0.55 + rand() * 0.3,
      wob: rand() * Math.PI * 2,
      wingL, wingR,
      r: radius * (0.85 + rand() * 0.3),
    };
    birds.push(bird);
    flock.add(bird);
  }
  group.add(flock);
  const look = new THREE.Vector3();
  return (dt, t) => {
    for (const bird of birds) {
      const u = bird.userData;
      const a = t * speed + u.phase;
      bird.position.set(
        center.x + Math.cos(a) * u.r,
        alt + Math.sin(t * 1.1 + u.wob) * 2,
        center.y + Math.sin(a) * u.r
      );
      look.set(
        center.x + Math.cos(a + 0.12) * u.r,
        bird.position.y,
        center.y + Math.sin(a + 0.12) * u.r
      );
      bird.lookAt(look);
      const flap = Math.sin(t * 8 + u.wob) * 0.65;
      u.wingL.rotation.z = flap;
      u.wingR.rotation.z = -flap;
    }
  };
}

function createRainbow(group) {
  // 호수 위에 은은하게 걸린 무지개
  const colors = [0xe57373, 0xf2a45c, 0xf7d774, 0x8fd05a, 0x6db3e8, 0x9b8ce0];
  const rainbow = new THREE.Group();
  colors.forEach((color, i) => {
    const geo = new THREE.TorusGeometry(40 - i * 1.5, 0.85, 6, 48, Math.PI);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
    });
    rainbow.add(new THREE.Mesh(geo, mat));
  });
  rainbow.position.set(WORLD.lakeCenter.x, 0, WORLD.lakeCenter.y);
  rainbow.rotation.y = 0.5;
  group.add(rainbow);
}

export function createExtras() {
  const group = new THREE.Group();
  const updaters = [
    createWindmill(group),
    createBalloon(group),
    createFlock(group, WORLD.bigTree, 42, 52, 7, 0.28, 111),
    createFlock(group, WORLD.lakeCenter, 55, 34, 5, -0.22, 222),
  ];
  createRainbow(group);
  return {
    group,
    update(dt, t) { for (const u of updaters) u(dt, t); },
  };
}
