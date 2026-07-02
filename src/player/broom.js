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

  // 솔: 가운데 큰 다발 + 옆으로 살짝 벌어진 다발 둘 — 풍성하게
  const bristles = new THREE.Group();
  bristles.position.set(0, 0, 2.2);
  const strawDark = 0xc49a52;
  const b0 = mesh(new THREE.ConeGeometry(0.22, 1.55, 9), C.straw, 0, 0, 0);
  b0.rotation.x = -Math.PI / 2;
  const b1 = mesh(new THREE.ConeGeometry(0.15, 1.3, 8), strawDark, 0.11, 0.05, 0.1);
  b1.rotation.x = -Math.PI / 2;
  b1.rotation.z = 0.1;
  const b2 = mesh(new THREE.ConeGeometry(0.15, 1.3, 8), strawDark, -0.1, -0.05, 0.08);
  b2.rotation.x = -Math.PI / 2;
  b2.rotation.z = -0.1;
  bristles.add(b0, b1, b2);
  visual.add(bristles);
  // 묶은 띠 두 줄
  for (const [bz, br] of [[1.52, 0.11], [1.72, 0.14]]) {
    const band = mesh(new THREE.CylinderGeometry(br, br, 0.1, 8), C.ribbon, 0, 0, bz);
    band.rotation.x = Math.PI / 2;
    visual.add(band);
  }

  // 배달 가방 — 덮개와 어깨끈까지
  const bag = new THREE.Group();
  bag.position.set(0, -0.5, -0.95);
  bag.add(mesh(new THREE.BoxGeometry(0.52, 0.44, 0.3), 0x9c6b3f, 0, 0, 0));
  bag.add(mesh(new THREE.BoxGeometry(0.54, 0.2, 0.32), 0x7a5230, 0, 0.14, 0));
  bag.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), 0xf2d38a, 0, 0.02, -0.17));
  visual.add(bag);
  const strap = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 4), 0x7a5230, 0, -0.2, -0.95);
  visual.add(strap);

  // --- 소녀 ---
  const girl = new THREE.Group();
  girl.position.set(0, 0.06, 0);
  visual.add(girl);

  const dress = mesh(new THREE.ConeGeometry(0.58, 1.2, 12), C.dress, 0, 0.5, 0);
  girl.add(dress);
  // 하얀 옷깃
  girl.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.1, 8), 0xf7f2e8, 0, 1.06, 0));
  // 머리: 피부 구 + 뒷머리 + 앞머리(가르마 앞머리 볼륨)
  girl.add(mesh(new THREE.SphereGeometry(0.31, 14, 12), C.skin, 0, 1.32, -0.06));
  girl.add(mesh(new THREE.SphereGeometry(0.35, 14, 12), C.hair, 0, 1.37, 0.05));
  const bangs = mesh(new THREE.SphereGeometry(0.3, 12, 10), C.hair, 0, 1.5, -0.12);
  bangs.scale.set(1.04, 0.62, 0.9);
  girl.add(bangs);
  // 얼굴 — 또렷한 눈과 발그레한 볼
  for (const sx of [-1, 1]) {
    girl.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), 0x2e2118, sx * 0.12, 1.34, -0.34));
    const blush = mesh(new THREE.SphereGeometry(0.055, 8, 6), 0xf5a8ad, sx * 0.21, 1.24, -0.29);
    blush.scale.set(1, 0.7, 0.5);
    girl.add(blush);
  }
  // 빨간 리본 (키키!)
  const rb1 = mesh(new THREE.BoxGeometry(0.32, 0.2, 0.1), C.ribbon, -0.17, 1.68, 0);
  const rb2 = mesh(new THREE.BoxGeometry(0.32, 0.2, 0.1), C.ribbon, 0.17, 1.68, 0);
  rb1.rotation.z = 0.45; rb2.rotation.z = -0.45;
  girl.add(rb1, rb2, mesh(new THREE.SphereGeometry(0.08, 8, 8), C.ribbon, 0, 1.7, 0));
  // 팔 — 앞으로 뻗어 손잡이를 잡고, 소매 끝은 하얀 커프스 + 손
  for (const sx of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.065, 0.5, 4, 8), C.dress, sx * 0.17, 0.82, -0.3);
    arm.rotation.x = 1.15;
    arm.rotation.z = sx * -0.18;
    girl.add(arm);
    const cuff = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 8), 0xf7f2e8, sx * 0.12, 0.6, -0.56);
    cuff.rotation.x = 1.15;
    girl.add(cuff);
    girl.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), C.skin, sx * 0.1, 0.52, -0.63));
  }
  // 다리 — 옆으로 모아 앉은 자세 (왼쪽), 둥근 빨간 신발
  for (const [ox, oz] of [[-0.1, -0.06], [-0.16, 0.1]]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), C.skin, -0.26 + ox * 0.3, 0.12, oz);
    leg.rotation.z = 0.75;
    girl.add(leg);
    const shoe = mesh(new THREE.SphereGeometry(0.11, 8, 6), C.shoe, -0.53 + ox * 0.3, -0.07, oz - 0.03);
    shoe.scale.set(1, 0.75, 1.5);
    girl.add(shoe);
  }

  // --- 검은 고양이 지지 (솔 위에 앉음) ---
  const cat = new THREE.Group();
  cat.position.set(0, 0.17, 1.18);
  visual.add(cat);
  const catBody = mesh(new THREE.SphereGeometry(0.16, 10, 8), C.cat, 0, 0, 0);
  catBody.scale.set(0.95, 1.05, 1.1);
  cat.add(catBody);
  cat.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), C.cat, 0, 0.21, -0.05));
  // 하얀 주둥이 + 빨간 목걸이
  const muzzle = mesh(new THREE.SphereGeometry(0.055, 8, 6), 0xe8e6e0, 0, 0.17, -0.16);
  muzzle.scale.set(1.3, 0.8, 0.7);
  cat.add(muzzle);
  const collar = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 10), C.ribbon, 0, 0.11, -0.03);
  cat.add(collar);
  for (const sx of [-1, 1]) {
    cat.add(mesh(new THREE.ConeGeometry(0.05, 0.13, 4), C.cat, sx * 0.075, 0.35, -0.03));
    cat.add(mesh(new THREE.ConeGeometry(0.028, 0.07, 4), 0xd98a94, sx * 0.072, 0.34, -0.045));
    // 큰 눈 + 까만 눈동자
    cat.add(mesh(new THREE.SphereGeometry(0.032, 6, 6), 0xfdf6a3, sx * 0.055, 0.24, -0.15));
    cat.add(mesh(new THREE.SphereGeometry(0.015, 6, 5), 0x1c1c22, sx * 0.055, 0.24, -0.175));
  }
  const tail = mesh(new THREE.CylinderGeometry(0.028, 0.018, 0.44, 6), C.cat, 0, 0.12, 0.2);
  tail.geometry.translate(0, 0.22, 0); // 피벗을 꼬리 뿌리로
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
      // 고양이 꼬리 살랑 + 귀 쫑긋
      tail.rotation.z = Math.sin(t * 3.2) * 0.5;
      cat.rotation.y = Math.sin(t * 0.7) * 0.12;
      // 치마 펄럭 (속도감)
      const flutter = 1 + Math.sin(t * 9) * 0.04 * (0.4 + boostFactor);
      dress.scale.set(flutter, 1, flutter);
      // 솔 끝이 바람에 파르르
      bristles.rotation.z = Math.sin(t * 6) * 0.03 * (0.5 + boostFactor);
    },
  };
}
