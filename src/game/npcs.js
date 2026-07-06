// 마을 사람들 — 낮게 지나가면 하던 일을 멈추고 손을 흔들어준다.
// 전부 프리미티브 조립. 말풍선은 DOM 하나를 3D 투영으로 따라다니게 한다.
import * as THREE from 'three';
import { C, toon } from '../palette.js';
import { WORLD, heightAt } from '../world/terrain.js';

function mesh(geo, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// 공용 몸통: 치마 + 상체 캡슐 + 머리. 팔은 상체 어깨에 파묻혀 돋아난다 (허공 금지).
function villager({ outfit, skin = C.skin, hair = 0x5a4632, tall = 1 }) {
  const g = new THREE.Group();
  g.scale.setScalar(tall);
  g.add(mesh(new THREE.ConeGeometry(0.55, 1.1, 10), outfit, 0, 0.55, 0));
  const torso = mesh(new THREE.CapsuleGeometry(0.23, 0.3, 4, 10), outfit, 0, 1.25, 0);
  g.add(torso);
  const head = mesh(new THREE.SphereGeometry(0.28, 12, 10), skin, 0, 1.85, 0);
  g.add(head);
  const hairCap = mesh(new THREE.SphereGeometry(0.31, 12, 10), hair, 0, 1.92, 0.05);
  hairCap.scale.set(1, 0.85, 1);
  g.add(hairCap);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.07, 0.32, 4, 8), outfit, s * 0.24, 1.46, 0);
    arm.geometry.translate(0, -0.23, 0); // 어깨를 피벗으로
    arm.rotation.z = s * 0.55;
    arms.push(arm);
    g.add(arm);
  }
  return { g, rightArm: arms[1], head };
}

