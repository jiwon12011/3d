// 마을 빵집 — 상점. 지붕 근처로 저공 진입하면 착륙해서 열린다 (키키의 빵집 오마주).
import * as THREE from 'three';
import { C } from '../palette.js';
import { MeshBuilder, prismGeometry } from '../merge.js';
import { WORLD, heightAt } from '../world/terrain.js';
import { REGIONS } from './regions.js';

const RIBBONS = [
  ['red', '빨강 (기본)', 0xd43d3d, 0],
  ['yellow', '노랑', 0xf2b134, 20],
  ['sky', '하늘', 0x6db3e8, 20],
  ['violet', '보라', 0x9b8ce0, 20],
  ['pink', '분홍', 0xf28ab0, 20],
  ['green', '초록', 0x66b34c, 20],
  ['gold', '금빛 (배달 5번 선물)', 0xf2c14e, 0, true], // hidden — 선물로만 획득
];
const DRESSES = [
  ['navy', '감색 (기본)', 0x2e2a3d, 0],
  ['wine', '와인', 0x6b2d3e, 40],
  ['forest', '포레스트', 0x2c4a3b, 40],
  ['midnight', '네이비', 0x22314e, 40],
];
const SPEED_PRICES = [30, 80, 150];
const BOOST_PRICES = [50, 120];
const ENTER_R = 10, LEAVE_R = 16;

function buildBakery(scene) {
  const { x, y: z } = WORLD.bakery;
  const y = heightAt(x, z) - 0.3;
  // 문이 시계탑 쪽을 보게
  const ry = Math.atan2(WORLD.townCenter.x - x, WORLD.townCenter.y - z);
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const local = (lx, ly, lz) => ({ x: x + lx * cos + lz * sin, y: y + ly, z: z - lx * sin + lz * cos, ry });
  const WOOD = 0x8a6349, BRICK = 0xa9604e, CREAM = 0xfdf6e3, BREAD = 0xd9a05b, CRUST = 0xb9793f;

  const b = new MeshBuilder();
  // 본체 + 지붕
  b.add(new THREE.BoxGeometry(9, 4.8, 7.5), C.wall1, local(0, 2.4, 0));
  b.add(prismGeometry(10.4, 3.0, 8.6), C.roof2, local(0, 4.8, 0));
  // 벽돌 굴뚝 (용마루 중앙) — town.js가 여기서 빵 굽는 연기를 피운다
  b.add(new THREE.BoxGeometry(1.2, 2.8, 1.2), BRICK, local(0, 7.4, 0));
  b.add(new THREE.BoxGeometry(1.5, 0.4, 1.5), 0x8f4f40, local(0, 8.9, 0));
  // 정면 목골조: 모서리 기둥 + 상인방
  for (const lx of [-4.4, 4.4]) b.add(new THREE.BoxGeometry(0.28, 4.8, 0.28), WOOD, local(lx, 2.4, 3.68));
  b.add(new THREE.BoxGeometry(9.05, 0.3, 0.3), WOOD, local(0, 4.62, 3.68));

  // 대형 진열창 (왼쪽) — 따뜻한 불빛 + 나무 창틀 + 창살
  b.add(new THREE.BoxGeometry(3.8, 2.0, 0.18), C.windowLit, local(-1.7, 2.0, 3.8));
  b.add(new THREE.BoxGeometry(4.1, 0.16, 0.26), WOOD, local(-1.7, 3.05, 3.82)); // 위 틀
  b.add(new THREE.BoxGeometry(4.1, 0.16, 0.26), WOOD, local(-1.7, 0.95, 3.82)); // 아래 틀
  for (const wx of [-3.55, 0.15]) b.add(new THREE.BoxGeometry(0.16, 2.1, 0.26), WOOD, local(wx, 2.0, 3.82));
  b.add(new THREE.BoxGeometry(0.09, 2.0, 0.2), WOOD, local(-1.7, 2.0, 3.84)); // 세로 창살
  b.add(new THREE.BoxGeometry(3.8, 0.09, 0.2), WOOD, local(-1.7, 2.1, 3.84)); // 가로 창살
  // 진열창 앞 선반 위의 빵들 — 식빵·바게트·도넛
  b.add(new THREE.BoxGeometry(4.2, 0.16, 0.7), WOOD, local(-1.7, 0.98, 4.2));
  b.add(new THREE.SphereGeometry(0.3, 8, 6), BREAD, { ...local(-2.9, 1.25, 4.2), sx: 1.2, sy: 0.85, sz: 0.9 });
  b.add(new THREE.CapsuleGeometry(0.16, 0.9, 4, 7), CRUST, { ...local(-1.6, 1.18, 4.2), rz: Math.PI / 2, ry: ry + 0.4 });
  b.add(new THREE.TorusGeometry(0.2, 0.1, 6, 10), BREAD, { ...local(-0.5, 1.16, 4.25), rx: -Math.PI / 2, ry: 0 });

  // 문 (오른쪽) — 위가 둥근 나무문 + 동그란 창 + 손잡이
  b.add(new THREE.BoxGeometry(1.6, 2.4, 0.18), C.trunk, local(2.6, 1.2, 3.8));
  b.add(new THREE.CircleGeometry(0.8, 14, 0, Math.PI), C.trunk, local(2.6, 2.4, 3.9));
  b.add(new THREE.CircleGeometry(0.3, 10), C.windowLit, local(2.6, 2.35, 3.92));
  b.add(new THREE.SphereGeometry(0.07, 6, 5), 0xd9b36c, local(3.2, 1.25, 3.92));

  // 빨강·크림 줄무늬 차양 — 정면 전체를 덮는다
  const awning = new THREE.BoxGeometry(0.82, 0.09, 1.7);
  awning.rotateX(0.48);
  for (let i = 0; i < 10; i++) {
    b.add(awning, i % 2 === 0 ? C.roof1 : 0xf7f0e0, local(-3.69 + i * 0.82, 3.35, 4.25));
  }
  // 간판: 크림색 보드 + 나무 테두리 + 황금 프레첼과 빵 엠블럼
  b.add(new THREE.BoxGeometry(4.6, 0.95, 0.14), CREAM, local(0, 4.1, 3.86));
  for (const dy of [-0.52, 0.52]) b.add(new THREE.BoxGeometry(4.7, 0.1, 0.18), WOOD, local(0, 4.1 + dy, 3.86));
  b.add(new THREE.TorusGeometry(0.3, 0.12, 6, 12), 0xe8b23a, local(0, 4.1, 3.98));
  b.add(new THREE.SphereGeometry(0.16, 7, 6), BREAD, { ...local(-0.85, 4.05, 3.96), sx: 1.4 });
  b.add(new THREE.SphereGeometry(0.16, 7, 6), CRUST, { ...local(0.85, 4.05, 3.96), sx: 1.4 });

  // 옆벽 창 + 꽃 화단
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.18, 1.2, 1.2), C.windowLit, local(s * 4.56, 2.3, s * 0.9));
    b.add(new THREE.BoxGeometry(0.34, 0.3, 1.4), 0x5e8c4a, local(s * 4.6, 1.55, s * 0.9));
    for (let f = 0; f < 4; f++) {
      b.add(new THREE.SphereGeometry(0.09, 6, 5), f % 2 ? 0xf28ab0 : 0xfdf6e3,
        local(s * 4.62, 1.78, s * 0.9 - 0.48 + f * 0.32));
    }
  }

  // 문 앞: 착륙 매트 + 밀가루 통·포대
  b.add(new THREE.BoxGeometry(5, 0.14, 3.8), C.straw, local(1, 0.38, 6));
  b.add(new THREE.CylinderGeometry(0.45, 0.5, 0.95, 9), WOOD, local(4.3, 0.75, 4.7));
  b.add(new THREE.SphereGeometry(0.42, 8, 6), 0xe8dcc4, { ...local(4.9, 0.6, 5.6), sy: 0.8 });
  scene.add(b.build());
}

