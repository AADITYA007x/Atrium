import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadHeart } from './heart.js';
import { GROUPS } from './parts.js';
import { createPanel } from './panel.js';
import { createBrowser } from './browser.js';
import './style.css';

const canvas = document.getElementById('scene');
const loadingEl = document.getElementById('loading');
const loadingPct = document.getElementById('loading-pct');
const labelEl = document.getElementById('label');
const labelName = document.getElementById('label-name');
const labelKind = document.getElementById('label-kind');
const hintEl = document.getElementById('hint');
const creditsBtn = document.getElementById('credits-toggle');
const creditsEl = document.getElementById('credits');

const isTouch = window.matchMedia('(pointer: coarse)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => window.innerWidth <= 760;
let uiReady = false;

hintEl.textContent = isTouch
  ? 'Drag to turn. Pinch to zoom. Tap a part to learn about it.'
  : 'Drag to turn. Scroll to zoom. Click a part to learn about it.';

// Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0d0809, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.28;

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);

scene.add(new THREE.HemisphereLight(0xffe6dc, 0x1a0f14, 0.6));
const key = new THREE.DirectionalLight(0xfff1e8, 2.2);
key.position.set(3, 4, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0x8fa8e0, 0.6);
fill.position.set(-4, -1, 2);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xd9b56c, 1.4);
rim.position.set(-2, 3, -5);
scene.add(rim);
const RIM_BASE = 1.4;

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.screenSpacePanning = true;
controls.minDistance = 0.8;
controls.maxDistance = 14;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 0.35;

const HOME_TARGET = new THREE.Vector3(0, 0.5, -0.15);
const HOME_DIR = new THREE.Vector3(0.12, 0.08, 1).normalize();
const MODEL_RADIUS = 2.15;

function homeDistance() {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const fit = Math.min(vFov, hFov);
  return (MODEL_RADIUS / Math.sin(fit / 2)) * 0.95;
}

// Smooth camera flights
let flight = null;
function flyTo(target, position) {
  if (reduceMotion) {
    controls.target.copy(target);
    camera.position.copy(position);
    return;
  }
  flight = { t: 0, fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: position, toTarget: target };
}

function flyHome() {
  flyTo(HOME_TARGET.clone(), HOME_TARGET.clone().addScaledVector(HOME_DIR, homeDistance()));
}

function flyToMesh(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const part = mesh.userData.part;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const fit = Math.min(vFov, hFov);
  const widen = Math.sin(vFov / 2) / Math.sin(fit / 2);
  const minDist = (part?.inside ? 3.4 : 2.4) * widen;
  const dist = THREE.MathUtils.clamp((sphere.radius / Math.sin(fit / 2)) * 1.35, minDist, 12);
  const dir = camera.position.clone().sub(controls.target).normalize();
  flyTo(sphere.center.clone(), sphere.center.clone().addScaledVector(dir, dist));
}

// Keep the heart centred in the space the panels leave free
const viewShift = { x: 0, y: 0, tx: 0, ty: 0 };
function updateViewShiftTarget() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let tx = 0;
  let ty = 0;
  if (narrow()) {
    if (panel.el.classList.contains('open')) ty = (panel.el.offsetHeight || h * 0.5) / 2;
  } else {
    if (panel.el.classList.contains('open')) tx += panel.el.offsetWidth / 2;
    if (browser.isOpen()) tx -= document.getElementById('browser').offsetWidth / 2;
  }
  viewShift.tx = Math.min(tx, w * 0.3);
  viewShift.ty = Math.min(ty, h * 0.3);
}

function applyViewShift() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  viewShift.x += (viewShift.tx - viewShift.x) * (reduceMotion ? 1 : 0.08);
  viewShift.y += (viewShift.ty - viewShift.y) * (reduceMotion ? 1 : 0.08);
  if (Math.abs(viewShift.x) < 0.5 && Math.abs(viewShift.y) < 0.5 && viewShift.tx === 0 && viewShift.ty === 0) {
    if (camera.view) camera.clearViewOffset();
  } else {
    camera.setViewOffset(w, h, viewShift.x, viewShift.y, w, h);
  }
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (uiReady) updateViewShiftTarget();
}
window.addEventListener('resize', resize);
resize();
controls.target.copy(HOME_TARGET);
camera.position.copy(HOME_TARGET).addScaledVector(HOME_DIR, homeDistance());
controls.update();

// Parts: selection, highlight, fading
let meshes = [];
const meshById = new Map();
let hovered = null;
let selected = null;

const HOVER_GLOW = 0.12;
const SELECT_GLOW = 0.24;

function refreshGlow() {
  for (const m of meshes) {
    m.userData.glowTarget = m === selected ? SELECT_GLOW : m === hovered ? HOVER_GLOW : 0;
  }
}

function refreshFade() {
  const fadeOthers = !!selected?.userData.part?.inside;
  for (const m of meshes) m.userData.opacityTarget = fadeOthers && m !== selected ? 0.07 : 1;
}

const panel = createPanel({
  onSelect: (id, opts) => select(id, opts),
  onClose: () => deselect(),
});

const browser = createBrowser({
  onSelect: (id, opts) => select(id, opts),
  onToggle: () => updateViewShiftTarget(),
});

uiReady = true;

function select(id, { fly = false, fromList = false } = {}) {
  const mesh = meshById.get(id);
  if (!mesh) return;
  selected = mesh;
  refreshGlow();
  refreshFade();
  panel.show(id);
  browser.setCurrent(id);
  if (fromList && narrow()) browser.close();
  stopIdleSpin();
  hideLabel();
  if (fly) flyToMesh(mesh);
  requestAnimationFrame(updateViewShiftTarget);
}

