// 지브리 룩의 중심 — 모든 색과 툰 재질은 여기서만 만든다.
import * as THREE from 'three';

export const C = {
  skyTop:      0x3d7edb,
  skyMid:      0x7ec3ea,
  horizon:     0xdff3f5,

  cloud:       0xffffff,

  grassLight:  0x8fd05a,
  grass:       0x6ab53f,
  grassDark:   0x4a9a3a,
  sand:        0xe8d9a8,
  dirt:        0xd9c9a3,

  leaf1:       0x4e9c3e,
  leaf2:       0x66b34c,
  leaf3:       0x3f8a46,
  trunk:       0x8a6349,

  roof1:       0xc0574f,
  roof2:       0xd97f4e,
  roof3:       0x7f9bb3,
  wall1:       0xf2e8d5,
  wall2:       0xf7f0e0,
  wall3:       0xe8d9c0,
  windowDark:  0x4a5568,
  windowLit:   0xffd98a,
  pole:        0x6b5a48,
  wire:        0x3a3a42,

  water:       0x4aa8c9,
  waterShallow:0x7fd4dd,

  dress:       0x2e2a3d,
  ribbon:      0xd43d3d,
  hair:        0x5a3825,
  skin:        0xffe0c2,
  shoe:        0xc0392b,
  broomWood:   0xa87c4f,
  straw:       0xd9b36c,
  cat:         0x26222b,
};

// 3단계 툰 그라디언트맵 — 어두운 단계도 55% 이상 밝게 유지 (지브리의 "밝은 그림자")
let _gradientMap = null;
export function gradientMap() {
  if (_gradientMap) return _gradientMap;
  const data = new Uint8Array([140, 191, 255, 255]); // 0.55 / 0.75 / 1.0 / 1.0
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; // 필수: 보간되면 툰 느낌이 죽음
  tex.needsUpdate = true;
  _gradientMap = tex;
  return tex;
}

// 공용 툰 재질 팩토리
export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...opts });
}
