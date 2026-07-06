// 소녀의 일기 — 퀘스트 목록 대신 일기장. I 키로 펼친다.
// 지금 막(幕)과 오늘의 목표, 지나간 대화가 전부 여기 남는다.
const CSS = /* css */`
  #diary {
    position: fixed; inset: 0; z-index: 8;
    display: flex; align-items: center; justify-content: center;
    background: rgba(60, 50, 40, 0.22);
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  }
  #diary.hidden { display: none; }
  .diary-act {
    font-size: 0.78rem; font-weight: 800; letter-spacing: 0.3em; color: #b98a2f;
    margin-bottom: 0.15rem;
  }
  .diary-goal {
    background: rgba(255, 255, 255, 0.6); border: 1px dashed #d8cdb8; border-radius: 12px;
    padding: 0.6rem 0.9rem; margin: 0.55rem 0 0.8rem; font-weight: 700; font-size: 0.95rem;
    line-height: 1.5; color: #4a4238;
  }
  .diary-log { border-top: 1px dashed #dcd2bc; padding-top: 0.6rem; }
  .diary-log h3 { font-size: 0.78rem; letter-spacing: 0.2em; color: #9a8f7e; margin-bottom: 0.45rem; }
  .diary-line { font-size: 0.88rem; line-height: 1.65; color: #5a5142; }
  .diary-line b { color: #3d5a80; font-size: 0.76rem; letter-spacing: 0.1em; margin-right: 0.35rem; }
  .diary-line b.jiji { color: #7a5a9e; }
  .diary-line b.letter { color: #b98a2f; }
  .diary-empty { font-size: 0.85rem; color: #9a8f7e; }
`;

const WHO_LABEL = { girl: ['나', ''], jiji: ['지지', 'jiji'], letter: ['편지', 'letter'] };

export function createDiary(save) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'diary';
  el.className = 'hidden';
  document.body.appendChild(el);
  let open = false;
  let story = null; // bind()로 나중에 연결

  function render() {
    const log = save.state.story.log;
    el.innerHTML = `
      <div class="shop-card">
        <div class="shop-head">
          <h2>📖 소녀의 일기</h2>
          <span class="diary-act">${story ? story.actLabel() : ''}</span>
        </div>
        <div class="diary-goal">✎ ${story ? story.objective() : '…'}</div>
        <div class="diary-log">
          <h3>— 지난 이야기 —</h3>
          ${log.length === 0
            ? `<div class="diary-empty">아직 아무 일도 일어나지 않았다. 바람이 좋다.</div>`
            : log.slice(-28).map(([who, text]) => {
                const [label, cls] = WHO_LABEL[who] || WHO_LABEL.girl;
                return `<div class="diary-line"><b class="${cls}">${label}</b>${text}</div>`;
              }).join('')}
        </div>
        <div class="shop-hint">I / Esc로 덮는다 ✦</div>
      </div>`;
  }

  function toggle(force) {
    open = force ?? !open;
    if (open) render();
    el.classList.toggle('hidden', !open);
  }
  el.addEventListener('click', (e) => { if (e.target === el) toggle(false); });
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyI') toggle();
    else if (e.code === 'Escape' && open) toggle(false);
  });

  return {
    get isOpen() { return open; },
    bind(s) { story = s; },
  };
}
