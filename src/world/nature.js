// 나무(브로콜리 실루엣, 인스턴싱)·대왕 녹나무·풀꽃 + 바람 셰이더
import * as THREE from 'three';
import { C, toon } from '../palette.js';
import { MeshBuilder } from '../merge.js';
import { mulberry32 } from '../noise.js';
import { WORLD, heightAt, distToPath } from './terrain.js';

// 버텍스 셰이더에 바람 주입 — 지브리는 "멈춰있는 자연"이 없다
function windify(mat, strength, speed) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float windPhase = instanceMatrix[3][0] * 0.5 + instanceMatrix[3][2] * 0.7;
      #else
        float windPhase = 0.0;
      #endif
        transformed.x += sin(uTime * ${speed.toFixed(2)} + windPhase)
                       * ${strength.toFixed(3)} * smoothstep(-0.5, 1.0, position.y);`
    );
    mat.userData.shader = shader;
  };
  return mat;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

function fillInstances(mesh, items) {
  items.forEach((it, i) => {
    _p.set(it.x, it.y, it.z);
    _e.set(0, it.ry || 0, 0);
    _q.setFromEuler(_e);
    _s.setScalar(it.s || 1);
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
    if (it.color) mesh.setColorAt(i, it.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function treeSpotOk(x, z) {
  const h = heightAt(x, z);
  if (h < 1.8 || h > 24) return false;                                  // 물가·너무 높은 곳 제외
  if (Math.hypot(x - WORLD.townCenter.x, z - WORLD.townCenter.y) < 52) return false;
  if (Math.hypot(x - WORLD.fieldCenter.x, z - WORLD.fieldCenter.y) < 45) return false;
  if (Math.hypot(x - WORLD.bigTree.x, z - WORLD.bigTree.y) < 28) return false;
  if (Math.hypot(x - WORLD.meadow.x, z - WORLD.meadow.y) < 48) return false;   // 꽃밭
  if (Math.hypot(x - WORLD.cherry.x, z - WORLD.cherry.y) < 42) return false;   // 벚꽃 숲
  if (Math.hypot(x - WORLD.autumn.x, z - WORLD.autumn.y) < 52) return false;   // 단풍 숲
  if (Math.hypot(x - WORLD.windmill.x, z - WORLD.windmill.y) < 14) return false;
  if (distToPath(x, z) < 7) return false;
  return true;
}

// 색이 다른 잎을 가진 특별한 숲 (벚꽃·단풍) — 인스턴스 컬러로 변주
function makeGrove(group, rand, center, count, spread, shades, leafScale) {
  const trunks = [], blobs = [];
  let guard = 0;
  while (trunks.length < count && guard++ < count * 12) {
    const a = rand() * Math.PI * 2;
    const r = 4 + Math.sqrt(rand()) * spread;
    const x = center.x + Math.cos(a) * r, z = center.y + Math.sin(a) * r;
    const h = heightAt(x, z);
    if (h < 1.6 || distToPath(x, z) < 6) continue;
    const s = 0.75 + rand() * 0.7;
    trunks.push({ x, y: h - 0.4 + 2 * s, z, s });
    const nBlob = 2 + Math.floor(rand() * 3);
    for (let bi = 0; bi < nBlob; bi++) {
      blobs.push({
        x: x + (rand() - 0.5) * 2.2 * s,
        y: h - 0.4 + (3.8 + rand() * 1.7) * s,
        z: z + (rand() - 0.5) * 2.2 * s,
        s: (1.5 + rand() * 1.2) * s * leafScale,
        ry: rand() * Math.PI,
        color: shades[Math.floor(rand() * shades.length)],
      });
    }
  }
  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.3, 0.46, 4, 6), toon(C.trunk), trunks.length);
  fillInstances(trunkMesh, trunks);
  trunkMesh.castShadow = true;
  group.add(trunkMesh);
  const mat = windify(toon(0xffffff), 0.13, 1.5);
  const blobMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 1), mat, blobs.length);
  fillInstances(blobMesh, blobs);
  blobMesh.castShadow = true;
  group.add(blobMesh);
  return mat;
}

export function createNature() {
  const rand = mulberry32(37281);
  const group = new THREE.Group();

  // --- 나무 배치 계산 ---
  const trunks = [];
  const blobsByColor = [[], [], []];
  const hiBlobs = []; // 캐노피 위쪽의 밝은 하이라이트 — 투톤 수채화 나무
  const leafColors = [C.leaf1, C.leaf2, C.leaf3];
  let guard = 0;
  while (trunks.length < 340 && guard++ < 4000) {
    const x = (rand() * 2 - 1) * 390, z = (rand() * 2 - 1) * 390;
    if (!treeSpotOk(x, z)) continue;
    // 숲 느낌: 노이즈 높은 곳에 몰리게 절반은 확률 탈락
    if (rand() < 0.35) continue;
    const y = heightAt(x, z) - 0.4;
    const s = 0.8 + rand() * 0.9;
    const tall = rand() < 0.18; // 실루엣 변주: 길쭉한 나무
    trunks.push({ x, y: y + 2 * s, z, s });
    let topY = 0;
    if (tall) {
      // 세로로 쌓인 좁은 캐노피 (사이프러스처럼)
      for (let bi = 0; bi < 3; bi++) {
        const ci = Math.floor(rand() * 3);
        const by = y + (3.6 + bi * 1.7) * s;
        blobsByColor[ci].push({
          x: x + (rand() - 0.5) * 0.8 * s, y: by, z: z + (rand() - 0.5) * 0.8 * s,
          s: (1.5 - bi * 0.28) * s, ry: rand() * Math.PI,
        });
        topY = Math.max(topY, by);
      }
    } else {
      const nBlob = 2 + Math.floor(rand() * 3);
      for (let bi = 0; bi < nBlob; bi++) {
        const ci = Math.floor(rand() * 3);
        const by = y + (4 + rand() * 1.8) * s;
        blobsByColor[ci].push({
          x: x + (rand() - 0.5) * 2.4 * s, y: by, z: z + (rand() - 0.5) * 2.4 * s,
          s: (1.6 + rand() * 1.3) * s, ry: rand() * Math.PI,
        });
        topY = Math.max(topY, by);
      }
    }
    // 해가 닿는 꼭대기의 밝은 잎 — 나무마다 하나
    hiBlobs.push({
      x: x + (rand() - 0.5) * 0.9 * s,
      y: topY + 0.9 * s,
      z: z + (rand() - 0.5) * 0.9 * s,
      s: (tall ? 0.95 : 1.35) * s,
      ry: rand() * Math.PI,
    });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 4, 6);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, toon(C.trunk), trunks.length);
  fillInstances(trunkMesh, trunks);
  trunkMesh.castShadow = true;
  group.add(trunkMesh);

  const blobGeo = new THREE.IcosahedronGeometry(1.15, 1);
  const leafMats = [];
  blobsByColor.forEach((blobs, ci) => {
    if (!blobs.length) return;
    const mat = windify(toon(leafColors[ci]), 0.13, 1.4 + ci * 0.3);
    leafMats.push(mat);
    const mesh = new THREE.InstancedMesh(blobGeo, mat, blobs.length);
    fillInstances(mesh, blobs);
    mesh.castShadow = true;
    group.add(mesh);
  });
  // 하이라이트 캡 — 연둣빛으로 반짝이는 나무 꼭대기
  {
    const mat = windify(toon(0x8ed468), 0.13, 1.55);
    leafMats.push(mat);
    const mesh = new THREE.InstancedMesh(blobGeo, mat, hiBlobs.length);
    fillInstances(mesh, hiBlobs);
    mesh.castShadow = true;
    group.add(mesh);
  }

  // --- 대왕 녹나무 (토토로의 나무) ---
  {
    const b = new MeshBuilder();
    const { x, y: z } = WORLD.bigTree;
    const y = heightAt(x, z) - 0.5;
    b.add(new THREE.CylinderGeometry(4.2, 7.5, 36, 10), C.trunk, { x, y: y + 18, z });
    b.add(new THREE.CylinderGeometry(1.6, 2.6, 18, 7), C.trunk, { x: x + 7, y: y + 28, z: z + 3, rz: -0.5 });
    b.add(new THREE.CylinderGeometry(1.3, 2.2, 16, 7), C.trunk, { x: x - 6, y: y + 26, z: z - 3, rz: 0.55, rx: 0.2 });
    const bigRand = mulberry32(777);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const rr = 6 + bigRand() * 11;
      b.add(new THREE.IcosahedronGeometry(1, 1), leafColors[i % 3], {
        x: x + Math.cos(a) * rr,
        y: y + 38 + (bigRand() - 0.35) * 9,
        z: z + Math.sin(a) * rr * 0.9,
        s: 10 + bigRand() * 6,
        ry: bigRand() * 3,
      });
    }
    b.add(new THREE.IcosahedronGeometry(1, 1), C.leaf2, { x, y: y + 46, z, s: 13 });
    group.add(b.build());
  }

  // --- 벚꽃 숲 (호숫가) & 단풍 숲 ---
  const cherryMat = makeGrove(group, rand, WORLD.cherry, 22, 34,
    [new THREE.Color(0xf7b7c8), new THREE.Color(0xf29db8), new THREE.Color(0xfad2dd)], 1.05);
  const autumnMat = makeGrove(group, rand, WORLD.autumn, 34, 46,
    [new THREE.Color(0xe8a33d), new THREE.Color(0xd97f4e), new THREE.Color(0xc9662f)], 1.0);

  // --- 풀 ---
  const grassItems = [];
  const grassShades = [new THREE.Color(0x7ec84e), new THREE.Color(0x93d95f), new THREE.Color(0x5fae3c)];
  guard = 0;
  while (grassItems.length < 2600 && guard++ < 12000) {
    const x = (rand() * 2 - 1) * 300, z = (rand() * 2 - 1) * 300;
    const h = heightAt(x, z);
    if (h < 1.5 || h > 22) continue;
    grassItems.push({
      x, y: h, z,
      ry: rand() * Math.PI,
      s: 0.7 + rand() * 0.8,
      color: grassShades[Math.floor(rand() * 3)],
    });
  }
  const grassGeo = new THREE.PlaneGeometry(0.4, 1.1);
  grassGeo.translate(0, 0.55, 0);
  const grassMat = windify(toon(0xffffff, { side: THREE.DoubleSide }), 0.28, 2.2);
  const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassItems.length);
  fillInstances(grassMesh, grassItems);
  group.add(grassMesh);

  // --- 들꽃 (작은 색점) ---
  const flowerItems = [];
  const flowerShades = [
    new THREE.Color(0xfff6e8), new THREE.Color(0xf9d34c), new THREE.Color(0xf2a3b3),
    new THREE.Color(0xe89bd8), new THREE.Color(0x9fb7f0),
  ];
  guard = 0;
  while (flowerItems.length < 380 && guard++ < 4000) {
    const x = (rand() * 2 - 1) * 260, z = (rand() * 2 - 1) * 260;
    const h = heightAt(x, z);
    if (h < 1.5 || h > 18) continue;
    if (distToPath(x, z) > 26 && rand() < 0.6) continue; // 길가에 더 많이
    flowerItems.push({ x, y: h + 0.42, z, s: 0.6 + rand() * 0.7, color: flowerShades[Math.floor(rand() * flowerShades.length)] });
  }
  // 꽃밭 언덕: 알록달록한 꽃을 빽빽하게
  guard = 0;
  let meadowCount = 0;
  while (meadowCount < 1300 && guard++ < 6000) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 48;
    const x = WORLD.meadow.x + Math.cos(a) * r, z = WORLD.meadow.y + Math.sin(a) * r;
    const h = heightAt(x, z);
    if (h < 1.5) continue;
    flowerItems.push({ x, y: h + 0.42, z, s: 0.7 + rand() * 0.9, color: flowerShades[Math.floor(rand() * flowerShades.length)] });
    meadowCount++;
  }
  const flowerMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.16, 0), toon(0xffffff), flowerItems.length);
  fillInstances(flowerMesh, flowerItems);
  group.add(flowerMesh);

  const windMats = [...leafMats, grassMat, cherryMat, autumnMat];
  return {
    group,
    update(t) {
      for (const m of windMats) {
        if (m.userData.shader) m.userData.shader.uniforms.uTime.value = t;
      }
    },
  };
}
