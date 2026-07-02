// 언덕 위 마을(키키) + 논밭 시골(토토로) + 등대(포뇨)
// 집·시계탑·전봇대는 전부 하나의 병합 메시 — 드로우콜 몇 개로 처리
import * as THREE from 'three';
import { C, toon } from '../palette.js';
import { MeshBuilder, prismGeometry } from '../merge.js';
import { mulberry32 } from '../noise.js';
import { WORLD, heightAt, distToPath } from './terrain.js';

const WALLS = [C.wall1, C.wall2, C.wall3];
const ROOFS = [C.roof1, C.roof2, C.roof3];

function addHouse(b, rand, x, z) {
  const y = heightAt(x, z) - 0.3;
  const w = 5 + rand() * 3, d = 5 + rand() * 3, h = 3.5 + rand() * 2.5;
  const ry = Math.floor(rand() * 4) * Math.PI * 0.5 + (rand() - 0.5) * 0.4;
  const wall = WALLS[Math.floor(rand() * 3)];
  const roof = ROOFS[Math.floor(rand() * 3)];
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const local = (lx, ly, lz) => ({ x: x + lx * cos + lz * sin, y: y + ly, z: z - lx * sin + lz * cos, ry });

  b.add(new THREE.BoxGeometry(w, h, d), wall, local(0, h / 2, 0));
  b.add(prismGeometry(w + 1.2, 2 + rand() * 1.2, d + 1.2), roof, local(0, h, 0));
  // 굴뚝 (절반 확률)
  if (rand() < 0.5) b.add(new THREE.BoxGeometry(0.9, 2.2, 0.9), C.wall3, local(w * 0.25, h + 1.4, 0));
  // 정면 창문 2개 + 문 (창문 일부는 불 켜진 노란빛)
  const zf = d / 2 + 0.08;
  for (const wx of [-w * 0.28, w * 0.28]) {
    const lit = rand() < 0.35 ? C.windowLit : C.windowDark;
    b.add(new THREE.BoxGeometry(1.0, 1.2, 0.16), lit, local(wx, h * 0.6, zf));
  }
  b.add(new THREE.BoxGeometry(1.3, 2.1, 0.16), C.trunk, local(0, 1.05, zf));
  return { x, z, r: Math.max(w, d) };
}

function addClockTower(b) {
  const { x, y: z } = WORLD.townCenter;
  const y = heightAt(x, z) - 0.3;
  b.add(new THREE.BoxGeometry(6, 20, 6), C.wall2, { x, y: y + 10, z });
  b.add(new THREE.BoxGeometry(7, 1, 7), C.wall3, { x, y: y + 20.4, z });
  b.add(new THREE.ConeGeometry(5, 5.5, 4), C.roof1, { x, y: y + 23.6, z, ry: Math.PI / 4 });
  // 시계판 (앞뒤)
  for (const dz of [3.06, -3.06]) {
    b.add(new THREE.CircleGeometry(2.1, 24), 0xfdf8ec, { x, y: y + 16, z: z + dz, ry: dz > 0 ? 0 : Math.PI });
    const fz = dz > 0 ? 3.12 : -3.12;
    b.add(new THREE.BoxGeometry(0.22, 1.5, 0.06), C.windowDark, { x, y: y + 16.6, z: z + fz });
    b.add(new THREE.BoxGeometry(1.1, 0.22, 0.06), C.windowDark, { x: x + 0.5, y: y + 16, z: z + fz });
  }
}

function addLighthouse(b) {
  const { x, y: z } = WORLD.lighthouse;
  const y = heightAt(x, z) - 0.3;
  for (let i = 0; i < 4; i++) {
    b.add(new THREE.CylinderGeometry(2.4 - i * 0.15, 2.5 - i * 0.15, 3.2, 12),
      i % 2 === 0 ? 0xf7f0e0 : C.roof1, { x, y: y + 1.6 + i * 3.2, z });
  }
  b.add(new THREE.CylinderGeometry(1.7, 1.7, 2.2, 10), C.windowLit, { x, y: y + 13.9, z });
  b.add(new THREE.ConeGeometry(2.2, 2.2, 10), C.roof1, { x, y: y + 16.1, z });
}

function addFields(b, rand) {
  const { x: fx, y: fz } = WORLD.fieldCenter;
  const greens = [0xa8d867, 0x93cc55, 0x86c24b];
  for (let i = -2; i <= 2; i++) {
    for (let j = -1; j <= 2; j++) {
      if (rand() < 0.15) continue;
      const x = fx + i * 14 + (rand() - 0.5) * 2;
      const z = fz + j * 10 + (rand() - 0.5) * 2;
      b.add(new THREE.BoxGeometry(12, 0.3, 8), greens[Math.floor(rand() * 3)],
        { x, y: heightAt(x, z) + 0.25, z, ry: (rand() - 0.5) * 0.1 });
    }
  }
  // 원두막
  const hx = fx - 34, hz = fz - 8, hy = heightAt(hx, hz);
  b.add(new THREE.BoxGeometry(4, 0.4, 4), C.trunk, { x: hx, y: hy + 1.6, z: hz });
  for (const [ox, oz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]])
    b.add(new THREE.CylinderGeometry(0.15, 0.15, 1.8, 6), C.trunk, { x: hx + ox, y: hy + 0.9, z: hz + oz });
  b.add(new THREE.ConeGeometry(3.6, 1.8, 4), C.straw, { x: hx, y: hy + 2.8, z: hz, ry: Math.PI / 4 });
  // 버스 정류장 표지판 (토토로)
  const bx = 30, bz = 42, by = heightAt(bx, bz);
  b.add(new THREE.CylinderGeometry(0.09, 0.09, 3, 6), C.pole, { x: bx, y: by + 1.5, z: bz });
  b.add(new THREE.CircleGeometry(0.7, 16), 0xf2b134, { x: bx, y: by + 3.1, z: bz, ry: Math.PI / 6 });
}

