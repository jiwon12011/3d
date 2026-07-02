// 「빗자루 소녀」 — 지브리풍 하늘 산책
import * as THREE from 'three';
import { C } from './palette.js';
import { createSky, SUN_DIR } from './world/sky.js';
import { createClouds } from './world/clouds.js';
import { createTerrain } from './world/terrain.js';
import { createTown } from './world/town.js';
import { createNature } from './world/nature.js';
import { createLeaves, createSpeedLines } from './world/particles.js';
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

// --- 조명: 따뜻한 햇살 + 하늘의 푸른 환경광 ---
const sun = new THREE.DirectionalLight(0xfff4d6, 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -95; sun.shadow.camera.right = 95;
sun.shadow.camera.top = 95; sun.shadow.camera.bottom = -95;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 420;
sun.shadow.bias = -0.0004;
sun.shadow.intensity = 0.55; // 그림자도 밝게 — 지브리의 화사한 그늘
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x9bc47a, 0.9));

// --- 월드 ---
const sky = createSky();
scene.add(sky);
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

// --- 플레이어 ---
const rider = createBroomRider();
scene.add(rider.group);
const controls = createControls(rider.group);
const rig = createCameraRig(camera, rider.group);

// --- 시작 오버레이 ---
const overlay = document.getElementById('overlay');
let started = false;
function start() {
  if (started) return;
  started = true;
  overlay.classList.add('hidden');
  controls.enable();
  rig.start();
}
overlay.addEventListener('click', start);
addEventListener('keydown', start, { once: false });

window.__G = { camera, rider, controls, rig, scene, start, clouds, renderer };

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
  leaves.update(t, p);
  speedLines.update(dt, controls.boost && started);

  // 구름 속: 화면이 순간 뿌예졌다가 빠져나오면 돌아온다
  fogBlend += ((inCloud ? 1 : 0) - fogBlend) * Math.min(1, 3 * dt);
  scene.fog.near = FOG_NEAR + (6 - FOG_NEAR) * fogBlend;
  scene.fog.far = FOG_FAR + (110 - FOG_FAR) * fogBlend;

  // 하늘·태양·그림자 카메라는 플레이어를 따라다닌다
  sky.position.copy(p);
  sun.position.copy(p).addScaledVector(SUN_DIR, 180);
  sun.target.position.copy(p);

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(() => frame(Math.min(clock.getDelta(), 0.05)));
window.__G.step = (dt, n = 1) => { for (let i = 0; i < n; i++) frame(dt); };

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
