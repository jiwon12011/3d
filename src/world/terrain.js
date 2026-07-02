// 언덕 지형(버텍스 컬러) + 바다/호수 + 흙길 — 월드 배치의 기준
import * as THREE from 'three';
import { C, toon } from '../palette.js';
import { fbm2, smoothstep, lerp } from '../noise.js';

export const WORLD = {
  size: 800,
  townCenter: new THREE.Vector2(-100, -80),   // 언덕 위 마을
  fieldCenter: new THREE.Vector2(60, 80),     // 논밭 시골
  lakeCenter: new THREE.Vector2(-60, 180),    // 작은 호수
  bigTree: new THREE.Vector2(120, -160),      // 대왕 녹나무 언덕
  lighthouse: new THREE.Vector2(200, 40),     // 바닷가 등대
  meadow: new THREE.Vector2(-140, 60),        // 꽃밭 언덕
  cherry: new THREE.Vector2(-120, 145),       // 호숫가 벚꽃 숲
  autumn: new THREE.Vector2(60, -230),        // 단풍 숲
  windmill: new THREE.Vector2(-170, -20),     // 풍차 언덕
  islands: [                                  // 앞바다의 작은 섬들
    new THREE.Vector2(330, -250),
    new THREE.Vector2(-360, 130),
    new THREE.Vector2(140, 330),
  ],
  waterLevel: 0,
};

// 흙길: 마을 → 갈림길 → 논밭 / 대왕나무
export const PATH_SEGMENTS = [
  [new THREE.Vector2(-100, -80), new THREE.Vector2(-40, -40)],
  [new THREE.Vector2(-40, -40), new THREE.Vector2(10, 10)],
  [new THREE.Vector2(10, 10), new THREE.Vector2(60, 80)],
  [new THREE.Vector2(10, 10), new THREE.Vector2(65, -70)],
  [new THREE.Vector2(65, -70), new THREE.Vector2(120, -160)],
];

function distToSegment(px, pz, a, b) {
  const abx = b.x - a.x, abz = b.y - a.y;
  const t = Math.min(1, Math.max(0,
    ((px - a.x) * abx + (pz - a.y) * abz) / (abx * abx + abz * abz)));
  const dx = px - (a.x + abx * t), dz = pz - (a.y + abz * t);
  return Math.hypot(dx, dz);
}

export function distToPath(x, z) {
  let d = Infinity;
  for (const [a, b] of PATH_SEGMENTS) d = Math.min(d, distToSegment(x, z, a, b));
  return d;
}

// 강: 호수에서 동쪽 바다로 흘러 나간다
export const RIVER_SEGMENTS = [
  [new THREE.Vector2(-60, 180), new THREE.Vector2(30, 205)],
  [new THREE.Vector2(30, 205), new THREE.Vector2(110, 220)],
  [new THREE.Vector2(110, 220), new THREE.Vector2(220, 235)],
];

export function distToRiver(x, z) {
  let d = Infinity;
  for (const [a, b] of RIVER_SEGMENTS) d = Math.min(d, distToSegment(x, z, a, b));
  return d;
}

// 월드 어디서든 지면 높이를 샘플링 (비행 고도 제한에도 재사용)
export function heightAt(x, z) {
  let h = fbm2(x * 0.008 + 3.7, z * 0.008 + 9.2, 3) * 30 - 6; // 완만한 언덕 -6..24
  const d2 = (c) => Math.hypot(x - c.x, z - c.y);
  h = lerp(h, 9, smoothstep(80, 38, d2(WORLD.townCenter)));    // 마을 고원
  h = lerp(h, 3, smoothstep(65, 32, d2(WORLD.fieldCenter)));   // 논밭 평지
  h = lerp(h, 14, smoothstep(60, 14, d2(WORLD.bigTree)));      // 대왕나무 언덕
  h = lerp(h, -5, smoothstep(45, 18, d2(WORLD.lakeCenter)));   // 호수 웅덩이
  h = lerp(h, -3.5, smoothstep(15, 4, distToRiver(x, z)));     // 강줄기 (완만한 둑)
  h = lerp(h, -8, smoothstep(175, 300, x));                    // 동쪽은 바다로
  // 사방이 바다인 섬 월드 — 지형 가장자리가 절대 보이지 않는다
  h = lerp(h, -9, smoothstep(330, 415, Math.hypot(x, z)));
  // 앞바다의 작은 섬들
  for (const isl of WORLD.islands) {
    h = lerp(h, 7, smoothstep(48, 12, Math.hypot(x - isl.x, z - isl.y)));
  }
  return h;
}

const _c = new THREE.Color();
const GRASS_DARK = new THREE.Color(C.grassDark);
const GRASS_MID = new THREE.Color(C.grass);
const GRASS_LIGHT = new THREE.Color(C.grassLight);
const GRASS_WARM = new THREE.Color(0xa9d55e); // 햇살에 바랜 연둣빛 패치
const SAND = new THREE.Color(C.sand);
const DIRT = new THREE.Color(C.dirt);

function groundColor(x, z, h, out) {
  // 두 스케일 노이즈 얼룩으로 잔디 톤 변주 — 단색 초록 금지
  const n = fbm2(x * 0.02 + 11, z * 0.02 + 5, 2);
  const n2 = fbm2(x * 0.06 + 40, z * 0.06 + 7, 2);
  if (n < 0.5) out.copy(GRASS_DARK).lerp(GRASS_MID, n * 2);
  else out.copy(GRASS_MID).lerp(GRASS_LIGHT, (n - 0.5) * 2);
  // 큰 스케일로 따뜻한 연두 패치를 얹는다 (지브리 초원의 양지 얼룩)
  out.lerp(GRASS_WARM, smoothstep(0.55, 0.75, n2) * 0.7);
  // 꽃밭 언덕은 한층 더 화사한 연둣빛
  out.lerp(GRASS_WARM, smoothstep(55, 22, Math.hypot(x - WORLD.meadow.x, z - WORLD.meadow.y)) * 0.5);
  // 물가는 모래빛 — 단, 강둑은 풀로 덮인다 (좁은 경사면의 모래는 톱니처럼 보임)
  out.lerp(SAND, smoothstep(2.0, 0.2, h) * 0.9 * smoothstep(8, 18, distToRiver(x, z)));
  // 흙길
  if (h > 0.8) out.lerp(DIRT, smoothstep(5.0, 2.2, distToPath(x, z)));
  return out;
}

export function createTerrain() {
  const group = new THREE.Group();

  // --- 언덕 ---
  const seg = 200;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    groundColor(x, z, h, _c);
    colors[i * 3] = _c.r; colors[i * 3 + 1] = _c.g; colors[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, toon(0xffffff, { vertexColors: true }));
  ground.receiveShadow = true;
  group.add(ground);

  // --- 물 (바다 + 호수 + 강을 한 장의 평면으로, 수평선 너머까지) ---
  const waterGeo = new THREE.PlaneGeometry(3200, 3200, 90, 90);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = toon(C.water, { transparent: true, opacity: 0.92 });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.y += sin(position.x * 0.05 + uTime * 0.9) * 0.35
                      + cos(position.z * 0.04 + uTime * 0.6) * 0.35;`
    );
    waterMat.userData.shader = shader;
  };
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = WORLD.waterLevel;
  group.add(water);

  return {
    group,
    update(t) {
      if (waterMat.userData.shader) waterMat.userData.shader.uniforms.uTime.value = t;
    },
  };
}
