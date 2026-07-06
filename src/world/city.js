// 수평선 너머의 도시 — 빌딩 협곡, 전차, 네온, 밤에도 별이 없는 곳.
// 마을에서는 안개 너머의 실루엣으로만 보이고, 선착장의 빛기둥으로 건너간다.
import * as THREE from 'three';
import { C, toon } from '../palette.js';
import { MeshBuilder, prismGeometry } from '../merge.js';
import { fbm2, smoothstep, lerp, mulberry32 } from '../noise.js';
import { heightAt } from './terrain.js';

// --- 배치 기준 (전부 월드 좌표) ---
const CX = 1150, CZ = -150;      // 도시 섬 중심
const CITY_R = 250;              // 섬 가장자리
const GROUND_Y = 2.3;            // 시가지 지면
const BLOCK = 42, ROAD_W = 3.5;  // 도로 격자

// 마을 쪽 선착장(등대 근처 해안)과 도시 쪽 선착장
const V_DOCK = { x: 232, z: 6 };
const C_DOCK = { x: 943, z: -115 };
const DIR = { x: 0.9858, z: -0.1675 };  // 마을 → 도시 방향

export const CITY = {
  center: new THREE.Vector2(CX, CZ),
  r: CITY_R,
  // 빛기둥(이동 게이트) 위치 — 부두 끝, 바다 위
  gateVillage: new THREE.Vector3(V_DOCK.x + DIR.x * 20, 1.2, V_DOCK.z + DIR.z * 20),
  gateCity: new THREE.Vector3(C_DOCK.x - DIR.x * 20, 1.2, C_DOCK.z - DIR.z * 20),
  // 도착 지점 (부두의 뭍 쪽 하늘)
  arriveVillage: new THREE.Vector3(V_DOCK.x - DIR.x * 14, 15, V_DOCK.z - DIR.z * 14),
  arriveCity: new THREE.Vector3(C_DOCK.x + DIR.x * 14, 17, C_DOCK.z + DIR.z * 14),
  board: new THREE.Vector2(CX, CZ + 36),      // 광장의 배달 게시판
  flower: new THREE.Vector2(CX - 70, CZ + 95), // 뒷골목, 고향 들꽃이 피는 자리
  // 배달 스팟 — 광장 골목의 가게들
  spots: [
    { key: 'tailor', name: '양복점 아저씨', x: CX + 52.5, z: CZ - 21 },
    { key: 'press', name: '신문사 기자', x: CX - 52.5, z: CZ + 21 },
    { key: 'clock', name: '시계방 할아버지', x: CX + 21, z: CZ + 94.5 },
    { key: 'hotel', name: '호텔 지배인', x: CX - 105, z: CZ - 52.5 },
    { key: 'florist', name: '꽃집 언니', x: CX + 94.5, z: CZ + 63 },
  ],
};

// 도시 섬의 지면 높이 — controls의 지면 충돌이 마을 heightAt과 max로 합쳐 쓴다
export function cityHeightAt(x, z) {
  const d = Math.hypot(x - CX, z - CZ);
  return lerp(-9, GROUND_Y, smoothstep(CITY_R, CITY_R - 42, d));
}

// 도로 중심선까지의 거리 (격자: 로컬 좌표 0, ±42, ±84 …)
function roadDist(v) {
  const m = ((v + 21) % BLOCK + BLOCK) % BLOCK - 21;
  return Math.abs(m);
}

const WALLS = [0xcac3b3, 0xb9bec6, 0xd8cdb8, 0xa9604e, 0x93a2b5, 0xbfae9c];
const NEON = [0xff6f91, 0x4dd2ff, 0xffd166, 0x7bffb2, 0xd79bff];

