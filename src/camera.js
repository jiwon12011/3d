// 3인칭 추적 카메라 — 시작 전엔 마을을 천천히 돌고,
// 시작하면 전경에서 캐릭터 뒤로 스윽 들어온다.
import * as THREE from 'three';

const BASE_FOV = 60;
const BOOST_FOV = 72;
const INTRO_LEN = 3.5;

export function createCameraRig(camera, playerGroup) {
  let mode = 'idle';
  let introT = 0;
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const fwdXZ = new THREE.Vector3();
  const introFrom = new THREE.Vector3();

  return {
    get mode() { return mode; },
    start() {
      mode = 'intro';
      introT = 0;
      introFrom.copy(camera.position);
    },

    update(dt, t, forward, boostFactor, bank) {
      const p = playerGroup.position;

      if (mode === 'idle') {
        // 시작 화면 뒤에서 천천히 선회 비행하는 무드샷
        const a = t * 0.06;
        camera.position.set(p.x + Math.cos(a) * 34, p.y + 10, p.z + Math.sin(a) * 34);
        camera.lookAt(p.x - 40, p.y - 10, p.z - 45); // 마을 쪽
        return;
      }

      // 추적 위치: 뒤 6.5m + 위 3.4m — 빗자루 축보다 위에서 내려다봐야
      // 솔이 화면을 가리지 않고 빗자루가 길쭉하게 읽힌다
      fwdXZ.set(forward.x, 0, forward.z).normalize();
      desired.copy(p).addScaledVector(fwdXZ, -6.5);
      desired.y += 3.4 - forward.y * 1.8;

      if (mode === 'intro') {
        introT += dt / INTRO_LEN;
        if (introT >= 1) { mode = 'follow'; introT = 1; }
        const e = introT * introT * (3 - 2 * introT);
        camera.position.lerpVectors(introFrom, desired, e);
      } else {
        const k = 1 - Math.exp(-4.2 * dt);
        camera.position.lerp(desired, k);
      }

      look.copy(p).addScaledVector(forward, 8);
      look.y += 0.4;
      camera.lookAt(look);
      camera.rotateZ(-bank * 0.35); // 선회에 살짝 동조하는 롤

      const fov = BASE_FOV + boostFactor * (BOOST_FOV - BASE_FOV);
      if (Math.abs(camera.fov - fov) > 0.05) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    },
  };
}
