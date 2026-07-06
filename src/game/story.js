// 스토리 모드 「도시 편」 — 프롤로그 → 설렘 → 마모 → 그리움 → 귀향.
// 막이 바뀔 때만 영화식 타이틀 카드가 뜨고, 평소엔 일기장과 대화창이 이야기를 나른다.
// "도시가 나쁘다"고 말하지 않는다 — 환경과 지지의 침묵이 대신 말한다.
import * as THREE from 'three';
import { toon } from '../palette.js';
import { CITY } from '../world/city.js';
import { WORLD, heightAt } from '../world/terrain.js';

const CSS = /* css */`
  #storycard {
    position: fixed; inset: 0; z-index: 9;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(16, 14, 22, 0.85); opacity: 0; pointer-events: none;
    transition: opacity 1s ease;
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  }
  #storycard.show { opacity: 1; }
  #storycard.travel { background: #100e16; }
  #storycard .act {
    color: #b9a97e; letter-spacing: 0.55em; text-indent: 0.55em;
    font-size: 0.85rem; font-weight: 700; margin-bottom: 1rem; min-height: 1em;
  }
  #storycard .ttl {
    color: #f5efdf; font-size: clamp(1.5rem, 4.5vw, 2.5rem); font-weight: 800;
    letter-spacing: 0.32em; text-indent: 0.32em; text-align: center; padding: 0 1rem;
  }
  #hud-quest {
    position: fixed; top: 16px; left: 18px; z-index: 5; max-width: min(48vw, 440px);
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    background: rgba(250, 246, 234, 0.88); border: 1px solid #d8cdb8; border-bottom-width: 3px;
    border-radius: 12px; padding: 0.42rem 0.85rem 0.48rem; font-size: 0.84rem; font-weight: 700;
    color: #5a5142; line-height: 1.45; pointer-events: none; user-select: none;
  }
  #hud-quest .ql {
    display: block; color: #b98a2f; font-size: 0.66rem; font-weight: 800;
    letter-spacing: 0.18em; margin-bottom: 0.12rem;
  }
  body.photo-mode #hud-quest { display: none; }
`;

const ACT_LABEL = ['프롤로그', '제1막 — 도시에서 온 초대장', '제2막 — 반짝이는 것들', '제3막 — 편지', '제4막 — 돌아가는 길', '에필로그'];
const CARD = [
  null,
  ['제1막', '도시에서 온 초대장'],
  ['제2막', '반짝이는 것들'],
  ['제3막', '편지'],
  ['제4막', '돌아가는 길'],
  ['', '에필로그'],
];

const TALK = {
  invite: [
    ['girl', '도시의 배달 조합에서 편지가 왔어…!'],
    ['girl', '「솜씨 좋은 마녀님, 도시에서 일해보지 않을래요? 보수는 마을의 두 배!」'],
    ['jiji', '도시엔 생선 가게가 엄청 많대! 가자 가자, 냐앙!'],
    ['girl', '좋아 — 등대 남쪽 선착장에서 배가 기다린대!'],
  ],
  arrive1: [
    ['girl', '우와…… 건물이 구름보다 높아!'],
    ['jiji', '반짝반짝! 온 동네가 축제 같아, 냐앙!'],
    ['girl', '광장 게시판에 배달 일이 잔뜩 붙어 있대. 가보자!'],
  ],
  act2: [
    ['girl', '보수는 좋은데… 오늘은 아무도 고맙다고 안 했네.'],
    ['jiji', '…….'],
    ['girl', '지지? 요즘 왜 말이 없어?'],
  ],
  letter: [
    ['letter', '「마을 벚꽃이 활짝 폈단다. 네가 좋아하던 빵은 늘 남겨두고 있어. — 빵집 아주머니」'],
    ['girl', '…벚꽃. 바람 소리. 반딧불이.'],
    ['girl', '여기선 별이 안 보인다는 걸, 이제야 알았어.'],
    ['jiji', '…….'],
  ],
  flower: [
    ['girl', '이 꽃… 꽃밭 언덕에 피던 들꽃이야. 이런 골목에서도 피는구나.'],
    ['girl', '…지지. 나, 집에 갈래.'],
  ],
  home: [
    ['jiji', '냐앙!! 바람 냄새! 바다 냄새! 집 냄새다!!'],
    ['girl', '지지!! 너 지금 말했어…!'],
    ['girl', '…다녀왔습니다!'],
  ],
};