function addPowerLines(b) {
  // 마을 → 갈림길 → 논밭 길가를 따라 전봇대 + 처진 전깃줄
  const chain = [WORLD.townCenter, new THREE.Vector2(-40, -40), new THREE.Vector2(10, 10), WORLD.fieldCenter];
  const tops = [];
  const STEP = 24;
  let leftover = 12;
  for (let s = 0; s < chain.length - 1; s++) {
    const a = chain[s], c = chain[s + 1];
    const segLen = a.distanceTo(c);
    const dir = c.clone().sub(a).normalize();
    const perp = new THREE.Vector2(-dir.y, dir.x); // 길옆으로 4m 비켜서
    for (let d = leftover; d < segLen; d += STEP) {
      const p = a.clone().addScaledVector(dir, d).addScaledVector(perp, 4.5);
      const y = heightAt(p.x, p.y);
      b.add(new THREE.CylinderGeometry(0.16, 0.2, 7.5, 6), C.pole, { x: p.x, y: y + 3.75, z: p.y });
      b.add(new THREE.BoxGeometry(2.4, 0.18, 0.18), C.pole,
        { x: p.x, y: y + 6.8, z: p.y, ry: Math.atan2(dir.y, dir.x) + Math.PI / 2 });
      const armDir = new THREE.Vector3(perp.x, 0, perp.y);
      tops.push([
        new THREE.Vector3(p.x, y + 6.9, p.y).addScaledVector(armDir, 1.0),
        new THREE.Vector3(p.x, y + 6.9, p.y).addScaledVector(armDir, -1.0),
      ]);
    }
    leftover = 0;
  }
  // 전깃줄: 이웃 전봇대끼리 자연스럽게 처지는 커브
  for (let i = 0; i < tops.length - 1; i++) {
    for (let w = 0; w < 2; w++) {
      const p0 = tops[i][w], p1 = tops[i + 1][w];
      if (p0.distanceTo(p1) > STEP * 1.8) continue; // 체인 경계는 건너뜀
      const mid = p0.clone().lerp(p1, 0.5); mid.y -= 1.3;
      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
      b.add(new THREE.TubeGeometry(curve, 10, 0.045, 4), C.wire);
    }
  }
}

export function createTown() {
  const rand = mulberry32(890712);
  const group = new THREE.Group();
  const b = new MeshBuilder();

  // 마을 집들 — 시계탑 주변, 길은 피해서
  const houses = [];
  const tc = WORLD.townCenter;
  let guard = 0;
  while (houses.length < 18 && guard++ < 300) {
    const a = rand() * Math.PI * 2;
    const r = 13 + rand() * 36;
    const x = tc.x + Math.cos(a) * r, z = tc.y + Math.sin(a) * r * 0.85;
    if (distToPath(x, z) < 7) continue;
    if (Math.hypot(x - WORLD.bakery.x, z - WORLD.bakery.y) < 14) continue; // 빵집 자리
    if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < h.r + 8)) continue;
    houses.push(addHouse(b, rand, x, z));
  }
  addClockTower(b);
  addLighthouse(b);
  addFields(b, rand);
  addPowerLines(b);
  group.add(b.build());

  // 굴뚝 연기 — 느리게 피어오르는 뭉게 파티클 (빵집 굴뚝은 항상 연기)
  const smokes = [];
  const smokeSpots = houses.slice(0, 3).map((h) => new THREE.Vector3(h.x, heightAt(h.x, h.z) + 7, h.z));
  smokeSpots.push(new THREE.Vector3(WORLD.bakery.x, heightAt(WORLD.bakery.x, WORLD.bakery.y) + 8.9, WORLD.bakery.y));
  for (const spot of smokeSpots) {
    for (let i = 0; i < 5; i++) {
      const mat = toon(0xf4f2ec, { transparent: true, opacity: 0 });
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), mat);
      puff.userData = { spot, phase: i / 5 };
      smokes.push(puff);
      group.add(puff);
    }
  }

  // 밤 불빛 — 창문·시계탑·등대에 어리는 노란 빛망울
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffd98a, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glowGeo = new THREE.SphereGeometry(0.5, 6, 5);
  const glowSpots = [
    ...houses.slice(0, 10).map((h) => [h.x, heightAt(h.x, h.z) + 2.2, h.z]),
    [WORLD.townCenter.x, heightAt(WORLD.townCenter.x, WORLD.townCenter.y) + 16, WORLD.townCenter.y],
    [WORLD.lighthouse.x, heightAt(WORLD.lighthouse.x, WORLD.lighthouse.y) + 13.9, WORLD.lighthouse.y],
  ];
  for (const [gx, gy, gz] of glowSpots) {
    const g = new THREE.Mesh(glowGeo, glowMat);
    g.position.set(gx, gy, gz);
    group.add(g);
  }

  return {
    group,
    houses,
    setNightGlow(v) { glowMat.opacity = v * 0.85; },
    update(t) {
      for (const puff of smokes) {
        const k = (t * 0.09 + puff.userData.phase) % 1;
        const s = puff.userData.spot;
        puff.position.set(
          s.x + Math.sin(k * 9 + puff.userData.phase * 20) * 0.8 + k * 2.5,
          s.y + k * 9,
          s.z + Math.cos(k * 7) * 0.5
        );
        const grow = 0.7 + k * 2.4;
        puff.scale.setScalar(grow);
        puff.material.opacity = Math.sin(Math.min(k * 3, 1) * Math.PI * 0.5) * 0.55 * (1 - k);
      }
    },
  };
}
