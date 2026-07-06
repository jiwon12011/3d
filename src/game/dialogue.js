// 미연시식 대화창 — 하단 중앙의 크림색 카드에 소녀와 지지의 대화가 한 줄씩 흐른다.
// 게임은 뒤에서 계속 흐르고 조작을 뺏지 않는다. 지나간 대사는 전부 일기장에 남는다.
const CSS = /* css */`
  #dlg {
    position: fixed; left: 50%; bottom: 5.5%; transform: translateX(-50%); z-index: 7;
    width: min(560px, 92vw);
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    background: rgba(250, 246, 234, 0.94); border: 1px solid #d8cdb8; border-bottom-width: 4px;
    border-radius: 16px; padding: 0.75rem 1.1rem 0.85rem; color: #4a4238;
    box-shadow: 0 10px 30px rgba(40, 30, 20, 0.22);
    opacity: 0; transition: opacity 0.3s ease; pointer-events: none; user-select: none;
  }
  #dlg.show { opacity: 1; pointer-events: auto; cursor: pointer; }
  #dlg .who {
    display: inline-block; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.18em;
    color: #3d5a80; background: #fff; border: 1px solid #d8cdb8; border-radius: 8px;
    padding: 0.08rem 0.5rem; margin-bottom: 0.35rem;
  }
  #dlg .who.jiji { color: #7a5a9e; }
  #dlg .who.letter { color: #b98a2f; }
  #dlg .tx { font-size: 0.98rem; line-height: 1.55; min-height: 1.55em; font-weight: 600; white-space: pre-wrap; }
  #dlg .nx {
    position: absolute; right: 0.95rem; bottom: 0.45rem; font-size: 0.72rem; color: #9a8f7e;
    animation: dlgpulse 1.6s ease-in-out infinite;
  }
  @keyframes dlgpulse { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.25; } }
  body.photo-mode #dlg { display: none; }
`;

const WHO = {
  girl: { label: '나', cls: '' },
  jiji: { label: '지지', cls: 'jiji' },
  letter: { label: '편지', cls: 'letter' },
};
const CHAR_SEC = 0.034;  // 타자기 속도
const HOLD_SEC = 3.6;    // 다 찍힌 뒤 자동 진행까지
const LOG_MAX = 60;

export function createDialogue(save, sfx) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'dlg';
  el.innerHTML = `<span class="who"></span><div class="tx"></div><div class="nx">▼ 클릭 / Space</div>`;
  document.body.appendChild(el);
  const whoEl = el.querySelector('.who');
  const txEl = el.querySelector('.tx');
  const nxEl = el.querySelector('.nx');

  let lines = [];      // [{ who, text }]
  let idx = -1;
  let shown = 0;       // 현재 줄에서 찍힌 글자 수
  let holdT = 0;
  let onDone = null;

  function pushLog(line) {
    const log = save.state.story.log;
    log.push([line.who, line.text]);
    while (log.length > LOG_MAX) log.shift();
  }

  function startLine() {
    const line = lines[idx];
    const w = WHO[line.who] || WHO.girl;
    whoEl.textContent = w.label;
    whoEl.className = `who ${w.cls}`;
    shown = 0;
    holdT = 0;
    txEl.textContent = '';
    nxEl.style.visibility = 'hidden';
    pushLog(line);
  }

  function finish() {
    lines = [];
    idx = -1;
    el.classList.remove('show');
    save.save();
    const cb = onDone;
    onDone = null;
    if (cb) cb();
  }

  function advance() {
    if (idx < 0) return;
    const line = lines[idx];
    if (shown < line.text.length) { shown = line.text.length; return; } // 먼저 다 찍기
    if (idx + 1 < lines.length) { idx++; startLine(); } else finish();
  }

  el.addEventListener('click', (e) => { e.stopPropagation(); advance(); });
  addEventListener('keydown', (e) => {
    if (idx < 0) return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advance(); }
    else if (e.code === 'Escape') { // 통째로 넘기기 — 로그엔 이미 남아 있다
      while (idx + 1 < lines.length) { idx++; pushLog(lines[idx]); }
      finish();
    }
  });

  return {
    get busy() { return idx >= 0; },
    // lines: [[who, text], ...] — who: 'girl' | 'jiji' | 'letter'
    play(seq, done) {
      if (idx >= 0) { // 겹치면 앞 대화는 로그로만 남기고 교체
        for (let i = idx + 1; i < lines.length; i++) pushLog(lines[i]);
      }
      lines = seq.map(([who, text]) => ({ who, text }));
      idx = 0;
      onDone = done || null;
      el.classList.add('show');
      startLine();
      sfx.bell();
    },
    update(dt) {
      if (idx < 0) return;
      const line = lines[idx];
      if (shown < line.text.length) {
        shown = Math.min(line.text.length, shown + dt / CHAR_SEC);
        txEl.textContent = line.text.slice(0, Math.floor(shown));
        if (shown >= line.text.length) nxEl.style.visibility = 'visible';
      } else {
        holdT += dt;
        if (holdT > HOLD_SEC) advance(); // 손을 안 대도 조용히 흘러간다
      }
    },
  };
}
