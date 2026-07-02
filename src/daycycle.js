// 낮 → 노을 → 밤 → 새벽이 흐르는 시간 사이클.
// 키프레임 팔레트를 보간해 하늘·태양·안개·구름·물·불빛을 한 번에 물들인다.
import * as THREE from 'three';

const c = (hex) => new THREE.Color(hex);

// t: 0=자정, 0.5=정오
const KEYFRAMES = [
  { t: 0.00, skyTop: c(0x0e1a38), skyMid: c(0x1d2f58), horizon: c(0x3c5075), sun: c(0xbdd0f2), sunI: 0.55, hemiSky: c(0x40538a), hemiGround: c(0x2e3c55), hemiI: 0.55, cloud: c(0x67789e), water: c(0x2e4d70), elev: 0.55, stars: 1, glow: 1 },
  { t: 0.17, skyTop: c(0x0e1a38), skyMid: c(0x1d2f58), horizon: c(0x3c5075), sun: c(0xbdd0f2), sunI: 0.55, hemiSky: c(0x40538a), hemiGround: c(0x2e3c55), hemiI: 0.55, cloud: c(0x67789e), water: c(0x2e4d70), elev: 0.5, stars: 1, glow: 1 },
  { t: 0.25, skyTop: c(0x3a5a9e), skyMid: c(0xd98da0), horizon: c(0xffd9b2), sun: c(0xffd2a2), sunI: 1.05, hemiSky: c(0x9d9fc9), hemiGround: c(0x8f9070), hemiI: 0.75, cloud: c(0xf7d9c9), water: c(0x557fa8), elev: 0.18, stars: 0.15, glow: 0.35 },
  { t: 0.34, skyTop: c(0x3d7edb), skyMid: c(0x7ec3ea), horizon: c(0xdff3f5), sun: c(0xfff4d6), sunI: 1.6, hemiSky: c(0xbfd9ff), hemiGround: c(0x9bc47a), hemiI: 0.9, cloud: c(0xffffff), water: c(0x4aa8c9), elev: 0.75, stars: 0, glow: 0 },
  { t: 0.70, skyTop: c(0x3d7edb), skyMid: c(0x7ec3ea), horizon: c(0xdff3f5), sun: c(0xfff4d6), sunI: 1.6, hemiSky: c(0xbfd9ff), hemiGround: c(0x9bc47a), hemiI: 0.9, cloud: c(0xffffff), water: c(0x4aa8c9), elev: 0.75, stars: 0, glow: 0 },
  { t: 0.80, skyTop: c(0x46549b), skyMid: c(0xe8926f), horizon: c(0xffc98d), sun: c(0xffab66), sunI: 1.15, hemiSky: c(0x8d84bd), hemiGround: c(0xa8845f), hemiI: 0.7, cloud: c(0xffd9b8), water: c(0x5f83b0), elev: 0.13, stars: 0.1, glow: 0.45 },
  { t: 0.90, skyTop: c(0x0e1a38), skyMid: c(0x1d2f58), horizon: c(0x3c5075), sun: c(0xbdd0f2), sunI: 0.55, hemiSky: c(0x40538a), hemiGround: c(0x2e3c55), hemiI: 0.55, cloud: c(0x67789e), water: c(0x2e4d70), elev: 0.55, stars: 1, glow: 1 },
];

// 태양의 수평 방위 (고도만 시간에 따라 변한다)
const AZIMUTH = new THREE.Vector2(-0.742, 0.671);

export function createDayCycle() {
  const out = {
    skyTop: new THREE.Color(), skyMid: new THREE.Color(), horizon: new THREE.Color(),
    sun: new THREE.Color(), hemiSky: new THREE.Color(), hemiGround: new THREE.Color(),
    cloud: new THREE.Color(), water: new THREE.Color(),
    sunDir: new THREE.Vector3(),
    sunI: 1, hemiI: 1, stars: 0, glow: 0,
  };

  return {
    // tau: 0..1 (0=자정, 0.5=정오)
    sample(tau) {
      tau = ((tau % 1) + 1) % 1;
      let a = KEYFRAMES[KEYFRAMES.length - 1], b = KEYFRAMES[0], span = 1;
      for (let i = 0; i < KEYFRAMES.length; i++) {
        const k0 = KEYFRAMES[i];
        const k1 = KEYFRAMES[(i + 1) % KEYFRAMES.length];
        const t1 = k1.t <= k0.t ? k1.t + 1 : k1.t;
        if (tau >= k0.t && tau < t1) { a = k0; b = k1; span = t1 - k0.t; break; }
      }
      let u = (tau - a.t) / span;
      u = u * u * (3 - 2 * u);
      out.skyTop.lerpColors(a.skyTop, b.skyTop, u);
      out.skyMid.lerpColors(a.skyMid, b.skyMid, u);
      out.horizon.lerpColors(a.horizon, b.horizon, u);
      out.sun.lerpColors(a.sun, b.sun, u);
      out.hemiSky.lerpColors(a.hemiSky, b.hemiSky, u);
      out.hemiGround.lerpColors(a.hemiGround, b.hemiGround, u);
      out.cloud.lerpColors(a.cloud, b.cloud, u);
      out.water.lerpColors(a.water, b.water, u);
      out.sunI = a.sunI + (b.sunI - a.sunI) * u;
      out.hemiI = a.hemiI + (b.hemiI - a.hemiI) * u;
      out.stars = a.stars + (b.stars - a.stars) * u;
      out.glow = a.glow + (b.glow - a.glow) * u;
      const elev = a.elev + (b.elev - a.elev) * u;
      const horiz = Math.sqrt(Math.max(0, 1 - elev * elev));
      out.sunDir.set(AZIMUTH.x * horiz, elev, AZIMUTH.y * horiz);
      return out;
    },
  };
}
