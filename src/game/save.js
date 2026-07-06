// localStorage 저장 — 픽업/구매/해금 때마다 즉시 저장
const KEY = 'broom-girl-save';

const DEFAULTS = {
  v: 1,
  candies: 0,
  upgrades: { speed: 0, boost: 0 },
  cosmetics: {
    ribbon: 'red', dress: 'navy',
    owned: { ribbon: ['red'], dress: ['navy'] },
  },
  regions: { forest: false, peak: false },
  stamps: {},
  stampBonus: false,
  deliveries: 0,
  delivery: { target: null },
  // 스토리 「도시 편」 — 막, 초대장, 도시 배달 수, 들꽃 발견, 진행 중인 배달, 대화 로그
  story: { act: 0, invited: false, cityDeliveries: 0, flower: false, job: null, lastJob: null, log: [] },
};

// 저장본에 없는 새 필드는 기본값으로 채운다 (버전 업 대비)
function merge(base, over) {
  for (const k in over) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k])) {
      merge(base[k] ?? (base[k] = {}), over[k]);
    } else {
      base[k] = over[k];
    }
  }
  return base;
}

export function createSave() {
  let loaded = null;
  try { loaded = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* 손상된 저장은 버림 */ }
  const state = merge(structuredClone(DEFAULTS), loaded || {});
  return {
    state,
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 시크릿 모드 등 */ }
    },
  };
}
