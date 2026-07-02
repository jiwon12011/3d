// 사진 모드 — P로 시간을 멈추고 카메라를 자유롭게 돌려 구도를 잡는다. S로 PNG 저장.
import * as THREE from 'three';

export function createPhoto(renderer, composer, camera, target, sfx, isBlocked) {
  let active = false;
  let theta = 0, phi = 0.35, dist = 10;
  let dragging = false, lastX = 0, lastY = 0;

  const hint = document.createElement('div');
  hint.id = 'photo-hint';
  hint.className = 'hidden';
  hint.textContent = '📷 사진 모드 — 드래그 회전 · 휠 줌 · S 저장 · P 나가기';
  document.body.appendChild(hint);

  function enter() {
    active = true;
    // 현재 카메라 방향에서 자연스럽게 이어받는다
    const off = camera.position.clone().sub(target.position);
    dist = Math.min(28, Math.max(5, off.length()));
    theta = Math.atan2(off.x, off.z);
    phi = Math.asin(Math.min(0.95, Math.max(-0.2, off.y / dist)));
    document.body.classList.add('photo-mode');
    hint.classList.remove('hidden');
  }
  function exit() {
    active = false;
    document.body.classList.remove('photo-mode');
    hint.classList.add('hidden');
  }

  function capture() {
    composer.render(); // 같은 틱에 렌더 직후 읽어야 버퍼가 살아있다
    renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `빗자루소녀_${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    sfx.shutter();
    hint.textContent = '📷 찰칵! 저장했어요 ✦';
    setTimeout(() => { hint.textContent = '📷 사진 모드 — 드래그 회전 · 휠 줌 · S 저장 · P 나가기'; }, 1500);
  }

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && !isBlocked()) (active ? exit() : enter());
    else if (active && e.code === 'KeyS') capture();
    else if (active && e.code === 'Escape') exit();
  });
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
  });
  addEventListener('pointermove', (e) => {
    if (!active || !dragging) return;
    theta -= (e.clientX - lastX) * 0.006;
    phi = Math.min(1.35, Math.max(-0.15, phi + (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY;
  });
  addEventListener('pointerup', () => { dragging = false; });
  addEventListener('wheel', (e) => {
    if (!active) return;
    dist = Math.min(30, Math.max(3.5, dist + e.deltaY * 0.01));
  }, { passive: true });

  const look = new THREE.Vector3();
  return {
    get active() { return active; },
    updateCamera() {
      const p = target.position;
      camera.position.set(
        p.x + Math.sin(theta) * Math.cos(phi) * dist,
        p.y + Math.sin(phi) * dist,
        p.z + Math.cos(theta) * Math.cos(phi) * dist
      );
      look.set(p.x, p.y + 0.8, p.z);
      camera.lookAt(look);
    },
  };
}