const THANKS = [
  '「고마워요, 마녀님! 도시는 처음이죠? 잘 왔어요!」 +✦',
  '「오, 벌써요? 도시 체질인가 봐요!」 +✦',
  '「하늘로 오는 배달부라니, 근사한데요!」 +✦',
];
const CURT = [
  '「…사인만 여기.」',
  '(문틈으로 소포만 스윽 받아 간다)',
  '「다음 손님! …아, 배달. 놓고 가요.」',
  '「…….」',
];

const GATE_R = 8, GATE_REARM = 26;

export function createStory({ scene, save, hud, sfx, controls, rider, dialogue, city, npcs, setDayTime }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const card = document.createElement('div');
  card.id = 'storycard';
  card.innerHTML = `<div class="act"></div><div class="ttl"></div>`;
  document.body.appendChild(card);
  const cardAct = card.querySelector('.act');
  const cardTtl = card.querySelector('.ttl');

  const s = save.state.story;
  let cine = 0; // 타이틀 카드/이동 연출 중

  // 좌상단 퀘스트 표시 — 일기장의 오늘의 목표가 항상 보인다
  const quest = document.createElement('div');
  quest.id = 'hud-quest';
  quest.innerHTML = `<span class="ql"></span><span class="qt"></span>`;
  document.body.appendChild(quest);
  const questLabel = quest.querySelector('.ql');
  const questText = quest.querySelector('.qt');
  let questCache = '';

  function fadeCard({ sub = '', title, travel = false, inSec = 1.0, hold = 2.1, outSec = 1.3, atBlack, done }) {
    cine++;
    cardAct.textContent = sub;
    cardTtl.textContent = title;
    card.classList.toggle('travel', travel);
    card.style.transitionDuration = `${inSec}s`;
    void card.offsetWidth; // transition-duration 반영
    card.classList.add('show');
    setTimeout(() => { if (atBlack) atBlack(); }, inSec * 1000 + 80);
    setTimeout(() => {
      card.style.transitionDuration = `${outSec}s`;
      card.classList.remove('show');
    }, (inSec + hold) * 1000);
    setTimeout(() => { cine--; if (done) done(); }, (inSec + hold + outSec) * 1000 + 120);
  }

  function setAct(n, done) {
    s.act = n;
    save.save();
    const [sub, title] = CARD[n];
    sfx.unlock();
    fadeCard({ sub, title, hold: 2.4, done });
  }

  // --- 빛기둥 게이트 (마을 선착장 ↔ 도시 선착장) ---
  function makeGate() {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 3.1, 44, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xbfe4ff, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    scene.add(m);
    return m;
  }
  const vGate = makeGate();
  vGate.position.copy(CITY.gateVillage).setY(22);
  const cGate = makeGate();
  cGate.position.copy(CITY.gateCity).setY(22);
  let armedV = true, armedC = true;

  function gateWarm() { // 귀향의 신호 — 도시 게이트가 노을빛으로
    cGate.material.color.set(0xffc978);
  }
  if (s.act === 3 && s.flower) gateWarm();

  const faceYaw = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));

  function travelToCity() {
    armedV = false;
    const first = s.act === 0;
    fadeCard({
      title: '— 바다를 건넌다 —', travel: true, hold: first ? 2.6 : 1.8,
      atBlack: () => {
        const a = CITY.arriveCity;
        controls.setPose(a.x, a.y, a.z, faceYaw(a.x, a.z, CITY.center.x, CITY.center.y));
        controls.setAnchor(CITY.center.x, CITY.center.y, 300);
        armedC = false;
      },
      done: () => {
        if (first) setAct(1, () => dialogue.play(TALK.arrive1));
      },
    });
  }

  function travelToVillage() {
    armedC = false;
    const finale = s.act === 3 && s.flower;
    fadeCard({
      sub: finale ? '제4막' : '',
      title: finale ? '돌아가는 길' : '— 바다를 건넌다 —',
      travel: !finale, hold: finale ? 3.4 : 1.8,
      atBlack: () => {
        const a = CITY.arriveVillage;
        controls.setPose(a.x, a.y, a.z, faceYaw(a.x, a.z, -100, -80));
        controls.setAnchor(0, 0, 440);
        armedV = false;
        if (finale) {
          s.act = 4;
          save.save();
          setDayTime(0.78); // 노을 — 돌아오는 하늘은 금빛이어야 한다
        }
      },
      done: () => {
        if (finale) {
          npcs.waveAll(10);
          npcs.say('baker', '어서 와요, 우리 마녀님!! 🍞', 6);
          dialogue.play(TALK.home, () => {
            setAct(5, () => hud.toast('도시는 언제든 놀러 가면 되니까 — 선착장은 계속 열려 있어요 ✦', 6000));
          });
        }
      },
    });
  }

  // --- 도시 배달 (빵집 배달의 도시 버전 — 보수는 두 배, 온기는 절반) ---
  const parcel = new THREE.Group();
  parcel.position.set(0, -0.42, 1.55);
  const pbox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), toon(0xd8e0ea)); // 도시 소포는 회청색 포장
  pbox.castShadow = true;
  parcel.add(pbox);
  parcel.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.09), toon(0x3d5a80)));
  parcel.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.36, 0.44), toon(0x3d5a80)));
  parcel.visible = false;
  rider.group.add(parcel);

  let armedBoard = true;
  const spotOf = (key) => CITY.spots.find((sp) => sp.key === key);

  function syncJob() {
    parcel.visible = !!s.job;
  }
  syncJob();

  function startJob() {
    const pool = CITY.spots.filter((sp) => sp.key !== s.lastJob);
    const sp = pool[Math.floor(Math.random() * pool.length)];
    s.job = sp.key;
    s.lastJob = sp.key;
    save.save();
    syncJob();
    sfx.bell();
    hud.toast(s.act === 1
      ? `📦 ${sp.name}에게 급행 소포! 화살표를 따라가요 (보수 두 배!)`
      : `📦 ${sp.name}에게 소포. …오늘도 목록이 길다`, 4500);
  }

  function completeJob(sp) {
    const reward = 34 + Math.floor(Math.random() * 8);
    s.job = null;
    s.cityDeliveries += 1;
    save.state.candies += reward;
    hud.setCandies(save.state.candies);
    hud.floatPlus(reward);
    save.save();
    syncJob();
    if (s.act === 1) {
      sfx.stamp();
      hud.toast(`${THANKS[s.cityDeliveries % THANKS.length]}${reward}`, 4000);
    } else {
      sfx.stamp();
      hud.toast(`${CURT[s.cityDeliveries % CURT.length]}  +${reward} ✦`, 4000);
    }
    // 막 전환
    if (s.act === 1 && s.cityDeliveries >= 3) {
      setTimeout(() => setAct(2, () => dialogue.play(TALK.act2)), 1600);
    } else if (s.act === 2 && s.cityDeliveries >= 7) {
      setTimeout(() => setAct(3, () => dialogue.play(TALK.letter, () => {
        city.flowerGroup.visible = true;
        hud.toast('…어디선가 옅은 꽃향기가 났다. 광장 남서쪽 뒷골목?', 5500);
      })), 1600);
    }
  }

  // 저장본에서 이어하기 — 3막에 들어와 있으면 꽃도 피어 있어야 한다
  if (s.act >= 3 && !s.flower) city.flowerGroup.visible = true;

  // --- 퀘스트 화살표 — 지금 가야 할 곳 위에 큼직하게 떠서 까딱거린다 ---
  const arrow = new THREE.Group();
  const arrowCone = new THREE.Mesh(new THREE.ConeGeometry(2.3, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  arrowCone.rotation.x = Math.PI; // 아래를 가리킨다
  arrow.add(arrowCone);
  const arrowRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.26, 8, 20), new THREE.MeshBasicMaterial({ color: 0xfff3cf }));
  arrowRing.rotation.x = Math.PI / 2;
  arrowRing.position.y = 3.6;
  arrow.add(arrowRing);
  arrow.visible = false;
  scene.add(arrow);

  // 지금 가야 할 곳 — [x, 지면y, z]. 없으면 null (에필로그 등 자유 시간)
  function questTarget(p) {
    if (s.act >= 4) return null;
    if (s.act === 0) {
      if (!s.invited) {
        const t = save.state.delivery?.target; // 마을 배달 중이면 받는 사람에게
        if (t && npcs.byKey(t)) { const n = npcs.byKey(t); return [n.x, n.y, n.z]; }
        return [WORLD.bakery.x, heightAt(WORLD.bakery.x, WORLD.bakery.y), WORLD.bakery.y];
      }
      return [vGate.position.x, 1, vGate.position.z];
    }
    // 1~3막에 마을 쪽에 있다면 — 우선 선착장으로
    if (Math.hypot(p.x - CITY.center.x, p.z - CITY.center.y) > 480) {
      return [vGate.position.x, 1, vGate.position.z];
    }
    if (s.job) { const sp = spotOf(s.job); return [sp.x, 2.3, sp.z]; }
    if (s.act === 3) {
      return s.flower
        ? [cGate.position.x, 1, cGate.position.z]
        : [CITY.flower.x, 2.3, CITY.flower.y];
    }
    return [CITY.board.x, 2.3, CITY.board.y];
  }

  function objective() {
    switch (s.act) {
      case 0: return s.invited
        ? '등대 남쪽 해안의 선착장 — 푸른 빛기둥으로 들어가면 도시로 간다'
        : `빵집 아주머니의 배달을 돕자 (${save.state.deliveries}/5). 빵집 지붕에 살짝 내려앉으면 부탁을 받을 수 있다`;
      case 1: return `광장 게시판(분수대 남쪽)에서 배달 일을 받자 (${s.cityDeliveries}/3) — 보수가 두 배래!`;
      case 2: return `배달은 순조롭다. 순조로운데… (${s.cityDeliveries}/7)`;
      case 3: return s.flower
        ? '선착장의 빛기둥이 따뜻하게 물들었다 — 집에 가자'
        : '광장 남서쪽 뒷골목 어딘가, 낯익은 꽃이 핀다던데';
      case 4: return '바람 소리가 돌아왔다.';
      default: return '내 자리는 여기. 도시는 언제든 놀러 가면 되니까 ✦';
    }
  }

  return {
    get busy() { return cine > 0; },
    actLabel: () => ACT_LABEL[s.act],
    objective,

    update(dt, t, p) {
      // 퀘스트 HUD — 목표가 바뀔 때만 DOM을 만진다
      const q = `${ACT_LABEL[s.act]}|${objective()}`;
      if (q !== questCache) {
        questCache = q;
        questLabel.textContent = ACT_LABEL[s.act];
        questText.textContent = objective();
      }
      // 게이트 숨쉬기
      const pulse = 0.13 + Math.sin(t * 2.2) * 0.045;
      vGate.material.opacity = pulse;
      cGate.material.opacity = s.act === 3 && s.flower ? pulse + 0.08 : pulse;
      vGate.rotation.y = t * 0.35;
      cGate.rotation.y = -t * 0.35;
      vGate.visible = s.invited;
      cGate.visible = s.act >= 1;
      // 퀘스트 화살표 — 멀수록 커져서 어디서든 보인다
      const qt = cine > 0 ? null : questTarget(p);
      if (qt) {
        arrow.visible = true;
        const d = Math.hypot(p.x - qt[0], p.z - qt[2]);
        const sc = 1 + Math.min(2.5, d / 90);
        arrow.scale.setScalar(sc);
        arrow.position.set(qt[0], qt[1] + 21 + sc * 2 + Math.sin(t * 2.6) * 1.7, qt[2]);
        arrow.rotation.y = t * 1.3;
      } else {
        arrow.visible = false;
      }

      if (cine > 0 || dialogue.busy) return;

      // 프롤로그: 배달 5번 → 초대장
      if (s.act === 0 && !s.invited && save.state.deliveries >= 5) {
        s.invited = true;
        save.save();
        sfx.unlock();
        dialogue.play(TALK.invite, () =>
          hud.toast('🕯️ 등대 남쪽 해안에 푸른 빛기둥이 떠올랐어요 — 선착장으로', 6000));
        return;
      }

      // 게이트 통과
      const dv = Math.hypot(p.x - vGate.position.x, p.z - vGate.position.z);
      if (!armedV && dv > GATE_REARM) armedV = true;
      if (armedV && s.invited && dv < GATE_R && p.y < 20) { travelToCity(); return; }
      const dc = Math.hypot(p.x - cGate.position.x, p.z - cGate.position.z);
      if (!armedC && dc > GATE_REARM) armedC = true;
      if (armedC && s.act >= 1 && dc < GATE_R && p.y < 20) { travelToVillage(); return; }

      // 광장 게시판 — 다가가면 일을 받는다
      const db = Math.hypot(p.x - CITY.board.x, p.z - CITY.board.y);
      if (!armedBoard && db > 14) armedBoard = true;
      if (armedBoard && !s.job && s.act >= 1 && s.act <= 3 && db < 8 && p.y < 12) {
        armedBoard = false;
        startJob();
      }

      // 배달 완료
      if (s.job) {
        const sp = spotOf(s.job);
        if (Math.hypot(p.x - sp.x, p.z - sp.z) < 10 && p.y < 16) completeJob(sp);
      }

      // 들꽃 발견 — 그리움이 이름을 얻는 순간
      if (s.act === 3 && !s.flower && city.flowerGroup.visible) {
        if (Math.hypot(p.x - CITY.flower.x, p.z - CITY.flower.y) < 7 && p.y < 12) {
          s.flower = true;
          save.save();
          sfx.bell();
          gateWarm();
          dialogue.play(TALK.flower, () =>
            hud.toast('선착장의 빛기둥이 따뜻하게 물들었다 — 집으로 ✦', 5500));
        }
      }
    },
  };
}
