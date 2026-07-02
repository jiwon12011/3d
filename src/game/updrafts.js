// 상승기류 — 아지랑이 기둥에 들어가면 부스트 없이도 슝 떠오른다.
// 잘 나는 재미를 직접 강화하는 장치: 논밭의 더운 공기, 절벽의 바닷바람, 하늘 정원행 기둥.
import * as THREE from 'three';
import { WORLD, heightAt } from '../world/terrain.js';

const LIFT = 16; // m/s

// { x, z, top(절대고도), r }
const COLUMNS = [
  { x: 85, z: 60, top: 55, r: 9 },                                    // 논밭의 더운 공기
  { x: 186, z: 26, top: 72, r: 9 },                                   // 등대 절벽의 바닷바람
  { x: WORLD.meadow.x, z: WORLD.meadow.y, top: 58, r: 9 },            // 꽃밭 언덕
  { x: WORLD.skyGarden.x, z: WORLD.skyGarden.y, top: 118, r: 11 },    // 호수 → 하늘 정원 직행
  { x: -158, z: -158, top: 92, r: 10 },                               // 설산 남동 진입로
  { x: WORLD.snowPeak.x + 34, z: WORLD.snowPeak.y + 30, top: 112, r: 10 }, // 설산 능선
];

export function createUpdrafts() {
  const group = new THREE.Group();

  // 기둥: 은은한 반투명 실린더
  const colMat = new THREE.MeshBasicMaterial({
    color: 0xeafaff, transparent: true, opacity: 0.06,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  for (const c of COLUMNS) {
    const gy = heightAt(c.x, c.z);
    const h = c.top - gy;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.85, c.r, h, 14, 1, true), colMat);
    cyl.position.set(c.x, gy + h / 2, c.z);
    group.add(cyl);
  }

  // 올라가는 바람 줄기 — 기둥마다 10가닥, 전체 1드로우콜
  const PER = 10;
  const streaks = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.16, 3.2),
    new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.4,
      depthWrite: false, side: THREE.DoubleSide,
    }),
    COLUMNS.length * PER
  );
  streaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(streaks);

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const _p = new THREE.Vector3(), _s = new THREE.Vector3();

  return {
    group,
    // controls.setLift에 꽂는 함수 — 기둥 안이면 초당 상승량을 돌려준다
    liftAt(x, y, z) {
      for (const c of COLUMNS) {
        const d = Math.hypot(x - c.x, z - c.z);
        if (d > c.r || y > c.top) continue;
        return LIFT * Math.min(1, (c.top - y) / 10); // 꼭대기 근처에서 부드럽게 소멸
      }
      return 0;
    },
    update(t) {
      let i = 0;
      for (const c of COLUMNS) {
        const gy = heightAt(c.x, c.z);
        const h = c.top - gy;
        for (let k = 0; k < PER; k++, i++) {
          const phase = (t * 0.16 + k / PER + (i % 7) * 0.09) % 1;
          const a = (k / PER) * Math.PI * 2 + t * 0.35;
          const rr = c.r * (0.35 + 0.5 * ((k * 37) % 10) / 10);
          _p.set(c.x + Math.cos(a) * rr, gy + phase * h, c.z + Math.sin(a) * rr);
          _e.set(0, a, 0.12);
          _q.setFromEuler(_e);
          _s.setScalar(Math.sin(phase * Math.PI)); // 아래·위 끝에서 사라짐
          streaks.setMatrixAt(i, _m.compose(_p, _q, _s));
        }
      }
      streaks.instanceMatrix.needsUpdate = true;
    },
  };
}
