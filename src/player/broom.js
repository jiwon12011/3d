// 빗자루 탄 소녀 + 검은 고양이 — 전부 프리미티브 조립 (모델 파일 없음)
// 전방은 -Z. 빗자루 손잡이 앞이 -Z, 솔과 고양이는 +Z.
import * as THREE from 'three';
import { C, toon } from '../palette.js';

function mesh(geo, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  return m;
}

export function createBroomRider() {
  const group = new THREE.Group();   // 위치/회전은 controls가 담당
  const visual = new THREE.Group();  // 부유 bobbing·연출용
  group.add(visual);

  // --- 빗자루 ---
  const handle = mesh(new THREE.CylinderGeometry(0.055, 0.07, 3.2, 8), C.broomWood, 0, 0, 0.1);
  handle.rotation.x = Math.PI / 2;
  visual.add(handle);

  const bristle = mesh(new THREE.ConeGeometry(0.24, 1.5, 9), C.straw, 0, 0, 2.25);
  bristle.rotation.x = -Math.PI / 2; // 뾰족한 쪽이 손잡이 방향
  visual.add(bristle);
  const band = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 8), C.ribbon, 0, 0, 1.52);
  band.rotation.x = Math.PI / 2;
  visual.add(band);

  // 배달 가방 (손잡이 앞에 매달림)
  visual.add(mesh(new THREE.BoxGeometry(0.5, 0.42, 0.28), 0x9c6b3f, 0, -0.45, -1.0));
  visual.add(mesh(new THREE.BoxGeometry(0.04, 0.3, 0.3), 0x7a5230, 0, -0.18, -1.0));

  // --- 소녀 ---
  const girl = new THREE.Group();
  girl.position.set(0, 0.06, 0);
  visual.add(girl);

  const dress = mesh(new THREE.ConeGeometry(0.56, 1.15, 10), C.dress, 0, 0.5, 0);
  girl.add(dress);
  // 머리: 피부 구 앞쪽 + 머리카락 구 뒤쪽 겹침
  girl.add(mesh(new THREE.SphereGeometry(0.3, 12, 10), C.skin, 0, 1.28, -0.07));
  girl.add(mesh(new THREE.SphereGeometry(0.34, 12, 10), C.hair, 0, 1.33, 0.05));
  // 빨간 리본 (키키!)
  const rb1 = mesh(new THREE.BoxGeometry(0.3, 0.19, 0.09), C.ribbon, -0.16, 1.62, 0);
  const rb2 = mesh(new THREE.BoxGeometry(0.3, 0.19, 0.09), C.ribbon, 0.16, 1.62, 0);
  rb1.rotation.z = 0.45; rb2.rotation.z = -0.45;
  girl.add(rb1, rb2, mesh(new THREE.SphereGeometry(0.075, 8, 8), C.ribbon, 0, 1.64, 0));
  // 팔 — 앞으로 뻗어 손잡이를 잡음
  for (const sx of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.065, 0.5, 4, 8), C.dress, sx * 0.17, 0.82, -0.3);
    arm.rotation.x = 1.15;
    arm.rotation.z = sx * -0.18;
    girl.add(arm);
  }
  // 다리 — 옆으로 모아 앉은 자세 (왼쪽), 빨간 신발
  for (const [ox, oz] of [[-0.1, -0.06], [-0.16, 0.1]]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), C.skin, -0.26 + ox * 0.3, 0.12, oz);
    leg.rotation.z = 0.75;
    girl.add(leg);
    girl.add(mesh(new THREE.BoxGeometry(0.13, 0.11, 0.26), C.shoe, -0.52 + ox * 0.3, -0.06, oz));
  }

  // --- 검은 고양이 지지 (솔 위에 앉음) ---
  const cat = new THREE.Group();
  cat.position.set(0, 0.16, 1.15);
  visual.add(cat);
  cat.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), C.cat, 0, 0, 0));
  cat.add(mesh(new THREE.SphereGeometry(0.125, 10, 8), C.cat, 0, 0.2, -0.04));
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.05, 0.12, 4), C.cat, sx * 0.07, 0.33, -0.03);
    cat.add(ear);
    cat.add(mesh(new THREE.SphereGeometry(0.026, 6, 6), 0xfdf6a3, sx * 0.05, 0.22, -0.15));
  }
  const tail = mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.42, 6), C.cat, 0, 0.12, 0.2);
  tail.geometry.translate(0, 0.21, 0); // 피벗을 꼬리 뿌리로
  tail.rotation.x = 0.9;
  cat.add(tail);

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  let lean = 0;
  return {
    group,
    update(t, boostFactor) {
      // 부유 bobbing
      visual.position.y = Math.sin(t * 2.1) * 0.15;
      // 부스트 시 몸을 앞으로 숙임
      lean += ((boostFactor > 0.3 ? -0.18 : 0) - lean) * 0.08;
      visual.rotation.x = lean + Math.sin(t * 2.1 + 1) * 0.02;
      // 고양이 꼬리 살랑
      tail.rotation.z = Math.sin(t * 3.2) * 0.5;
      // 치마 펄럭 (속도감)
      const flutter = 1 + Math.sin(t * 9) * 0.04 * (0.4 + boostFactor);
      dress.scale.set(flutter, 1, flutter);
    },
  };
}
