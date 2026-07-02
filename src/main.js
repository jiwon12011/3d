// 「빗자루 소녀」 — 지브리풍 하늘 산책
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { C } from './palette.js';
import { createSky } from './world/sky.js';
import { createClouds } from './world/clouds.js';
import { createTerrain } from './world/terrain.js';
import { createTown } from './world/town.js';
import { createNature } from './world/nature.js';
import { createLeaves, createSpeedLines, createSparkles, createFireflies } from './world/particles.js';
import { createExtras } from './world/extras.js';
import { createWind } from './audio.js';
import { createDayCycle } from './daycycle.js';
import { createBroomRider } from './player/broom.js';
import { createControls } from './player/controls.js';
import { createCameraRig } from './camera.js';

// --- 렌더러: 지브리색을 지키는 설정 ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping; // ACES는 채도를 빨아먹는다 — 팔레트가 곧 완성색
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// 안개색 = 하늘 수평선색 (정확히 일치해야 원경이 하늘에 녹는다)
const FOG_NEAR = 120, FOG_FAR = 620;
scene.fog = new THREE.Fog(C.horizon, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
scene.add(camera);

// --- 조명: 따뜻한 햇살 + 하늘의 푸른 환경광 (색·강도는 시간 사이클이 갱신) ---
const sun = new THREE.DirectionalLight(0xfff4d6, 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -95; sun.shadow.camera.right = 95;
sun.shadow.camera.top = 95; sun.shadow.camera.bottom = -95;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 420;
sun.shadow.bias = -0.0004;
sun.shadow.intensity = 0.55; // 그림자도 밝게 — 지브리의 화사한 그늘
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x9bc47a, 0.9);
scene.add(hemi);

// --- 월드 ---
const sky = createSky();
scene.add(sky.mesh);
const clouds = createClouds();
scene.add(clouds.mesh);
const terrain = createTerrain();
scene.add(terrain.group);
const town = createTown();
scene.add(town.group);
const nature = createNature();
scene.add(nature.group);
const leaves = createLeaves();
scene.add(leaves.mesh);
const speedLines = createSpeedLines(camera);
const extras = createExtras();
scene.add(extras.group);
const sparkles = createSparkles();
scene.add(sparkles.mesh);
const fireflies = createFireflies();
scene.add(fireflies.mesh);
const wind = createWind();
const cycle = createDayCycle();

// --- 플레이어 ---
const rider = createBroomRider();
scene.add(rider.group);
const controls = createControls(rider.group);
const rig = createCameraRig(camera, rider.group);

// --- 화면 보정: 은은한 블룸 + 채도 + 비네트 (지브리 수채화의 화사함) ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.55, 0.82);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      // 채도를 살짝 끌어올려 수채화 특유의 맑은 색감으로
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 1.12);
      // 가장자리를 부드럽게 어둡게 — 화면 중앙으로 시선이 모인다
      float d = distance(vUv, vec2(0.5));
      col *= 1.0 - smoothstep(0.42, 0.98, d) * 0.26;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

// --- 시작 오버레이 ---
const overlay = document.getElementById('overlay');
let started = false;
function start() {
  if (started) return;
  started = true;
  overlay.classList.add('hidden');
  controls.enable();
  rig.start();
  wind.start(); // 오디오는 사용자 입력 안에서만 시작 가능
}
overlay.addEventListener('click', start);
addEventListener('keydown', start, { once: false });

// --- 마우스/터치 드래그 조종 ---
// 드래그: 좌우 = 선회, 상하 = 하강/상승. 두 번째 손가락 = 부스트.
let steerId = null, steerX = 0, steerY = 0;
const activePointers = new Set();
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  start();
  activePointers.add(e.pointerId);
  if (steerId === null) {
    steerId = e.pointerId;
    steerX = e.clientX; steerY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 */ }
  } else {
    controls.analog.boost = true;
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== steerId) return;
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));
  controls.analog.turn = clamp1(-(e.clientX - steerX) / 130);
  controls.analog.climb = clamp1(-(e.clientY - steerY) / 130);
});
function releasePointer(e) {
  activePointers.delete(e.pointerId);
  if (e.pointerId === steerId) {
    steerId = null;
    controls.analog.turn = 0;
    controls.analog.climb = 0;
  } else {
    controls.analog.boost = false;
  }
  if (activePointers.size === 0) controls.analog.boost = false;
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

// --- 시간 사이클: N 홀드 = 빨리 감기 ---
const DAY_LENGTH = 300; // 하루 5분
let dayTime = 0.45;     // 한낮에서 시작
let timeFast = false;
addEventListener('keydown', (e) => { if (e.code === 'KeyN') timeFast = true; });
addEventListener('keyup', (e) => { if (e.code === 'KeyN') timeFast = false; });

window.__G = {
  camera, rider, controls, rig, scene, start, clouds, renderer, wind,
  setDayTime: (v) => { dayTime = v; },
  getDayTime: () => dayTime,
};

// --- 루프 ---
const clock = new THREE.Clock();
let fogBlend = 0; // 구름 통과 뿌옇게
let elapsed = 0;

function frame(dt) {
  elapsed += dt;
  const t = elapsed;
  const p = rider.group.position;

  controls.update(dt);
  rig.update(dt, t, controls.forward, controls.speedFactor, controls.bank);
  rider.update(t, controls.speedFactor);

  const inCloud = clouds.update(dt, p);
  terrain.update(t);
  town.update(t);
  nature.update(t);
  extras.update(dt, t);
  leaves.update(t, p);
  sparkles.update(t, p);
  speedLines.update(dt, controls.boost && started);
  wind.update(dt, controls.speedFactor);

  // 시간이 흐른다 — 낮, 노을, 밤, 새벽
  dayTime = (dayTime + dt * (timeFast ? 40 : 1) / DAY_LENGTH) % 1;
  const dc = cycle.sample(dayTime);
  sky.setLook(dc.skyTop, dc.skyMid, dc.horizon, dc.sunDir);
  sky.setStars(dc.stars);
  scene.fog.color.copy(dc.horizon);
  sun.color.copy(dc.sun);
  sun.intensity = dc.sunI;
  hemi.color.copy(dc.hemiSky);
  hemi.groundColor.copy(dc.hemiGround);
  hemi.intensity = dc.hemiI;
  clouds.mesh.material.color.copy(dc.cloud);
  terrain.setWaterColor(dc.water);
  town.setNightGlow(dc.glow);
  extras.setNight(dc.glow);
  fireflies.update(t, p, dc.glow);
  sparkles.mesh.material.opacity = 0.4 * (1 - dc.glow * 0.85); // 햇빛 반짝임은 밤에 잦아든다

  // 구름 속: 화면이 순간 뿌예졌다가 빠져나오면 돌아온다
  fogBlend += ((inCloud ? 1 : 0) - fogBlend) * Math.min(1, 3 * dt);
  scene.fog.near = FOG_NEAR + (6 - FOG_NEAR) * fogBlend;
  scene.fog.far = FOG_FAR + (110 - FOG_FAR) * fogBlend;

  // 하늘·태양·그림자 카메라는 플레이어를 따라다닌다
  sky.mesh.position.copy(p);
  sun.position.copy(p).addScaledVector(dc.sunDir, 180);
  sun.target.position.copy(p);

  composer.render();
}

renderer.setAnimationLoop(() => frame(Math.min(clock.getDelta(), 0.05)));
window.__G.step = (dt, n = 1) => { for (let i = 0; i < n; i++) frame(dt); };

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
