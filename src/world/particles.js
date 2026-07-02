// 흩날리는 나뭇잎 + 부스트 스피드라인
import * as THREE from 'three';
import { toon } from '../palette.js';
import { mulberry32 } from '../noise.js';
import { heightAt } from './terrain.js';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);

export function createLeaves() {
  const COUNT = 18;
  const rand = mulberry32(555);
  const geo = new THREE.PlaneGeometry(0.3, 0.22);
  const mat = toon(0x6db54a, { side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  // 플레이어 주변 로컬 궤도 파라미터
  const leaves = Array.from({ length: COUNT }, () => ({
    ox: (rand() * 2 - 1) * 26,
    oy: -3 - rand() * 8, // 시선보다 아래쪽에서만 흩날리게
    oz: (rand() * 2 - 1) * 26,
    phase: rand() * Math.PI * 2,
    spin: 1 + rand() * 2.5,
  }));

  return {
    mesh,
    update(t, playerPos) {
      // 나뭇잎은 풀밭 지상 근처에만 — 높은 하늘·바다 위에선 보이지 않게
      const ground = heightAt(playerPos.x, playerPos.z);
      const alt = playerPos.y - ground;
      const groundness = ground < 0.5 ? 0 : Math.max(0, 1 - Math.max(0, alt - 18) / 22);
      leaves.forEach((lf, i) => {
        const k = t * 0.5 + lf.phase;
        _p.set(
          playerPos.x + lf.ox + Math.sin(k) * 4,
          groundness < 0.05 ? -999 :
            playerPos.y + lf.oy + Math.sin(k * 0.7) * 3 - ((t * 1.2 + lf.phase * 5) % 22) + 11,
          playerPos.z + lf.oz + Math.cos(k * 0.9) * 4
        );
        _e.set(t * lf.spin, lf.phase + t * lf.spin * 0.7, t * lf.spin * 0.5);
        _q.setFromEuler(_e);
        mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// 부스트 시 카메라 주변을 뒤로 스치는 흰 바람 줄기 — 카메라에 부착
export function createSpeedLines(camera) {
  const COUNT = 14;
  const rand = mulberry32(999);
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  const geo = new THREE.PlaneGeometry(0.035, 3.2);
  geo.rotateX(Math.PI / 2); // 길이 방향을 -Z(전방)로
  const lines = [];
  for (let i = 0; i < COUNT; i++) {
    const line = new THREE.Mesh(geo, mat);
    const a = rand() * Math.PI * 2;
    const r = 1.6 + rand() * 2.2;
    line.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.7, -(4 + rand() * 14));
    line.rotation.z = a + Math.PI / 2;
    line.userData.speed = 40 + rand() * 25;
    lines.push(line);
    group.add(line);
  }
  camera.add(group);

  let vis = 0;
  return {
    update(dt, boost) {
      vis += ((boost ? 1 : 0) - vis) * Math.min(1, dt * 5);
      mat.opacity = vis * 0.25;
      if (vis < 0.02) return;
      for (const line of lines) {
        line.position.z += line.userData.speed * dt;
        if (line.position.z > -2.5) line.position.z = -18;
      }
    },
  };
}
