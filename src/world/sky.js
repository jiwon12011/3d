// 하늘 그라디언트 반구 + 태양 번짐 + 밤하늘의 별 — 카메라를 따라다닌다
// 색은 시간 사이클(daycycle)이 매 프레임 갱신한다.
import * as THREE from 'three';
import { C } from '../palette.js';
import { mulberry32 } from '../noise.js';

export function createSky() {
  const geo = new THREE.SphereGeometry(1800, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop:     { value: new THREE.Color(C.skyTop) },
      uMid:     { value: new THREE.Color(C.skyMid) },
      uHorizon: { value: new THREE.Color(C.horizon) },
      uSunDir:  { value: new THREE.Vector3(-0.5, 0.75, 0.45).normalize() },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uTop, uMid, uHorizon, uSunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        // 수평선 근처를 넓고 환하게 — pow 커브로 지브리 하늘의 색 배분
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
        col = mix(col, uTop, smoothstep(0.18, 0.75, h));
        // 지평선 아래도 수평선색으로 (바다 너머 안개와 이어지게)
        col = mix(uHorizon, col, smoothstep(-0.12, 0.0, vDir.y));
        // 태양 방향 은은한 번짐
        float sun = pow(max(dot(normalize(vDir), uSunDir), 0.0), 24.0);
        col += vec3(1.0, 0.95, 0.8) * sun * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;

  // 별 — 밤에만 서서히 떠오른다
  const rand = mulberry32(4242);
  const starCount = 420;
  const pos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.08 + rand() * 0.9; // 수평선 위쪽 반구
    const r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 1500;
    pos[i * 3 + 1] = y * 1500;
    pos[i * 3 + 2] = Math.sin(a) * r * 1500;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xfff9e8, size: 2.2, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  mesh.add(stars);

  return {
    mesh,
    setLook(top, mid, horizon, sunDir) {
      mat.uniforms.uTop.value.copy(top);
      mat.uniforms.uMid.value.copy(mid);
      mat.uniforms.uHorizon.value.copy(horizon);
      mat.uniforms.uSunDir.value.copy(sunDir);
    },
    setStars(a) { starMat.opacity = a; },
  };
}
