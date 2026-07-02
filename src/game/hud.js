// 인게임 UI — 별사탕 카운터, 토스트, 상점 카드의 스타일까지 여기서 주입
const CSS = /* css */`
  #hud-candy {
    position: fixed; top: 16px; right: 18px; z-index: 5;
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    background: rgba(250, 246, 234, 0.88); border: 1px solid #d8cdb8; border-bottom-width: 3px;
    border-radius: 12px; padding: 0.38rem 0.9rem;
    font-weight: 800; font-size: 1.05rem; letter-spacing: 0.06em; color: #b98a2f;
    transition: transform 0.14s ease; user-select: none; pointer-events: none;
  }
  #hud-candy.pop { transform: scale(1.18); }
  .hud-plus {
    position: fixed; top: 54px; right: 28px; z-index: 5; pointer-events: none;
    font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif;
    font-weight: 800; color: #e8b23a; text-shadow: 0 1px 0 rgba(255,255,255,0.7);
    animation: hudplus 0.9s ease-out forwards;
  }
  @keyframes hudplus { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-28px); } }
  #hud-toast {
    position: fixed; left: 50%; bottom: 9%; transform: translateX(-50%); z-index: 6;
    font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif;
    background: rgba(250, 246, 234, 0.92); border: 1px solid #d8cdb8; border-bottom-width: 3px;
    border-radius: 14px; padding: 0.55rem 1.1rem; color: #4a4238; font-size: 0.95rem;
    opacity: 0; transition: opacity 0.35s ease; pointer-events: none; text-align: center;
    max-width: 86vw;
  }
  #hud-toast.show { opacity: 1; }

  #shop {
    position: fixed; inset: 0; z-index: 8;
    display: flex; align-items: center; justify-content: center;
    background: rgba(60, 50, 40, 0.22);
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  }
  #shop.hidden { display: none; }
  .shop-card {
    width: min(440px, 92vw); max-height: 84vh; overflow: auto;
    background: linear-gradient(180deg, #faf6ea, #f0ecda);
    border: 1px solid #d8cdb8; border-bottom-width: 4px; border-radius: 18px;
    padding: 1.2rem 1.4rem 1.05rem; color: #4a4238;
    box-shadow: 0 18px 50px rgba(40, 30, 20, 0.28);
  }
  .shop-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; }
  .shop-head h2 { font-size: 1.25rem; color: #3d5a80; letter-spacing: 0.12em; }
  .shop-wallet { font-weight: 800; color: #b98a2f; font-size: 1.05rem; }
  .shop-row {
    display: flex; align-items: center; justify-content: space-between; gap: 0.8rem;
    padding: 0.68rem 0.1rem; border-bottom: 1px dashed #dcd2bc;
  }
  .shop-row .nm { font-weight: 700; font-size: 0.97rem; }
  .shop-row .ds { display: block; font-size: 0.78rem; color: #8a7f6e; margin-top: 0.12rem; }
  .shop-buy {
    background: #fff; border: 1px solid #d8cdb8; border-bottom-width: 3px; border-radius: 10px;
    padding: 0.32rem 0.72rem; font-weight: 700; color: #b98a2f; cursor: pointer;
    font-family: inherit; font-size: 0.9rem; white-space: nowrap;
  }
  .shop-buy:active { transform: translateY(1px); }
  .shop-buy.done { color: #7a9a6a; cursor: default; }
  .shop-sws { display: flex; gap: 0.42rem; flex-wrap: wrap; justify-content: flex-end; }
  .sw {
    width: 27px; height: 27px; border-radius: 50%; cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.85); box-shadow: 0 0 0 1px #c9bda0;
    opacity: 0.5; padding: 0;
  }
  .sw.own { opacity: 1; }
  .sw.eq { box-shadow: 0 0 0 3px #e8b23a; opacity: 1; }
  .shop-hint { font-size: 0.75rem; color: #9a8f7e; margin-top: 0.85rem; text-align: center; }

  #stampbook {
    position: fixed; inset: 0; z-index: 8;
    display: flex; align-items: center; justify-content: center;
    background: rgba(60, 50, 40, 0.22);
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  }
  #stampbook.hidden { display: none; }
  .stamp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.55rem; margin-top: 0.5rem; }
  .stamp {
    display: flex; flex-direction: column; align-items: center; gap: 0.18rem;
    padding: 0.55rem 0.2rem; border-radius: 12px;
    background: rgba(255, 255, 255, 0.45); border: 1px dashed #d8cdb8;
    opacity: 0.55;
  }
  .stamp.got { opacity: 1; border-style: solid; background: #fff; box-shadow: 0 2px 0 #e3d9c2; }
  .stamp-emoji { font-size: 1.5rem; }
  .stamp-name { font-size: 0.68rem; color: #6d6354; font-weight: 600; text-align: center; }

  #npc-bubble {
    position: fixed; z-index: 6; transform: translate(-50%, -100%);
    font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif;
    background: rgba(253, 250, 240, 0.95); border: 1.5px solid #cfc3a8;
    border-radius: 14px; border-bottom-left-radius: 3px;
    padding: 0.4rem 0.8rem; font-size: 0.88rem; color: #4a4238; font-weight: 600;
    pointer-events: none; white-space: nowrap;
    box-shadow: 0 3px 10px rgba(60, 45, 30, 0.15);
  }
  #npc-bubble.hidden { display: none; }

  body.photo-mode #hud-candy, body.photo-mode #hud-toast, body.photo-mode #npc-bubble { display: none; }
  #photo-hint {
    position: fixed; left: 50%; bottom: 4%; transform: translateX(-50%); z-index: 9;
    font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif;
    background: rgba(30, 26, 20, 0.55); color: #f5efdf; font-size: 0.85rem;
    border-radius: 12px; padding: 0.5rem 1.1rem; pointer-events: none; letter-spacing: 0.03em;
  }
  #photo-hint.hidden { display: none; }
`;

export function createHud() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const counter = document.createElement('div');
  counter.id = 'hud-candy';
  document.body.appendChild(counter);

  const toastEl = document.createElement('div');
  toastEl.id = 'hud-toast';
  document.body.appendChild(toastEl);

  let popTimer = 0, toastTimer = 0;

  return {
    setCandies(n) {
      counter.textContent = `✦ ${n}`;
      counter.classList.add('pop');
      clearTimeout(popTimer);
      popTimer = setTimeout(() => counter.classList.remove('pop'), 150);
    },
    floatPlus(v) {
      const el = document.createElement('div');
      el.className = 'hud-plus';
      el.textContent = `+${v}`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 950);
    },
    toast(msg, dur = 3200) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur);
    },
  };
}