export function createNpcs() {
  const group = new THREE.Group();
  const list = [];

  const add = (key, name, x, z, faceTo, line, build) => {
    const y = heightAt(x, z);
    const v = build();
    v.g.position.set(x, y, z);
    v.g.rotation.y = Math.atan2(faceTo.x - x, faceTo.z - z);
    group.add(v.g);
    list.push({ key, name, x, y, z, line, ...v, waveUntil: -1, cooldownUntil: -1, baseRot: v.g.rotation.y });
  };

  // 빵집 아주머니 — 가게 앞에서 손님맞이
  {
    const b = WORLD.bakery, tc = WORLD.townCenter;
    const ry = Math.atan2(tc.x - b.x, tc.y - b.y);
    const px = b.x + Math.sin(ry) * 6.5 + Math.cos(ry) * 1.5;
    const pz = b.y + Math.cos(ry) * 6.5 - Math.sin(ry) * 1.5;
    add('baker', '빵집 아주머니', px, pz, { x: tc.x, z: tc.y }, '갓 구운 빵 냄새 좋죠~?', () => {
      const v = villager({ outfit: 0xc95f6e, hair: 0x7a5a48, tall: 1.05 });
      // 하얀 앞치마 (치마 표면에 밀착) + 올림머리
      const apron = mesh(new THREE.BoxGeometry(0.42, 0.72, 0.07), 0xfdf6e3, 0, 0.58, 0.22);
      apron.rotation.x = 0.35;
      v.g.add(apron);
      v.g.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), 0x7a5a48, 0, 2.22, -0.05));
      return v;
    });
  }
  // 농부 — 논밭에서 허리 숙였다 폈다
  add('farmer', '농부 아저씨', WORLD.fieldCenter.x - 10, WORLD.fieldCenter.y - 4,
    { x: WORLD.fieldCenter.x, z: WORLD.fieldCenter.y }, '올해 벼가 아주 잘 컸어!', () => {
      const v = villager({ outfit: 0x5e7a4a, tall: 1.1 });
      v.g.add(mesh(new THREE.ConeGeometry(0.52, 0.3, 10), C.straw, 0, 2.15, 0)); // 밀짚모자
      v.g.add(mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.04, 10), C.straw, 0, 2.04, 0));
      const hoe = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), C.trunk, 0.55, 0.9, 0.2);
      hoe.rotation.z = 0.3;
      v.g.add(hoe);
      return v;
    });
  // 등대지기 — 바다를 본다
  add('keeper', '등대지기 할아버지', WORLD.lighthouse.x - 5, WORLD.lighthouse.y + 4,
    { x: WORLD.lighthouse.x + 40, z: WORLD.lighthouse.y }, '오늘 바다는 잔잔하구먼.', () => {
      const v = villager({ outfit: 0x3d5a80, hair: 0xd8d8d8, tall: 1.08 });
      v.g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), 0xd8d8d8, 0, 1.7, -0.24)); // 수염
      v.g.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.14, 10), 0x2c4a6e, 0, 2.12, 0)); // 모자
      return v;
    });
  // 버스 정류장의 아이 — 빨간 우산 (토토로)
  add('busKid', '정류장 아이', 31.5, 43, { x: 10, z: 10 }, '고양이다!! 안녕!', () => {
    const v = villager({ outfit: 0xf2b134, tall: 0.75 });
    const stick = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 5), C.trunk, 0.45, 1.0, 0.1);
    v.g.add(stick);
    v.g.add(mesh(new THREE.ConeGeometry(0.85, 0.5, 10), 0xd43d3d, 0.45, 1.95, 0.1)); // 우산
    return v;
  });
  // 꽃밭의 소녀
  add('flowerGirl', '꽃밭의 소녀', WORLD.meadow.x + 6, WORLD.meadow.y + 8,
    { x: WORLD.meadow.x, z: WORLD.meadow.y }, '꽃반지 만들어줄까요?', () => {
      const v = villager({ outfit: 0x9b8ce0, hair: 0x3d2e22, tall: 0.85 });
      v.g.add(mesh(new THREE.SphereGeometry(0.09, 6, 5), 0xf2a3b3, 0.14, 2.12, -0.18)); // 머리꽃
      return v;
    });

  // --- 말풍선 (DOM 하나를 돌려쓴다) ---
  const bubble = document.createElement('div');
  bubble.id = 'npc-bubble';
  bubble.className = 'hidden';
  document.body.appendChild(bubble);
  let bubbleState = null; // { npc, until }
  const _v = new THREE.Vector3();

  function showBubble(npc, text, dur = 3) {
    bubble.textContent = text;
    bubbleState = { npc, until: performance.now() / 1000 + dur };
  }

  return {
    group,
    list,
    byKey: (key) => list.find((n) => n.key === key),
    say(key, text, dur) {
      const npc = list.find((n) => n.key === key);
      if (npc) showBubble(npc, text, dur);
    },
    // 귀향 연출 — 마을 사람 모두가 한참 동안 손을 흔들어준다
    waveAll(dur = 8) {
      for (const npc of list) npc.waveAllFor = dur;
    },
    update(t, player, camera) {
      for (const npc of list) {
        if (npc.waveAllFor) {
          npc.waveUntil = t + npc.waveAllFor;
          npc.cooldownUntil = t + npc.waveAllFor;
          npc.waveAllFor = 0;
        }
        const d = Math.hypot(player.x - npc.x, player.z - npc.z);
        const near = d < 22 && player.y < npc.y + 26;
        // 다가오면 인사 (쿨다운 20초)
        if (near && t > npc.cooldownUntil) {
          npc.cooldownUntil = t + 20;
          npc.waveUntil = t + 3;
          showBubble(npc, npc.line);
        }
        // 손 흔들기 / 평상시 자세
        if (t < npc.waveUntil) {
          npc.rightArm.rotation.z = -2.5 + Math.sin(t * 9) * 0.45;
        } else {
          npc.rightArm.rotation.z += (0.45 - npc.rightArm.rotation.z) * 0.08;
        }
        // 가까우면 몸을 돌려 바라본다
        const targetRot = near ? Math.atan2(player.x - npc.x, player.z - npc.z) : npc.baseRot;
        let diff = targetRot - npc.g.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        npc.g.rotation.y += diff * 0.04;
        // 살아있는 숨쉬기
        npc.g.scale.y = npc.g.scale.x * (1 + Math.sin(t * 2 + npc.x) * 0.015);
      }
      // 말풍선 화면 투영
      if (bubbleState) {
        if (performance.now() / 1000 > bubbleState.until) {
          bubbleState = null;
          bubble.classList.add('hidden');
        } else {
          const npc = bubbleState.npc;
          _v.set(npc.x, npc.y + 3.2, npc.z).project(camera);
          if (_v.z < 1) {
            bubble.classList.remove('hidden');
            bubble.style.left = `${(_v.x * 0.5 + 0.5) * innerWidth}px`;
            bubble.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight}px`;
          } else {
            bubble.classList.add('hidden');
          }
        }
      }
    },
  };
}
