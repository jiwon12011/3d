// 비행 물리 — 빗자루는 멈추지 않는다. 스윽 미끄러지는 관성이 생명.
import * as THREE from 'three';
import { heightAt } from '../world/terrain.js';

const BASE_SPEED = 12;
const BOOST_SPEED = 30;
const MAX_PITCH = 0.72;   // ±41°
const TURN_RATE = 1.25;
const MAX_BANK = 0.6;     // 선회 시 기울기 35°
const MIN_CLEARANCE = 1.6;
const MAX_ALT = 150;
const SOFT_EDGE = 440;    // 이 반경을 넘으면 안쪽으로 유도 (앞바다 섬까지는 갈 수 있게)

export function createControls(playerGroup) {
  const keys = new Set();
  addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  let yaw = 0.67, pitch = 0, bank = 0, speed = BASE_SPEED;
  // 마우스/터치 드래그용 아날로그 입력 (-1..1) — 키 입력과 합산
  const analog = { turn: 0, climb: 0, boost: false };
  playerGroup.rotation.order = 'YXZ';
  playerGroup.position.set(-20, 26, 20); // 마을이 보이는 하늘에서 시작
  const forward = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  let enabled = false;

  return {
    forward,
    analog,
    get boost() { return keys.has('ShiftLeft') || keys.has('ShiftRight') || analog.boost; },
    get speedFactor() { return (speed - BASE_SPEED) / (BOOST_SPEED - BASE_SPEED); },
    get bank() { return bank; },
    enable() { enabled = true; },
    // 검증용: 위치·방향 순간이동
    setPose(x, y, z, newYaw) {
      playerGroup.position.set(x, y, z);
      if (newYaw !== undefined) yaw = newYaw;
    },

    update(dt) {
      const clamp1 = (v) => Math.max(-1, Math.min(1, v));
      const turn = clamp1(
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
        - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
        + analog.turn);
      const climb = clamp1(
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
        - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)
        + analog.climb);

      if (enabled) {
        yaw += turn * TURN_RATE * dt;
        // 입력 없으면 천천히 수평으로 복귀
        const targetPitch = climb !== 0 ? climb * MAX_PITCH : 0;
        const pitchRate = climb !== 0 ? 2.6 : 1.2;
        pitch += (targetPitch - pitch) * Math.min(1, pitchRate * dt);
      }

      // 속도 — 부스트는 exp smoothing으로 슝
      const targetSpeed = this.boost && enabled ? BOOST_SPEED : BASE_SPEED;
      speed += (targetSpeed - speed) * Math.min(1, 2.2 * dt);

      // 월드 가장자리에서 부드럽게 안쪽으로 선회 유도
      const p = playerGroup.position;
      const r = Math.hypot(p.x, p.z);
      if (r > SOFT_EDGE) {
        const desired = Math.atan2(p.x, p.z); // 중심을 향하는 yaw (forward = (-sinψ, -cosψ))
        let diff = desired - yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        yaw += diff * Math.min(1, (r - SOFT_EDGE) / 70) * dt * 1.6;
      }

      // 전진
      euler.set(pitch, yaw, 0);
      forward.set(0, 0, -1).applyEuler(euler);
      p.addScaledVector(forward, speed * dt);

      // 고도 제한: 지면 위 / 구름 위 한계
      const ground = heightAt(p.x, p.z) + MIN_CLEARANCE;
      if (p.y < ground) { p.y = ground; if (pitch < 0) pitch *= 0.5; }
      if (p.y > MAX_ALT) { p.y = MAX_ALT; if (pitch > 0) pitch *= 0.5; }

      // 뱅킹
      bank += (turn * MAX_BANK - bank) * Math.min(1, 3 * dt);

      playerGroup.rotation.set(pitch, yaw, bank);
    },
  };
}
