// 하늘 정원 — 호수 상공 112m의 구름 섬. 상승기류를 타고 올라온 사람만 만난다.
import * as THREE from 'three';
import { toon } from '../palette.js';
import { MeshBuilder } from '../merge.js';
import { WORLD } from '../world/terrain.js';
import { mulberry32 } from '../noise.js';

export const GARDEN_Y = 112;

export function createSkyGarden() {
  const group = new THREE.Group();
  const { x: cx, y: cz } = WORLD.skyGarden;
  const rand = mulberry32(9182);

  // 구름 플랫폼: 가운데 큰 섬 + 둘레의 징검다리 구름
  const b = new MeshBuilder();
  for (let i = 0; i < 7; i++) {
    b.add(new THREE.SphereGeometry(7 + rand() * 5, 9, 7), 0xffffff, {
      x: (rand() - 0.5) * 16, y: (rand() - 0.5) * 2.5, z: (rand() - 0.5) * 16, sy: 0.42,
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(3.2 + rand() * 2, 8, 6), 0xffffff, {
      x: Math.cos(a) * (22 + rand() * 6),
      y: (rand() - 0.5) * 5,
      z: Math.sin(a) * (22 + rand() * 6),
      sy: 0.45,
    });
  }
  const platform = b.build({ castShadow: false, receiveShadow: false });
  group.add(platform);

  // 무지개 문 — 정원 한가운데 반원 아치
  const colors = [0xe57373, 0xf2a45c, 0xf7d774, 0x8fd05a, 0x6db3e8, 0x9b8ce0];
  colors.forEach((color, i) => {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(11 - i * 0.7, 0.4, 6, 32, Math.PI),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })
    );
    arch.position.y = 2.5;
    group.add(arch);
  });

  group.position.set(cx, GARDEN_Y, cz);
  return {
    group,
    update(t) {
      group.position.y = GARDEN_Y + Math.sin(t * 0.4) * 1.2; // 구름섬은 숨쉬듯 떠 있다
      group.rotation.y = t * 0.015;
    },
  };
}
