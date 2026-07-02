// 게임 효과음 — 파일 없이 오실레이터로. 픽업 음정은 콤보 따라 도레미솔로 올라간다.
export function createSfx() {
  let ctx = null;

  function start() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch { ctx = null; }
  }

  function tone(freq, { dur = 0.22, type = 'sine', vol = 0.1, delay = 0, slide = 0 } = {}) {
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  const SCALE = [0, 4, 7, 12, 16, 19, 24]; // 장조 아르페지오 — 콤보 단계

  return {
    start,
    chime(step) {
      const f = 740 * Math.pow(2, SCALE[Math.min(step, SCALE.length - 1)] / 12);
      tone(f, { dur: 0.3, vol: 0.09 });
      tone(f * 2, { dur: 0.16, vol: 0.03, delay: 0.02 });
    },
    buy() { tone(620, { dur: 0.12, vol: 0.08 }); tone(930, { dur: 0.2, vol: 0.08, delay: 0.09 }); },
    deny() { tone(220, { dur: 0.2, type: 'triangle', vol: 0.07, slide: 0.7 }); },
    bell() { tone(880, { dur: 0.4, vol: 0.06 }); tone(1320, { dur: 0.3, vol: 0.03, delay: 0.03 }); },
    unlock() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { dur: 0.5, vol: 0.07, delay: i * 0.09 })); },
    meow() { tone(820, { dur: 0.1, vol: 0.06, slide: 1.6 }); tone(1350, { dur: 0.3, vol: 0.06, delay: 0.1, slide: 0.55 }); },
    stamp() { tone(784, { dur: 0.12, vol: 0.08 }); tone(1046, { dur: 0.14, vol: 0.08, delay: 0.09 }); tone(1568, { dur: 0.3, vol: 0.07, delay: 0.18 }); },
    shutter() { tone(1900, { dur: 0.04, type: 'square', vol: 0.035 }); tone(950, { dur: 0.05, type: 'square', vol: 0.03, delay: 0.06 }); },
  };
}
