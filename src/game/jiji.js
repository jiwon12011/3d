// 지지의 발견 — 가끔 고양이가 "냐앙!" 하며 근처의 별사탕 군집 쪽을 바라보고,
// 반짝이 조각들이 그 방향으로 흘러가 길을 알려준다.
import * as THREE from 'three';

const TRAIL_N = 6;

export function createJiji(candies, rider, hud, sfx) {
  const group = new THREE.Group();
  const trail = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.3),
    new THREE.MeshBasicMaterial({ color: 0xffe98a, transparent: true }),
    TRAIL_N
  );
  trail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(trail);

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const from = new THREE.Vector3(), dir = new THREE.Vector3();

  let nextAt = 25; // 첫 발견은 시작하고 조금 뒤
  let trailT = 99;
  let toldCount = 0;

  return {
    group,
    update(dt, t, player) {
      if (t >= nextAt) {
        nextAt = t + 50 + Math.random() * 40;
        const c = candies.findCluster(player);
        if (c) {
          dir.set(c.x - player.x, (c.y - player.y) * 0.4, c.z - player.z).normalize();
          from.copy(player).addScaledVector(dir, 3);
          trailT = 0;
          sfx.meow();
          // 고양이가 그쪽을 본다 (플레이어 로컬 각도)
          const yaw = rider.group.rotation.y;
          const lx = (c.x - player.x) * Math.cos(yaw) - (c.z - player.z) * Math.sin(yaw);
          const lz = (c.x - player.x) * Math.sin(yaw) + (c.z - player.z) * Math.cos(yaw);
          rider.catLook(Math.atan2(-lx, -lz), 3.5);
          if (toldCount++ < 3) hud.toast('지지: 냐앙! (저쪽에 뭔가 반짝여요)');
        }
      }

      // 반짝이 길안내 — 점점이 이어지며 사라진다
      trailT += dt;
      const life = 2.6;
      for (let i = 0; i < TRAIL_N; i++) {
        const k = trailT / life - i * 0.09;
        const on = k > 0 && k < 1;
        _p.copy(from).addScaledVector(dir, 4 + i * 6 + (on ? k * 10 : 0));
        _p.y += Math.sin((k + i) * 6) * 0.5;
        _e.set(0.4, t * 4 + i, 0);
        _q.setFromEuler(_e);
        _s.setScalar(on ? Math.sin(k * Math.PI) * 0.9 : 0);
        trail.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      trail.material.opacity = Math.max(0, 1 - trailT / life);
      trail.instanceMatrix.needsUpdate = true;
    },
  };
}
