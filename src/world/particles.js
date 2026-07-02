// 흩날리는 나뭇잎 + 부스트 스피드라인
import * as THREE from 'three';
import { toon } from '../palette.js';
import { mulberry32 } from '../noise.js';
import { heightAt, WORLD } from './terrain.js';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);

const LEAF_GREEN = new THREE.Color(0x6db54a);
const PETAL_PINK = new THREE.Color(0xf5b3c6);

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
      // 벚꽃 숲 근처에선 초록 잎 대신 분홍 꽃잎이 흩날린다
      const nearCherry = Math.hypot(playerPos.x - WORLD.cherry.x, playerPos.z - WORLD.cherry.y) < 75;
      mat.color.lerp(nearCherry ? PETAL_PINK : LEAF_GREEN, Math.min(1, 0.04));
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

// 밤의 반딧불이 — 풀밭 위를 낮게 떠다니는 노란 불빛
export function createFireflies() {
  const COUNT = 26;
  const rand = mulberry32(1313);
  const geo = new THREE.PlaneGeometry(0.22, 0.22);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe9a3, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const flies = Array.from({ length: COUNT }, () => ({
    ox: (rand() * 2 - 1) * 34,
    oz: (rand() * 2 - 1) * 34,
    phase: rand() * Math.PI * 2,
  }));
  return {
    mesh,
    update(t, playerPos, night) {
      const ground = heightAt(playerPos.x, playerPos.z);
      const near = ground > 0.5 && playerPos.y - ground < 26 ? 1 : 0;
      mat.opacity = night * near * 0.9;
      if (mat.opacity < 0.02) return;
      flies.forEach((f, i) => {
        const x = playerPos.x + f.ox + Math.sin(t * 0.5 + f.phase) * 5;
        const z = playerPos.z + f.oz + Math.cos(t * 0.4 + f.phase * 2) * 5;
        const gy = heightAt(x, z);
        _p.set(x, gy + 1 + Math.sin(t * 1.4 + f.phase) * 0.8, z);
        const tw = 0.6 + 0.4 * Math.sin(t * 3.5 + f.phase * 3);
        _s.setScalar(gy > 0.5 ? tw : 0.0001);
        _e.set(0, t * 0.3 + f.phase, 0);
        _q.setFromEuler(_e);
        mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      });
      _s.set(1, 1, 1);
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// 바다 위에 반짝이는 햇빛 조각들 — 플레이어 주변 수면에만
export function createSparkles() {
  const COUNT = 80;
  const rand = mulberry32(777);
  const geo = new THREE.PlaneGeometry(0.9, 0.9);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const sparks = Array.from({ length: COUNT }, () => ({ x: 0, z: 0, phase: rand() * Math.PI * 2, alive: false }));

  function respawn(sp, px, pz) {
    for (let tries = 0; tries < 6; tries++) {
      const a = rand() * Math.PI * 2;
      const r = 30 + rand() * 220;
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (heightAt(x, z) < -0.5) { sp.x = x; sp.z = z; sp.alive = true; return; }
    }
    sp.alive = false;
  }

  return {
    mesh,
    update(t, playerPos) {
      sparks.forEach((sp, i) => {
        if (!sp.alive || Math.hypot(sp.x - playerPos.x, sp.z - playerPos.z) > 280) {
          respawn(sp, playerPos.x, playerPos.z);
        }
        const tw = Math.max(0, Math.sin(t * 2.2 + sp.phase)); // 깜빡깜빡
        _p.set(sp.x, 0.55, sp.z);
        _s.setScalar(sp.alive ? 0.4 + tw * 1.1 : 0.0001);
        _e.set(0, sp.phase + t * 0.2, 0);
        _q.setFromEuler(_e);
        mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      });
      _s.set(1, 1, 1); // 공용 스케일 벡터 복원
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