export function createShop(scene, save, hud, sfx, controls, rider, regions, delivery) {
  buildBakery(scene);
  const bx = WORLD.bakery.x, bz = WORLD.bakery.y;
  const gy = heightAt(bx, bz);

  // --- 효과 적용 (시작 시 + 구매 시) ---
  function applyEffects() {
    const u = save.state.upgrades;
    controls.setSpeeds(12 + u.speed * 2, 30 + [0, 6, 12][u.boost]);
    const cs = save.state.cosmetics;
    rider.setRibbonColor(RIBBONS.find((r) => r[0] === cs.ribbon)[2]);
    rider.setDressColor(DRESSES.find((d) => d[0] === cs.dress)[2]);
  }
  applyEffects();

  // --- UI ---
  const el = document.createElement('div');
  el.id = 'shop';
  el.className = 'hidden';
  document.body.appendChild(el);
  let open = false, armed = true;

  const swatches = (list, kind) => {
    const cs = save.state.cosmetics;
    return `<div class="shop-sws">` + list.map(([key, name, hex, price, hidden]) => {
      const owned = cs.owned[kind].includes(key);
      if (hidden && !owned) return ''; // 선물 전용 색은 받기 전엔 비밀
      const eq = cs[kind] === key;
      return `<button class="sw ${owned ? 'own' : ''} ${eq ? 'eq' : ''}" data-act="${kind}" data-k="${key}"
        style="background:#${hex.toString(16).padStart(6, '0')}"
        title="${name}${owned ? '' : ` — ✦${price}`}"></button>`;
    }).join('') + `</div>`;
  };

  function render() {
    const s = save.state, u = s.upgrades;
    const upgradeRow = (act, name, desc, tier, max, prices) => `
      <div class="shop-row">
        <div><span class="nm">${name}</span><span class="ds">${desc} (${tier}/${max})</span></div>
        ${tier >= max
          ? `<button class="shop-buy done">완료</button>`
          : `<button class="shop-buy" data-act="${act}">✦ ${prices[tier]}</button>`}
      </div>`;
    el.innerHTML = `
      <div class="shop-card">
        <div class="shop-head">
          <h2>🍞 언덕 위 빵집</h2>
          <span class="shop-wallet">✦ ${s.candies}</span>
        </div>
        ${upgradeRow('speed', '빗자루 손질', '기본 속도가 빨라져요', u.speed, 3, SPEED_PRICES)}
        ${upgradeRow('boost', '부스트 강화', '슝— 이 더 시원해져요', u.boost, 2, BOOST_PRICES)}
        <div class="shop-row">
          <div><span class="nm">리본 염색</span><span class="ds">머리 리본 색을 바꿔요 — ✦20</span></div>
          ${swatches(RIBBONS, 'ribbon')}
        </div>
        <div class="shop-row">
          <div><span class="nm">원피스 염색</span><span class="ds">원피스 색을 바꿔요 — ✦40</span></div>
          ${swatches(DRESSES, 'dress')}
        </div>
        ${REGIONS.map((rg) => `
        <div class="shop-row">
          <div><span class="nm">${rg.name}</span><span class="ds">${rg.desc}</span></div>
          ${regions.isUnlocked(rg.key)
            ? `<button class="shop-buy done">해금됨</button>`
            : `<button class="shop-buy" data-act="pass" data-k="${rg.key}">✦ ${rg.price}</button>`}
        </div>`).join('')}
        <div class="shop-row">
          <div><span class="nm">🧺 배달 부탁</span><span class="ds">${delivery.active
            ? `배달 중 — ${delivery.targetName}에게! (빛기둥을 따라가요)`
            : `소포를 전해주면 사례할게요 (지금까지 ${save.state.deliveries}번)`}</span></div>
          ${delivery.active
            ? `<button class="shop-buy done">배달 중</button>`
            : `<button class="shop-buy" data-act="delivery">받기</button>`}
        </div>
        <div class="shop-hint">Esc / B / 화면 밖 클릭으로 닫고 다시 날아올라요 ✦</div>
      </div>`;
  }

  function pay(price) {
    if (save.state.candies >= price) {
      save.state.candies -= price;
      save.save();
      hud.setCandies(save.state.candies);
      return true;
    }
    sfx.deny();
    hud.toast('별사탕이 부족해요 — 하늘에 더 반짝이고 있어요 ✦');
    return false;
  }

  el.addEventListener('click', (e) => {
    if (e.target === el) { close(); return; } // 카드 밖 클릭 → 닫기
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const s = save.state;
    if (act === 'speed' && s.upgrades.speed < 3 && pay(SPEED_PRICES[s.upgrades.speed])) {
      s.upgrades.speed++; sfx.buy();
    } else if (act === 'boost' && s.upgrades.boost < 2 && pay(BOOST_PRICES[s.upgrades.boost])) {
      s.upgrades.boost++; sfx.buy();
    } else if (act === 'ribbon' || act === 'dress') {
      const list = act === 'ribbon' ? RIBBONS : DRESSES;
      const [key, , , price] = list.find((it) => it[0] === btn.dataset.k);
      const owned = s.cosmetics.owned[act];
      if (owned.includes(key)) {
        s.cosmetics[act] = key; sfx.bell();
      } else if (pay(price)) {
        owned.push(key); s.cosmetics[act] = key; sfx.buy();
      }
    } else if (act === 'pass') {
      const rg = REGIONS.find((r) => r.key === btn.dataset.k);
      if (rg && !regions.isUnlocked(rg.key) && pay(rg.price)) regions.unlock(rg.key);
    } else if (act === 'delivery' && !delivery.active) {
      delivery.start();
    }
    save.save();
    applyEffects();
    render();
  });

  addEventListener('keydown', (e) => {
    if (open && (e.code === 'Escape' || e.code === 'KeyB')) close();
  });

  function openShop() {
    open = true;
    render();
    el.classList.remove('hidden');
    sfx.bell();
  }
  function close() {
    open = false;
    armed = false; // 반경을 벗어나야 다시 열린다
    el.classList.add('hidden');
  }

  return {
    get isOpen() { return open; },
    update(p) {
      if (open) return;
      const d = Math.hypot(p.x - bx, p.z - bz);
      if (!armed) { if (d > LEAVE_R) armed = true; return; }
      if (d < ENTER_R && p.y < gy + 8) openShop();
    },
  };
}
