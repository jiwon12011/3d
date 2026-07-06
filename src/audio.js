// 프로시저럴 바람 소리 — 오디오 파일 없이 노이즈 + 로우패스 필터로.
// 속도가 빨라지면 바람이 거세지고 음이 높아진다. M 키로 음소거.
// 도시에서는 바람이 잦아들고 낮게 웅웅거리는 도시 소음이 깔린다 — 귀향할 때 이 대비가 클라이맥스.
export function createWind() {
  let ctx = null, gain = null, filter = null;
  let droneGain = null;
  let started = false, muted = false;
  let level = 0, droneLevel = 0, cityK = 0;

  function start() {
    if (started) return;
    started = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        // 갈색 노이즈 — 백색 노이즈보다 부드러운 "바람" 질감
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;
      gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      // 도시의 웅웅거림 — 살짝 어긋난 저음 톱니파 두 개
      droneGain = ctx.createGain();
      droneGain.gain.value = 0;
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 130;
      for (const f of [52, 52.7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(droneFilter);
        o.start();
      }
      droneFilter.connect(droneGain);
      droneGain.connect(ctx.destination);
      if (ctx.state === 'suspended') ctx.resume();
    } catch {
      started = false; // 오디오 실패는 조용히 무시 — 게임은 계속
    }
  }

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') muted = !muted;
  });

  return {
    start,
    get running() { return started && ctx && ctx.state === 'running'; },
    setCity(k) { cityK = k; },
    update(dt, speedFactor) {
      if (!started || !gain) return;
      const target = muted ? 0 : (0.05 + speedFactor * 0.14) * (1 - cityK * 0.72);
      level += (target - level) * Math.min(1, dt * 3);
      gain.gain.value = level;
      filter.frequency.value = 350 + speedFactor * 950;
      const droneTarget = muted ? 0 : cityK * 0.045;
      droneLevel += (droneTarget - droneLevel) * Math.min(1, dt * 1.5);
      if (droneGain) droneGain.gain.value = droneLevel;
    },
  };
}
