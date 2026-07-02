// 풍경 스탬프 도감 — 명소 상공을 처음 지나면 수첩에 스탬프가 찍힌다. J로 펼쳐본다.
import { WORLD } from '../world/terrain.js';

const STAMPS = [
  { key: 'tower', name: '시계탑 광장', emoji: '⏰', x: WORLD.townCenter.x, z: WORLD.townCenter.y, r: 26 },
  { key: 'windmill', name: '풍차 언덕', emoji: '🌬️', x: WORLD.windmill.x, z: WORLD.windmill.y, r: 24 },
  { key: 'lighthouse', name: '바닷가 등대', emoji: '⚓', x: WORLD.lighthouse.x, z: WORLD.lighthouse.y, r: 28 },
  { key: 'field', name: '황금 논밭', emoji: '🌾', x: WORLD.fieldCenter.x, z: WORLD.fieldCenter.y, r: 30 },
  { key: 'meadow', name: '꽃밭 언덕', emoji: '🌼', x: WORLD.meadow.x, z: WORLD.meadow.y, r: 32 },
  { key: 'cherry', name: '벚꽃 숲', emoji: '🌸', x: WORLD.cherry.x, z: WORLD.cherry.y, r: 28 },
  { key: 'autumn', name: '단풍 숲', emoji: '🍁', x: WORLD.autumn.x, z: WORLD.autumn.y, r: 34 },
  { key: 'rainbow', name: '호수 무지개', emoji: '🌈', x: WORLD.lakeCenter.x, z: WORLD.lakeCenter.y, r: 38 },
  { key: 'bigtree', name: '대왕나무', emoji: '🌳', x: WORLD.bigTree.x, z: WORLD.bigTree.y, r: 36 },
  { key: 'island', name: '외딴 섬', emoji: '🏝️', islands: true, r: 22 },
  { key: 'peak', name: '설산 정상', emoji: '❄️', x: WORLD.snowPeak.x, z: WORLD.snowPeak.y, r: 30, minY: 78 },
  { key: 'garden', name: '하늘 정원', emoji: '☁️', x: WORLD.skyGarden.x, z: WORLD.skyGarden.y, r: 30, minY: 100 },
];
const REWARD = 10, ALL_BONUS = 100;

export function createStamps(save, hud, sfx) {
  // --- 도감 UI ---
  const el = document.createElement('div');
  el.id = 'stampbook';
  el.className = 'hidden';
  document.body.appendChild(el);
  let open = false;

  function render() {
    const got = save.state.stamps;
    const count = STAMPS.filter((s) => got[s.key]).length;
    el.innerHTML = `
      <div class="shop-card">
        <div class="shop-head">
          <h2>📔 풍경 수첩</h2>
          <span class="shop-wallet">${count} / ${STAMPS.length}</span>
        </div>
        <div class="stamp-grid">
          ${STAMPS.map((s) => `
            <div class="stamp ${got[s.key] ? 'got' : ''}">
              <div class="stamp-emoji">${got[s.key] ? s.emoji : '?'}</div>
              <div class="stamp-name">${got[s.key] ? s.name : '???'}</div>
            </div>`).join('')}
        </div>
        <div class="shop-hint">명소 위를 지나면 스탬프가 찍혀요 (+${REWARD} ✦) · J / Esc로 닫기</div>
      </div>`;
  }
  function toggle(force) {
    open = force ?? !open;
    if (open) render();
    el.classList.toggle('hidden', !open);
  }
  el.addEventListener('click', (e) => { if (e.target === el) toggle(false); });
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyJ') toggle();
    else if (e.code === 'Escape' && open) toggle(false);
  });

  return {
    get isOpen() { return open; },
    update(p) {
      for (const s of STAMPS) {
        if (save.state.stamps[s.key]) continue;
        if (s.minY && p.y < s.minY) continue;
        const spots = s.islands ? WORLD.islands : [{ x: s.x, y: s.z }];
        if (!spots.some((c) => Math.hypot(p.x - c.x, p.z - c.y) < s.r)) continue;
        save.state.stamps[s.key] = true;
        save.state.candies += REWARD;
        hud.setCandies(save.state.candies);
        hud.toast(`스탬프 획득! ${s.emoji} ${s.name}  (+${REWARD} ✦)`);
        sfx.stamp();
        if (!save.state.stampBonus && STAMPS.every((st) => save.state.stamps[st.key])) {
          save.state.stampBonus = true;
          save.state.candies += ALL_BONUS;
          hud.setCandies(save.state.candies);
          setTimeout(() => hud.toast(`수첩 완성!! 🎉 보너스 +${ALL_BONUS} ✦`, 5000), 2600);
          sfx.unlock();
        }
        save.save();
        if (open) render();
      }
    },
  };
}
