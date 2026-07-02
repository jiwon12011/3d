// 별사탕 — 수집의 중심. 전체가 InstancedMesh 1개, 판정은 공간 그리드로 주변 셀만.
// 배치 원칙: 저공비행·선회·랜드마크 방문을 유도하는 자리에만 놓는다.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../noise.js';
import { WORLD, PATH_SEGMENTS, RIVER_SEGMENTS, heightAt } from '../world/terrain.js';

// 콘페이토(별사탕): 통통한 구슬 + 짧고 뭉툭한 뿔 20개.
// 씬 조명을 받지 않는 밝은 재질에 은은한 위-아래 음영만 정점색으로 굽는다 —
// 뿔이 길거나 색이 어두우면 즉시 "기뢰"가 되므로 주의.
function konpeitoGeometry() {
  const parts = [new THREE.SphereGeometry(0.56, 10, 8).toNonIndexed()];
  const phi = (1 + Math.sqrt(5)) / 2, s3 = 1 / Math.sqrt(3);
  const dirs = [];
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    dirs.push([0, s1, s2 * phi], [s1, s2 * phi, 0], [s2 * phi, 0, s1]);
    for (const s0 of [-1, 1]) dirs.push([s0 * s3, s1 * s3, s2 * s3]);
  }
  const v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  for (const d of dirs) {
    const nub = new THREE.ConeGeometry(0.24, 0.32, 6).toNonIndexed();
    nub.translate(0, 0.6, 0);
    q.setFromUnitVectors(up, v.set(...d).normalize());
    nub.applyQuaternion(q);
    parts.push(nub);
  }
  const geo = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  // 위에서 빛을 받은 듯한 밝은 음영 베이크 (0.84~1.0)
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const ny = pos.getY(i) / 0.78;
    const l = 0.84 + 0.16 * Math.min(1, Math.max(0, ny * 0.5 + 0.5));
    colors[i * 3] = l; colors[i * 3 + 1] = l; colors[i * 3 + 2] = l;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

const CELL = 24;
const PICK_R = 3.4, PICK_R_BIG = 5.2;
const COMBO_WINDOW = 2.5; // 이 안에 연속 픽업하면 음정이 올라간다

