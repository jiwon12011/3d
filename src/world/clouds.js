// 뭉게구름 — 이 게임의 주인공. 구체 클러스터 + 툰 셰이딩으로
// "윗면 순백 / 밑면 푸른 회색" 음영이 저절로 생긴다. 통과 비행 가능.
import * as THREE from 'three';
import { C, toon } from '../palette.js';
import { mulberry32 } from '../noise.js';

const CLOUD_COUNT = 38;
const AREA = 900;   // 배치 반경 (월드보다 넓게 — 수평선 너머까지)
const WRAP = 950;

export function createClouds() {
  const rand = mulberry32(20260702);
  const clouds = []; // { x, y, z, speed, puffs: [{ox,oy,oz,s}], radius }
  let totalPuffs = 0;

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const puffCount = 6 + Math.floor(rand() * 9);
    const size = 10 + rand() * 22; // 구름 덩이 반경
    const puffs = [];
    for (let p = 0; p < puffCount; p++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * size * 0.8;
      puffs.push({
        ox: Math.cos(a) * r * 1.4,
        oy: (rand() - 0.3) * size * 0.35,
        oz: Math.sin(a) * r,
        s: size * (0.35 + rand() * 0.45),
      });
    }
    // 절반은 놀이 영역 안(±320)에 — 실제로 뚫고 지나갈 수 있게,
    // 나머지는 수평선 너머까지 넓게
    const spread = i % 2 === 0 ? 320 : AREA;
    clouds.push({
      x: (rand() * 2 - 1) * spread,
      y: 60 + rand() * 65,
      z: (rand() * 2 - 1) * spread,
      speed: 0.6 + rand() * 1.6,
      puffs,
      radius: size * 1.6,
    });
    totalPuffs += puffCount;
  }

  const geo = new THREE.SphereGeometry(1, 9, 7);
  // 안개 영향 제외 + 푸른빛 emissive로 누런 기 제거 — 윗면 순백/밑면 청회색
  const mat = toon(C.cloud, { fog: false });
  mat.emissive = new THREE.Color(0x8fa8c4);
  mat.emissiveIntensity = 0.32;
  const mesh = new THREE.InstancedMesh(geo, mat, totalPuffs);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const v = new THREE.Vector3();

  function writeMatrices() {
    let idx = 0;
    for (const c of clouds) {
      for (const p of c.puffs) {
        v.set(c.x + p.ox, c.y + p.oy, c.z + p.oz);
        s.set(p.s, p.s * 0.55, p.s); // 아래를 눌러 납작한 뭉게구름 실루엣
        m.compose(v, q, s);
        mesh.setMatrixAt(idx++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  writeMatrices();

  return {
    mesh,
    clouds,
    // 반환값: 플레이어가 구름 속에 있는지 (구름 통과 뿌옇게 연출용)
    update(dt, playerPos) {
      let inCloud = false;
      for (const c of clouds) {
        c.x += c.speed * dt;
        if (c.x > WRAP) c.x = -WRAP;
        if (playerPos) {
          const dx = playerPos.x - c.x, dy = (playerPos.y - c.y) * 2.2, dz = playerPos.z - c.z;
          if (dx * dx + dy * dy + dz * dz < c.radius * c.radius) inCloud = true;
        }
      }
      writeMatrices();
      return inCloud;
    },
  };
}
