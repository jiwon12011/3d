// 지역 해금 — 잠긴 곳은 벽이 아니라 짙은 뭉게구름 커튼. 접근하면 부드럽게 밀려난다.
import * as THREE from 'three';
import { MeshBuilder } from '../merge.js';
import { WORLD, heightAt } from '../world/terrain.js';
import { mulberry32 } from '../noise.js';

export const REGIONS = [
  {
    key: 'forest', name: '깊은 숲 통행증', desc: '대왕나무로 가는 구름길이 열려요',
    cx: WORLD.bigTree.x, cz: WORLD.bigTree.y, r: 80, price: 100,
    openMsg: '구름이 갈라진다… 깊은 숲이 열렸어요! 대왕나무가 기다려요 ✨',
  },
  {
    key: 'peak', name: '설산 통행증', desc: '눈 덮인 봉우리로 가는 길이 열려요',
    cx: WORLD.snowPeak.x, cz: WORLD.snowPeak.y, r: 125, price: 250,
    openMsg: '구름이 걷히자 새하얀 봉우리가 — 설산이 열렸어요! ❄️',
  },
];

export function createRegions(scene, save, hud, sfx, controls) {
  const states = new Map(); // key → { def, curtain, fade, unlocking }
  const locked = (key) => !save.state.regions[key];

  function buildCurtain(def, seed) {
    const b = new MeshBuilder();
    const rand = mulberry32(seed);
    const n = Math.round(def.r / 2.6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = def.cx + Math.cos(a) * def.r;
      const z = def.cz + Math.sin(a) * def.r;
      const gy = heightAt(x, z);
      for (let k = 0; k < 3; k++) {
        b.add(new THREE.SphereGeometry(7 + rand() * 8, 7, 6), 0xe9edf4, {
          x: x + (rand() - 0.5) * 10,
          y: gy + 6 + k * 9 + rand() * 4,
          z: z + (rand() - 0.5) * 10,
          sy: 0.75,
        });
      }
    }
    const m = b.build({ castShadow: false, receiveShadow: false });
    m.material.transparent = true;
    m.material.opacity = 0.92;
    return m;
  }

  REGIONS.forEach((def, i) => {
    const st = { def, curtain: null, fade: 1, unlocking: false, lastWarn: -99 };
    if (locked(def.key)) {
      st.curtain = buildCurtain(def, 777 + i * 131);
      scene.add(st.curtain);
    }
    states.set(def.key, st);
  });

  // 커튼에 다가가면 진입 방향을 바깥으로 스윽 돌려놓는다 — 가장 센 지역 하나만
  controls.setBoundary((x, z) => {
    let best = null;
    for (const def of REGIONS) {
      if (!locked(def.key)) continue;
      const dx = x - def.cx, dz = z - def.cz;
      const d = Math.hypot(dx, dz) || 1;
      if (d > def.r + 30) continue;
      const strength = Math.min(1, (def.r + 30 - d) / 30);
      if (!best || strength > best.strength) {
        best = { yaw: Math.atan2(-dx, -dz), strength }; // forward = (-sinψ, -cosψ)
      }
    }
    return best;
  });

  return {
    isUnlocked: (key) => !locked(key),
    unlock(key) {
      const st = states.get(key);
      if (!st || !locked(key)) return;
      save.state.regions[key] = true;
      save.save();
      st.unlocking = true;
      sfx.unlock();
      hud.toast(st.def.openMsg, 4500);
    },
    update(dt, t, p) {
      for (const st of states.values()) {
        const def = st.def;
        if (locked(def.key)) {
          const dx = p.x - def.cx, dz = p.z - def.cz;
          const d = Math.hypot(dx, dz) || 1;
          // 조향 유도를 뚫고 들어와도 경계 안쪽으로는 못 들어간다
          if (d < def.r - 2) {
            const s = (def.r - 2) / d;
            p.x = def.cx + dx * s;
            p.z = def.cz + dz * s;
          }
          if (d < def.r + 26 && t - st.lastWarn > 6) {
            st.lastWarn = t;
            hud.toast(`뭉게구름이 길을 막고 있어요 — 빵집에서 「${def.name}」 ✦${def.price}`);
          }
        }
        // 해금 연출: 커튼이 옅어지며 하늘로 흩어진다
        if (st.unlocking && st.curtain) {
          st.fade -= dt / 2.5;
          st.curtain.material.opacity = Math.max(0, 0.92 * st.fade);
          st.curtain.position.y += dt * 5;
          if (st.fade <= 0) {
            scene.remove(st.curtain);
            st.curtain.geometry.dispose();
            st.curtain.material.dispose();
            st.curtain = null;
            st.unlocking = false;
          }
        }
      }
    },
  };
}
