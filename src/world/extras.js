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
  // 호수 위에 은은하게 걸린 무지개 — 밤에는 사라진다
  const colors = [0xe57373, 0xf2a45c, 0xf7d774, 0x8fd05a, 0x6db3e8, 0x9b8ce0];
  const rainbow = new THREE.Group();
  const mats = [];
  colors.forEach((color, i) => {
    const geo = new THREE.TorusGeometry(40 - i * 1.5, 0.85, 6, 48, Math.PI);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
    });
    mats.push(mat);
    rainbow.add(new THREE.Mesh(geo, mat));
  });
  rainbow.position.set(WORLD.lakeCenter.x, 0, WORLD.lakeCenter.y);
  rainbow.rotation.y = 0.5;
  group.add(rainbow);
  return (day) => { for (const m of mats) m.opacity = 0.22 * day; };
}

// 밤의 등대 — 빙글빙글 도는 빛줄기 (포뇨)
function createLighthouseBeam(group) {
  const { x, y: z } = WORLD.lighthouse;
  const y = heightAt(x, z) - 0.3 + 13.9;
  const beams = new THREE.Group();
  beams.position.set(x, y, z);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff2c2, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  for (const dir of [1, -1]) {
    const geo = new THREE.ConeGeometry(5, 55, 8, 1, true);
    const beam = new THREE.Mesh(geo, mat);
    beam.rotation.z = dir * Math.PI / 2; // 옆으로 눕혀 수평 빔
    beam.position.x = dir * 27.5;
    beams.add(beam);
  }
  group.add(beams);
  return {
    rotate: (dt) => { beams.rotation.y += dt * 0.5; },
    setNight: (v) => { mat.opacity = v * 0.14; },
  };
}

// 대왕나무 아래 사는 회색 숲의 정령 — 가만히 숨쉬고 있다
function createForestSpirit(group) {
  const { x, y: z } = WORLD.bigTree;
  const sx = x + 13, sz = z + 8;
  const y = heightAt(sx, sz);
  const spirit = new THREE.Group();
  spirit.position.set(sx, y, sz);
  spirit.lookAt(sx + 1, y, sz + 1.4);
  const grey = toon(0x8a8f98);
  const body = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), grey);
  body.position.y = 2.1;
  body.scale.set(1, 1.18, 0.95);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.75, 12, 10), toon(0xe3e4de));
  belly.position.set(0, 1.75, 1.0);
  belly.scale.set(0.95, 1.05, 0.55);
  spirit.add(body, belly);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.5, 6), grey);
    ear.position.set(s * 1.05, 4.9, -0.2);
    ear.rotation.z = -s * 0.18;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(0xffffff));
    eye.position.set(s * 0.75, 4.0, 1.75);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), toon(0x1c1c22));
    pupil.position.set(s * 0.75, 4.0, 1.95);
    const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 3), grey);
    whisker.position.set(s * 1.5, 3.4, 1.4);
    whisker.rotation.z = Math.PI / 2 + s * 0.15;
    spirit.add(ear, eye, pupil, whisker);
  }
  spirit.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  group.add(spirit);
  return (t) => {
    const breath = 1 + Math.sin(t * 1.3) * 0.02;
    body.scale.set(breath, 1.18 * (2 - breath), 0.95 * breath);
  };
}

export function createExtras() {
  const group = new THREE.Group();
  const beam = createLighthouseBeam(group);
  const setRainbow = createRainbow(group);
  const breathe = createForestSpirit(group);
  const updaters = [
    createWindmill(group),
    createBalloon(group),
    createFlock(group, WORLD.bigTree, 42, 52, 7, 0.28, 111),
    createFlock(group, WORLD.lakeCenter, 55, 34, 5, -0.22, 222),
    (dt, t) => { beam.rotate(dt); breathe(t); },
  ];
  return {
    group,
    update(dt, t) { for (const u of updaters) u(dt, t); },
    setNight(v) { beam.setNight(v); setRainbow(1 - v); },
  };
}
