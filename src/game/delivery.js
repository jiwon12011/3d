// 배달 퀘스트 — 빵집에서 소포를 받아 마을 사람에게 전한다 (키키의 본업!)
// 대상에겐 빛기둥이 서고, 빗자루엔 소포가 매달린다. 5번마다 아주머니의 선물.
import * as THREE from 'three';
import { toon } from '../palette.js';
import { C } from '../palette.js';
import { WORLD, heightAt } from '../world/terrain.js';

const TARGETS = [
  { key: 'farmer', hint: '논밭' },
  { key: 'keeper', hint: '등대' },
  { key: 'busKid', hint: '버스 정류장' },
  { key: 'flowerGirl', hint: '꽃밭 언덕' },
];
const GIFT_EVERY = 5;

export function createDelivery(npcs, save, hud, sfx, rider) {
  const group = new THREE.Group();

  // 대상 위의 빛기둥
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.8, 46, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffe9a8, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  pillar.visible = false;
  group.add(pillar);

  // 빗자루 솔에 매달린 소포 (리본 십자 포장)
  const parcel = new THREE.Group();
  parcel.position.set(0, -0.42, 1.55);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), toon(0xe8d5b5));
  box.castShadow = true;
  parcel.add(box);
  parcel.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.09), toon(C.ribbon)));
  parcel.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.36, 0.44), toon(C.ribbon)));
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 4), toon(0x6b5a48));
  string.position.y = 0.3;
  parcel.add(string);
  parcel.visible = false;
  rider.group.add(parcel);

  const active = () => save.state.delivery?.target || null;

  function setTarget(key) {
    save.state.delivery = { target: key };
    save.save();
    syncVisual();
  }
  function syncVisual() {
    const key = active();
    parcel.visible = !!key;
    pillar.visible = !!key;
    if (key) {
      const npc = npcs.byKey(key);
      pillar.position.set(npc.x, npc.y + 23, npc.z);
    }
  }
  syncVisual(); // 저장된 배달이 있으면 이어서

  function start() {
    const prev = active();
    const pool = TARGETS.filter((c) => c.key !== prev);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTarget(pick.key);
    const npc = npcs.byKey(pick.key);
    hud.toast(`🧺 배달 부탁! ${npc.name}에게 소포를 — ${pick.hint} 쪽 빛기둥을 찾아요`, 4500);
    sfx.bell();
  }

  function complete(npc) {
    const b = WORLD.bakery;
    const reward = 12 + Math.round(Math.hypot(npc.x - b.x, npc.z - b.y) / 12);
    save.state.delivery = { target: null };
    save.state.deliveries += 1;
    save.state.candies += reward;
    hud.setCandies(save.state.candies);
    hud.floatPlus(reward);
    npcs.say(npc.key, '고마워요, 착한 마녀님! ✦', 3.5);
    hud.toast(`배달 완료! +${reward} ✦  (총 ${save.state.deliveries}번)`);
    sfx.stamp();
    // 5번마다 아주머니의 선물
    if (save.state.deliveries % GIFT_EVERY === 0) {
      const owned = save.state.cosmetics.owned.ribbon;
      if (!owned.includes('gold')) {
        owned.push('gold');
        setTimeout(() => hud.toast('빵집 아주머니의 선물: ✨ 금빛 리본! (상점에서 착용)', 5000), 2800);
      } else {
        save.state.candies += 50;
        hud.setCandies(save.state.candies);
        setTimeout(() => hud.toast('빵집 아주머니의 선물: +50 ✦ 🎁', 4000), 2800);
      }
      sfx.unlock();
    }
    save.save();
    syncVisual();
  }

  return {
    group,
    start,
    get active() { return !!active(); },
    get targetName() { return active() ? npcs.byKey(active()).name : ''; },
    update(dt, t, p) {
      const key = active();
      if (!key) return;
      pillar.material.opacity = 0.13 + Math.sin(t * 2.5) * 0.05;
      pillar.rotation.y = t * 0.4;
      const npc = npcs.byKey(key);
      if (Math.hypot(p.x - npc.x, p.z - npc.z) < 13 && p.y < npc.y + 15) complete(npc);
    },
  };
}