export function createCandies(save, hud, sfx) {
  const group = new THREE.Group();
  const rand = mulberry32(4242);
  const spots = []; // { x, y, z, big }

  const put = (x, y, z, big = false) => spots.push({ x, y, z, big });
  // 길·강을 따라 낮게 흐르는 체인
  const chain = (a, b, step, alt) => {
    const n = Math.max(2, Math.floor(a.distanceTo(b) / step));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = a.x + (b.x - a.x) * t + (rand() - 0.5) * 3;
      const z = a.y + (b.y - a.y) * t + (rand() - 0.5) * 3;
      put(x, heightAt(x, z) + alt + Math.sin(i * 1.1) * 1.2, z);
    }
  };
  // 랜드마크를 도는 링
  const ring = (cx, cz, r, n, alt) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      put(x, heightAt(x, z) + alt, z);
    }
  };
  // 두 지점을 잇는 공중 포물선
  const arc = (ax, ay, az, bx, by, bz, n, rise) => {
    for (let i = 1; i < n; i++) {
      const t = i / n;
      put(ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(t * Math.PI) * rise, az + (bz - az) * t);
    }
  };

  const tc = WORLD.townCenter, fc = WORLD.fieldCenter;
  for (const [a, b] of PATH_SEGMENTS) chain(a, b, 13, 4);
  for (const [a, b] of RIVER_SEGMENTS) chain(a, b, 15, 5);
  ring(tc.x, tc.y, 26, 10, 10);                            // 마을 지붕 위
  ring(tc.x, tc.y, 9, 8, 16);                              // 시계탑 시계판 높이
  put(tc.x, heightAt(tc.x, tc.y) + 27.5, tc.y, true);      // 시계탑 꼭대기
  ring(WORLD.meadow.x, WORLD.meadow.y, 18, 8, 5);          // 꽃밭 언덕
  ring(WORLD.cherry.x, WORLD.cherry.y, 14, 7, 6);          // 벚꽃 숲
  ring(WORLD.windmill.x, WORLD.windmill.y, 12, 6, 12);     // 풍차 날개 높이
  put(WORLD.windmill.x, heightAt(WORLD.windmill.x, WORLD.windmill.y) + 19, WORLD.windmill.y, true);
  ring(WORLD.lighthouse.x, WORLD.lighthouse.y, 10, 8, 14); // 등대
  put(WORLD.lighthouse.x, heightAt(WORLD.lighthouse.x, WORLD.lighthouse.y) + 19, WORLD.lighthouse.y, true);
  ring(fc.x, fc.y, 20, 8, 5);                              // 논밭
  ring(WORLD.lakeCenter.x, WORLD.lakeCenter.y, 22, 8, 6);  // 호수 수면 스치기
  ring(WORLD.bigTree.x, WORLD.bigTree.y, 22, 10, 15);      // 대왕나무 (깊은 숲 해금 보상)
  put(WORLD.bigTree.x, heightAt(WORLD.bigTree.x, WORLD.bigTree.y) + 34, WORLD.bigTree.y, true);
  arc(tc.x, 26, tc.y, fc.x, 20, fc.y, 9, 16);              // 마을 ↔ 논밭 하늘길
  arc(tc.x, 30, tc.y, WORLD.lighthouse.x, 24, WORLD.lighthouse.y, 9, 20); // 마을 ↔ 등대
  for (const isl of WORLD.islands) ring(isl.x, isl.y, 10, 5, 6); // 앞바다 섬
  // 설산: 능선 링 + 봉우리의 큰 별사탕
  ring(WORLD.snowPeak.x, WORLD.snowPeak.y, 34, 8, 14);
  put(WORLD.snowPeak.x, heightAt(WORLD.snowPeak.x, WORLD.snowPeak.y) + 8, WORLD.snowPeak.y, true);
  // 하늘 정원: 구름섬 둘레의 공중 링 (절대 고도)
  const sg = WORLD.skyGarden;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    put(sg.x + Math.cos(a) * 16, 116 + Math.sin(a * 2) * 1.5, sg.y + Math.sin(a) * 16, i === 0);
  }

  // --- 메시 ---
  const N = spots.length;
  // 조명 무시 + 베이크 음영 — 어떤 시간대에도 화사한 사탕색을 유지
  const mesh = new THREE.InstancedMesh(
    konpeitoGeometry(),
    new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }),
    N
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // 선명한 파스텔 콘페이토 색 변주 + 큰 별사탕은 금빛
  const PASTELS = [0xfffdf4, 0xffc9d6, 0xffe98a, 0xc6f2d9, 0xc9e4ff].map((c) => new THREE.Color(c));
  const cBig = new THREE.Color(0xffd166);
  for (let i = 0; i < N; i++) mesh.setColorAt(i, spots[i].big ? cBig : PASTELS[i % PASTELS.length]);
  group.add(mesh);

  // 픽업 반짝 버스트 — 한 벌을 돌려쓴다
  const BURST_N = 14;
  const burst = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.26),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true }),
    BURST_N
  );
  burst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const burstDirs = [];
  for (let i = 0; i < BURST_N; i++) {
    const a = rand() * Math.PI * 2, b = rand() * Math.PI - Math.PI / 2;
    burstDirs.push(new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b) + 0.4, Math.sin(a) * Math.cos(b)));
  }
  let burstT = 99, burstOrigin = new THREE.Vector3();
  group.add(burst);

  // --- 공간 그리드 ---
  const grid = new Map();
  const cellKey = (cx, cz) => `${cx},${cz}`;
  spots.forEach((s, i) => {
    const k = cellKey(Math.floor(s.x / CELL), Math.floor(s.z / CELL));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });

  const alive = new Array(N).fill(true);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const _p = new THREE.Vector3(), _s = new THREE.Vector3();
  let lastPick = -99, combo = 0, prevDay = null;

  function respawn() {
    alive.fill(true);
    combo = 0;
  }

  return {
    group,
    // 지지의 발견: 40~220m 거리에서 이웃(18m) 3개 이상인 살아있는 군집 중 가장 가까운 것
    findCluster(player) {
      let best = null, bestD = Infinity;
      for (let i = 0; i < N; i++) {
        if (!alive[i]) continue;
        const s = spots[i];
        const d = Math.hypot(player.x - s.x, player.z - s.z);
        if (d < 40 || d > 220 || d >= bestD) continue;
        let near = 0;
        for (const j of grid.get(cellKey(Math.floor(s.x / CELL), Math.floor(s.z / CELL))) || []) {
          if (alive[j] && Math.hypot(s.x - spots[j].x, s.z - spots[j].z) < 18) near++;
        }
        if (near >= 3) { best = s; bestD = d; }
      }
      return best;
    },
    update(dt, t, player, dayTime) {
      // 하루가 넘어가면 전부 리스폰 — "다 주워서 할 게 없음" 방지
      if (prevDay !== null && dayTime < prevDay - 0.5) respawn();
      prevDay = dayTime;

      // 회전·부유 (수집된 것은 스케일 0)
      for (let i = 0; i < N; i++) {
        const s = spots[i];
        const sc = alive[i] ? (s.big ? 1.6 : 0.85) * (1 + Math.sin(t * 3 + i) * 0.07) : 0;
        _e.set(0.42, t * 1.6 + i * 0.7, 0);
        _q.setFromEuler(_e);
        _p.set(s.x, s.y + Math.sin(t * 2 + i) * 0.35, s.z);
        _s.setScalar(sc);
        mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      mesh.instanceMatrix.needsUpdate = true;

      // 주변 셀만 픽업 판정
      const pcx = Math.floor(player.x / CELL), pcz = Math.floor(player.z / CELL);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = grid.get(cellKey(pcx + dx, pcz + dz));
          if (!bucket) continue;
          for (const i of bucket) {
            if (!alive[i]) continue;
            const s = spots[i];
            const r = s.big ? PICK_R_BIG : PICK_R;
            const ddx = player.x - s.x, ddy = player.y - s.y, ddz = player.z - s.z;
            if (ddx * ddx + ddy * ddy + ddz * ddz > r * r) continue;
            alive[i] = false;
            const v = s.big ? 5 : 1;
            save.state.candies += v;
            save.save();
            hud.setCandies(save.state.candies);
            hud.floatPlus(v);
            combo = t - lastPick < COMBO_WINDOW ? combo + 1 : 0;
            lastPick = t;
            sfx.chime(combo);
            burstT = 0;
            burstOrigin.set(s.x, s.y, s.z);
          }
        }
      }

      // 버스트 연출
      burstT += dt;
      const k = Math.min(1, burstT / 0.55);
      for (let i = 0; i < BURST_N; i++) {
        _p.copy(burstOrigin).addScaledVector(burstDirs[i], k * 6);
        _s.setScalar(k < 1 ? (1 - k) : 0);
        _e.set(0, k * 7 + i, 0.4);
        _q.setFromEuler(_e);
        burst.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      burst.material.opacity = 1 - k;
      burst.instanceMatrix.needsUpdate = true;
    },
  };
}
