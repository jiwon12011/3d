// 여러 프리미티브를 색만 다르게 하나의 메시로 병합 — 드로우콜 절약
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon } from './palette.js';

const _color = new THREE.Color();
const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();

export class MeshBuilder {
  constructor() { this.geos = []; }

  // t: { x,y,z, rx,ry,rz, s | sx,sy,sz }
  add(geometry, color, t = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    _euler.set(t.rx || 0, t.ry || 0, t.rz || 0);
    _pos.set(t.x || 0, t.y || 0, t.z || 0);
    _quat.setFromEuler(_euler);
    const s = t.s ?? 1;
    _scale.set(t.sx ?? s, t.sy ?? s, t.sz ?? s);
    g.applyMatrix4(_mat.compose(_pos, _quat, _scale));
    g.deleteAttribute('uv'); // 텍스처 없음 — 병합 시 속성 통일
    _color.set(color);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = _color.r; colors[i * 3 + 1] = _color.g; colors[i * 3 + 2] = _color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geos.push(g);
    return this;
  }

  build({ castShadow = true, receiveShadow = true } = {}) {
    const merged = mergeGeometries(this.geos);
    for (const g of this.geos) g.dispose();
    this.geos = [];
    const mesh = new THREE.Mesh(merged, toon(0xffffff, { vertexColors: true }));
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }
}

// 박공지붕(삼각 프리즘) — 용마루가 로컬 X축 방향
export function prismGeometry(w, h, d) {
  const hw = w / 2, hd = d / 2;
  // 꼭짓점: 처마 4개 + 용마루 2개
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], Cc = [hw, 0, hd], D = [-hw, 0, hd];
  const E = [-hw, h, 0], F = [hw, h, 0];
  const tris = [
    A, B, F, A, F, E,   // 뒤 경사면
    Cc, D, E, Cc, E, F, // 앞 경사면
    D, A, E,            // 왼쪽 박공
    B, Cc, F,           // 오른쪽 박공
    B, A, D, B, D, Cc,  // 바닥
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  geo.computeVertexNormals();
  return geo;
}