function deselect() {
  selected = null;
  refreshGlow();
  refreshFade();
  panel.hide();
  browser.setCurrent(null);
  updateViewShiftTarget();
}

// Load the heart
loadHeart('/models/atrium-heart.glb', (p) => {
  loadingPct.textContent = `${Math.round(p * 100)}%`;
})
  .then(({ root, meshes: m }) => {
    meshes = m;
    for (const mesh of meshes) {
      meshById.set(mesh.userData.partId, mesh);
      mesh.userData.glowTarget = 0;
      mesh.userData.opacityTarget = 1;
    }
    scene.add(root);
    loadingEl.classList.add('done');
    document.body.classList.add('ready');
  })
  .catch((err) => {
    console.error(err);
    loadingEl.querySelector('p').textContent =
      'The heart model could not load. Check that public/models/atrium-heart.glb exists, then reload.';
    loadingPct.textContent = '';
  });

// Picking
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerClient = { x: 0, y: 0 };
let pointerDirty = false;

function pick(clientX, clientY) {
  pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const pickable = meshes.filter((m) => m.userData.opacityTarget > 0.5);
  const hits = raycaster.intersectObjects(pickable, false);
  return hits.length ? hits[0].object : null;
}

function setHovered(mesh) {
  if (hovered === mesh) return;
  hovered = mesh;
  refreshGlow();
  canvas.style.cursor = hovered ? 'pointer' : '';
}

function showLabel(mesh, x, y) {
  const part = mesh.userData.part;
  if (!part) return hideLabel();
  labelName.textContent = part.name;
  const kind = GROUPS[part.group]?.label ?? '';
  labelKind.textContent = part.side ? `${kind}, ${part.side}` : kind;
  labelKind.dataset.blood = part.blood ?? '';
  const pad = 18;
  const maxX = window.innerWidth - labelEl.offsetWidth - pad;
  labelEl.style.transform = `translate(${Math.min(x + pad, maxX)}px, ${Math.max(y - 54, pad)}px)`;
  labelEl.classList.add('visible');
}

function hideLabel() {
  labelEl.classList.remove('visible');
}

let dragging = false;
let downAt = null;

canvas.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY, time: performance.now() };
  dragging = true;
  if (e.pointerType === 'mouse') {
    setHovered(null);
    hideLabel();
  }
});

canvas.addEventListener('pointermove', (e) => {
  pointerClient = { x: e.clientX, y: e.clientY };
  if (e.pointerType === 'mouse') pointerDirty = true;
});

canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  const quick = performance.now() - downAt.time < 450;
  downAt = null;
  if (moved > 6 || !quick || e.button > 0) return;
  const mesh = pick(e.clientX, e.clientY);
  if (mesh) select(mesh.userData.partId);
  else if (selected) deselect();
  if (e.pointerType === 'mouse') pointerDirty = true;
});

canvas.addEventListener('pointerleave', () => {
  setHovered(null);
  hideLabel();
});

canvas.addEventListener('dblclick', (e) => {
  if (!pick(e.clientX, e.clientY)) flyHome();
});

window.addEventListener('keydown', (e) => {
  const typing = e.target instanceof HTMLInputElement;
  if (e.key === 'Escape') {
    if (browser.isOpen() && (typing || !selected)) browser.close();
    else if (selected) deselect();
    else if (browser.isOpen()) browser.close();
  } else if (e.key === '/' && !typing) {
    e.preventDefault();
    browser.open(true);
  }
});

// Idle spin stops for good after the first touch of the heart
let hintTimer = null;
function stopIdleSpin() {
  controls.autoRotate = false;
  if (!hintTimer) hintTimer = setTimeout(() => hintEl.classList.add('gone'), 4000);
}
controls.addEventListener('start', stopIdleSpin);

// Credits
creditsBtn.addEventListener('click', () => {
  const open = creditsEl.hasAttribute('hidden');
  creditsEl.toggleAttribute('hidden', !open);
  creditsBtn.setAttribute('aria-expanded', String(open));
});

// A quiet sign of life: the rim light swells softly at a resting 60 beats a minute
const BPM = 60;
function beatEnvelope(phase) {
  const bump = (p, start, length) => {
    if (p < start || p > start + length) return 0;
    const s = Math.sin(((p - start) / length) * Math.PI);
    return s * s;
  };
  return 0.25 * bump(phase, 0.0, 0.12) + bump(phase, 0.16, 0.3);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  const ease = reduceMotion ? 1 : 0.12;

  if (!reduceMotion) {
    rim.intensity = RIM_BASE * (1 + 0.35 * beatEnvelope(((t * BPM) / 60) % 1));
  }

  for (const m of meshes) {
    const mat = m.material;
    mat.emissiveIntensity += (m.userData.glowTarget - mat.emissiveIntensity) * ease;
    const target = m.userData.opacityTarget;
    if (Math.abs(mat.opacity - target) > 0.002) {
      mat.opacity += (target - mat.opacity) * ease;
    } else {
      mat.opacity = target;
    }
    const see = mat.opacity < 0.999;
    if (mat.transparent !== see) {
      mat.transparent = see;
      mat.needsUpdate = true;
    }
    mat.depthWrite = mat.opacity > 0.5;
  }

  if (flight) {
    flight.t = Math.min(flight.t + 1 / 70, 1);
    const k = flight.t * flight.t * (3 - 2 * flight.t);
    camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
    if (flight.t === 1) flight = null;
  }

  applyViewShift();

  if (pointerDirty && !dragging && meshes.length) {
    pointerDirty = false;
    const mesh = pick(pointerClient.x, pointerClient.y);
    setHovered(mesh);
    if (mesh && mesh !== selected) showLabel(mesh, pointerClient.x, pointerClient.y);
    else hideLabel();
  }

  controls.update();
  renderer.render(scene, camera);
});