export function createCity() {
  const group = new THREE.Group();
  const rand = mulberry32(20260706);

  // --- 지면: 포장도로 격자 + 광장 + 뒷골목 풀 포켓 ---
  const seg = 84, span = 620;
  const geo = new THREE.PlaneGeometry(span, span, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const _c = new THREE.Color();
  const PAVE = new THREE.Color(0xb7b2a6), ROADC = new THREE.Color(0x7f7b74);
  const PLAZA = new THREE.Color(0xd6cfbd), SANDC = new THREE.Color(C.sand);
  const GRASSC = new THREE.Color(C.grass);
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), lz = pos.getZ(i);
    const wx = lx + CX, wz = lz + CZ;
    const h = cityHeightAt(wx, wz);
    pos.setY(i, h);
    const d = Math.hypot(lx, lz);
    _c.copy(PAVE).offsetHSL(0, 0, (fbm2(wx * 0.05, wz * 0.05, 2) - 0.5) * 0.05);
    if (d < 208 && (roadDist(lx) < ROAD_W || roadDist(lz) < ROAD_W)) _c.copy(ROADC);
    if (d < 32) _c.copy(PLAZA);
    _c.lerp(GRASSC, smoothstep(12, 5, Math.hypot(wx - CITY.flower.x, wz - CITY.flower.y)));
    _c.lerp(SANDC, smoothstep(1.6, 0.4, h) * 0.85);
    colors[i * 3] = _c.r; colors[i * 3 + 1] = _c.g; colors[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, toon(0xffffff, { vertexColors: true }));
  ground.position.set(CX, 0, CZ);
  ground.receiveShadow = true;
  group.add(ground);

  // --- 빌딩 (툰 병합) + 창문·네온·가로등 (글로우 병합) ---
  const b = new MeshBuilder();   // 불투명 구조물
  const g = new MeshBuilder();   // 밤에 빛나는 것들
  const at = (lx, y, lz, extra = {}) => ({ x: CX + lx, y, z: CZ + lz, ...extra });

  function windows(lx, lz, w, dep, h) {
    const floors = Math.min(9, Math.floor((h - 3) / 3.4));
    const cols = Math.min(3, Math.max(2, Math.floor(w / 4)));
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < cols; k++) {
        const off = (k - (cols - 1) / 2) * (w / cols);
        const y = 3 + f * 3.4;
        if (rand() > 0.34) g.add(new THREE.BoxGeometry(1.5, 1.05, 0.1), C.windowLit, at(lx + off, y, lz + dep / 2 + 0.06));
        if (rand() > 0.34) g.add(new THREE.BoxGeometry(1.5, 1.05, 0.1), C.windowLit, at(lx + off, y, lz - dep / 2 - 0.06));
        if (rand() > 0.5) g.add(new THREE.BoxGeometry(0.1, 1.05, 1.5), C.windowLit, at(lx + w / 2 + 0.06, y, lz + off));
        if (rand() > 0.5) g.add(new THREE.BoxGeometry(0.1, 1.05, 1.5), C.windowLit, at(lx - w / 2 - 0.06, y, lz + off));
      }
    }
  }

  function building(lx, lz, w, dep, h, wall) {
    b.add(new THREE.BoxGeometry(w, h, dep), wall, at(lx, GROUND_Y + h / 2, lz));
    b.add(new THREE.BoxGeometry(w + 0.7, 0.5, dep + 0.7), 0x8f8a7e, at(lx, GROUND_Y + h, lz)); // 옥상 테두리
    if (rand() < 0.45) b.add(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 8), 0x9a938a, at(lx + (rand() - 0.5) * w * 0.4, GROUND_Y + h + 1.1, lz)); // 물탱크
    if (rand() < 0.3) b.add(new THREE.BoxGeometry(2.2, 1.6, 2.2), wall, at(lx - w * 0.2, GROUND_Y + h + 0.8, lz + dep * 0.2)); // 옥탑방
    windows(lx, lz, w, dep, h);
  }

  // 특별 가게(배달 스팟) — 광장 골목의 낮은 상점 건물, 차양과 간판이 있다
  const SPECIALS = [
    { gx: 63, gz: -21, face: [-1, 0], sign: 0x3d5a80, awn: 0x3d5a80, h: 17 },   // 양복점
    { gx: -63, gz: 21, face: [1, 0], sign: 0x4a4238, awn: 0x6d6354, h: 15 },    // 신문사
    { gx: 21, gz: 105, face: [0, -1], sign: 0xb98a2f, awn: 0xc0574f, h: 19 },   // 시계방
    { gx: -105, gz: -63, face: [0, 1], sign: 0x6b2d3e, awn: 0x6b2d3e, h: 24 },  // 호텔
    { gx: 105, gz: 63, face: [-1, 0], sign: 0xf28ab0, awn: 0xf28ab0, h: 14 },   // 꽃집
  ];
  const skipCell = new Set(SPECIALS.map((s) => `${s.gx},${s.gz}`));

  for (const s of SPECIALS) {
    const w = 13, dep = 13;
    building(s.gx, s.gz, w, dep, s.h, WALLS[Math.floor(rand() * WALLS.length)]);
    const fx = s.gx + s.face[0] * (w / 2), fz = s.gz + s.face[1] * (dep / 2);
    const ry = Math.atan2(s.face[0], s.face[1]);
    // 문 + 차양 + 세로 간판
    b.add(new THREE.BoxGeometry(1.7, 2.6, 0.16), C.trunk, at(fx + s.face[0] * 0.1, GROUND_Y + 1.3, fz + s.face[1] * 0.1, { ry }));
    const awning = new THREE.BoxGeometry(0.8, 0.09, 1.6);
    awning.rotateX(0.45);
    for (let i = 0; i < 6; i++) {
      const o = (i - 2.5) * 0.8;
      b.add(awning, i % 2 === 0 ? s.awn : 0xf7f0e0,
        at(fx + s.face[0] * 0.9 + s.face[1] * o, GROUND_Y + 3.1, fz + s.face[1] * 0.9 + s.face[0] * o, { ry }));
    }
    g.add(new THREE.BoxGeometry(1.1, 4.6, 0.5), s.sign,
      at(fx + s.face[0] * 0.5 + s.face[1] * 4.6, GROUND_Y + 7.4, fz + s.face[1] * 0.5 + s.face[0] * 4.6, { ry }));
  }

  // 프로시저럴 블록 — 중심에 가까울수록 높이 솟는다
  let tallest = { h: 0, lx: 0, lz: 0 };
  for (let gx = -189; gx <= 189; gx += BLOCK) {
    for (let gz = -189; gz <= 189; gz += BLOCK) {
      const d = Math.hypot(gx, gz);
      if (d > 185 || d < 40) continue;
      if (skipCell.has(`${gx},${gz}`)) continue;
      if (Math.hypot(gx - (-70), gz - 95) < 22) continue; // 들꽃 골목은 비워둔다
      const dot = (gx * -DIR.x + gz * -DIR.z) / d;
      if (dot > 0.92 && d > 110) continue; // 선착장 방향 통로
      const n = 1 + (rand() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const lx = gx + (n === 1 ? 0 : (i === 0 ? -1 : 1) * 8.5) + (rand() - 0.5) * 3;
        const lz = gz + (rand() - 0.5) * 8;
        const w = 9 + rand() * (n === 1 ? 8 : 4);
        const dep = 9 + rand() * 7;
        const h = Math.max(9, (14 + rand() * 26) * (0.55 + 0.45 * smoothstep(185, 45, d)));
        building(lx, lz, w, dep, h, WALLS[Math.floor(rand() * WALLS.length)]);
        if (h > tallest.h) tallest = { h, lx, lz };
        // 광장 근처엔 네온 간판
        if (d < 110 && rand() < 0.5) {
          g.add(new THREE.BoxGeometry(1.0, 3.6 + rand() * 2.5, 0.45), NEON[Math.floor(rand() * NEON.length)],
            at(lx + w / 2 + 0.3, GROUND_Y + 6 + rand() * 5, lz + (rand() - 0.5) * dep * 0.6));
        }
      }
    }
  }
  // 가장 높은 빌딩 옥상의 네온 링
  g.add(new THREE.TorusGeometry(3.2, 0.35, 8, 24), NEON[0],
    at(tallest.lx, GROUND_Y + tallest.h + 4.4, tallest.lz, { rx: Math.PI / 2 }));
  b.add(new THREE.CylinderGeometry(0.2, 0.2, 4.4, 6), 0x6d6354, at(tallest.lx, GROUND_Y + tallest.h + 2.2, tallest.lz));

  // 광장: 시계탑 + 배달 게시판 + 분수 흉내
  b.add(new THREE.BoxGeometry(7, 46, 7), 0xcfc9ba, at(0, GROUND_Y + 23, -36));
  b.add(prismGeometry(8.4, 4.2, 8.4), 0x3f4a5a, at(0, GROUND_Y + 46, -36));
  for (const s of [-1, 1]) {
    g.add(new THREE.CircleGeometry(2.1, 16), 0xfff3cf, at(0, GROUND_Y + 39, -36 + s * 3.56, { rx: s === 1 ? 0 : Math.PI }));
  }
  b.add(new THREE.CylinderGeometry(4.6, 5.2, 1.1, 14), 0xa9a396, at(0, GROUND_Y + 0.55, 0)); // 분수대
  b.add(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 8), 0xa9a396, at(0, GROUND_Y + 1.8, 0));
  // 게시판 — 종이가 잔뜩 붙은 나무 보드
  b.add(new THREE.BoxGeometry(4.6, 2.6, 0.3), C.trunk, at(0, GROUND_Y + 2.2, 36));
  for (const px of [-2.1, 2.1]) b.add(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 6), C.pole, at(px, GROUND_Y + 1.7, 36));
  b.add(prismGeometry(5.2, 0.8, 1.2), C.roof1, at(0, GROUND_Y + 3.5, 36));
  const paperRand = mulberry32(77);
  for (let i = 0; i < 8; i++) {
    b.add(new THREE.BoxGeometry(0.7, 0.9, 0.05), i % 3 === 0 ? 0xfdf6e3 : 0xf2e8d5,
      at(-1.7 + (i % 4) * 1.15, GROUND_Y + 1.9 + Math.floor(i / 4) * 1.0, 36.18, { rz: (paperRand() - 0.5) * 0.2 }));
  }

  // 가로등 — 큰길(로컬 z=0)을 따라
  for (let lx = -147; lx <= 147; lx += BLOCK) {
    for (const s of [-1, 1]) {
      b.add(new THREE.CylinderGeometry(0.09, 0.13, 5.2, 6), C.pole, at(lx, GROUND_Y + 2.6, s * 5.6));
      g.add(new THREE.SphereGeometry(0.42, 8, 6), 0xfff0c0, at(lx, GROUND_Y + 5.3, s * 5.6));
    }
  }

  // --- 부두 두 곳 (마을 해안 / 도시 해안) ---
  function pier(builder, sx, sz, dx, dz, len) {
    const deckY = 1.05;
    const n = Math.round(len / 1.7);
    for (let i = 0; i < n; i++) {
      const px = sx + dx * (i * 1.7 + 0.9), pz = sz + dz * (i * 1.7 + 0.9);
      builder.add(new THREE.BoxGeometry(3.4, 0.2, 1.5), i % 5 === 4 ? 0x9a7856 : C.trunk,
        { x: px, y: deckY, z: pz, ry: Math.atan2(dx, dz) + Math.PI / 2 });
      if (i % 3 === 0) {
        for (const s of [-1, 1]) {
          builder.add(new THREE.CylinderGeometry(0.16, 0.19, 3.4, 6), 0x6b5a48,
            { x: px + dz * s * 1.6, y: deckY - 1.4, z: pz - dx * s * 1.6 });
        }
      }
    }
    // 부두 끝 등불
    builder.add(new THREE.CylinderGeometry(0.08, 0.11, 3.4, 6), C.pole,
      { x: sx + dx * len, y: deckY + 1.7, z: sz + dz * len });
    g.add(new THREE.SphereGeometry(0.34, 8, 6), 0xffd98a,
      { x: sx + dx * len, y: deckY + 3.5, z: sz + dz * len });
  }
  const port = new MeshBuilder(); // 마을 쪽은 별도 메시 (도시와 묶으면 컬링이 안 된다)
  pier(port, V_DOCK.x, V_DOCK.z, DIR.x, DIR.z, 22);
  // 마을 부두의 안내판 — 초대장이 오기 전에도 "여기서 뭔가 떠난다"는 예감
  port.add(new THREE.CylinderGeometry(0.09, 0.12, 2.6, 6), C.pole, { x: V_DOCK.x - DIR.x * 3, y: heightAt(V_DOCK.x - DIR.x * 3, V_DOCK.z - DIR.z * 3) + 1.3, z: V_DOCK.z - DIR.z * 3 });
  port.add(new THREE.BoxGeometry(2.0, 1.0, 0.12), 0xfdf6e3, { x: V_DOCK.x - DIR.x * 3, y: heightAt(V_DOCK.x - DIR.x * 3, V_DOCK.z - DIR.z * 3) + 2.5, z: V_DOCK.z - DIR.z * 3, ry: Math.atan2(DIR.x, DIR.z) });
  pier(b, C_DOCK.x, C_DOCK.z, -DIR.x, -DIR.z, 22);

  const cityMesh = b.build();
  group.add(cityMesh);
  const portMesh = port.build();
  group.add(portMesh);

  const glowMesh = g.build({ castShadow: false, receiveShadow: false });
  glowMesh.material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.25 });
  group.add(glowMesh);

  // --- 전차: 큰길을 왕복한다 ---
  const tram = new THREE.Group();
  const tramBody = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.3, 2.5), toon(0xc0574f));
  tramBody.position.y = 1.9;
  tramBody.castShadow = true;
  tram.add(tramBody);
  const tramStripe = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.55, 2.56), toon(0xf7f0e0));
  tramStripe.position.y = 1.35;
  tram.add(tramStripe);
  const tramWinMat = new THREE.MeshBasicMaterial({ color: C.windowLit, transparent: true, opacity: 0.4 });
  const tramWin = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.8, 2.58), tramWinMat);
  tramWin.position.y = 2.45;
  tram.add(tramWin);
  const tramRoof = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 2.6), toon(0x3f4a5a));
  tramRoof.position.y = 3.1;
  tram.add(tramRoof);
  for (const wx of [-2.4, 2.4]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.3, 10), toon(0x3a3a42));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.45, 0);
    tram.add(wheel);
  }
  const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), toon(0x3a3a42));
  pant.position.set(0, 3.9, 0);
  pant.rotation.z = 0.5;
  tram.add(pant);
  tram.position.set(CX, GROUND_Y, CZ); // 로컬 z=0 큰길
  group.add(tram);

  // --- 고향 들꽃 — 3막에서 나타난다 ---
  const flower = new THREE.Group();
  flower.position.set(CITY.flower.x, GROUND_Y, CITY.flower.y);
  flower.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.8, 5), toon(0x5e8c4a))).position.y = 0.4;
  const bloom = new THREE.Group();
  bloom.position.y = 0.85;
  bloom.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon(0xffd166)));
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon(0xf2a3b3));
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.15, 0.02, Math.sin(a) * 0.15);
    petal.scale.set(1.15, 0.55, 1.15);
    bloom.add(petal);
  }
  flower.add(bloom);
  const flowerHalo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.3, 7, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9c8, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  flowerHalo.position.y = 3.5;
  flower.add(flowerHalo);
  flower.visible = false;
  group.add(flower);

  // --- 수평선의 실루엣 — 마을에서 보이는 "저 너머의 도시" (안개를 무시한다) ---
  const silMat = new THREE.MeshBasicMaterial({ color: 0xaebdcf, transparent: true, opacity: 0.62, fog: false });
  {
    const sb = new MeshBuilder();
    const sRand = mulberry32(555);
    const d0 = Math.hypot(CX, CZ);
    const ux = CX / d0, uz = CZ / d0, px = -uz, pz = ux;
    const scx = ux * 1400, scz = uz * 1400;
    for (let i = -7; i <= 7; i++) {
      const off = i * 36 + (sRand() - 0.5) * 14;
      const h = 22 + sRand() * 46 * (1 - Math.abs(i) / 9);
      // 바닥을 수평선 아래로 깊이 가라앉혀 "떠 있는 상자"가 되지 않게
      sb.add(new THREE.BoxGeometry(18 + sRand() * 16, h + 14, 3), 0xffffff,
        { x: scx + px * off, y: (h + 14) / 2 - 16, z: scz + pz * off, ry: Math.atan2(ux, uz) });
    }
    var silhouette = sb.build({ castShadow: false, receiveShadow: false });
    silhouette.material = silMat;
    group.add(silhouette);
  }

  const SLATE = new THREE.Color(0x3c4a63);
  const _sil = new THREE.Color();

  return {
    group,
    heightAt: cityHeightAt,
    flowerGroup: flower,
    // 도시 안 1 ↔ 마을 0 — 별·반딧불이·바람 소리 크로스페이드에 쓴다
    blendAt(x, z) {
      return smoothstep(430, 300, Math.hypot(x - CX, z - CZ));
    },
    update(dt, t, p) {
      // 전차 왕복 — 끝에서 방향을 튼다
      const span = 300, speed = 8.5;
      const phase = (t * speed) % (span * 2);
      const lx = phase < span ? -150 + phase : 150 - (phase - span);
      tram.position.set(CX + lx, GROUND_Y, CZ);
      tram.rotation.y = phase < span ? 0 : Math.PI;
      // 들꽃은 은은하게 숨쉰다
      if (flower.visible) {
        bloom.rotation.y = t * 0.6;
        flowerHalo.material.opacity = 0.08 + Math.sin(t * 2.2) * 0.04;
      }
      // 실루엣은 마을 쪽에서만
      silhouette.visible = p.x < 620;
    },
    setNight(glow, horizon) {
      glowMesh.material.opacity = 0.22 + glow * 0.78;
      tramWinMat.opacity = 0.3 + glow * 0.7;
      silMat.color.copy(_sil.copy(horizon).lerp(SLATE, 0.42 + glow * 0.3));
    },
  };
}
