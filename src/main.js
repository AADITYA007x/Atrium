import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadHeart } from './heart.js';
import { GROUPS } from './parts.js';
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

hintEl.textContent = isTouch
  ? 'Drag to turn. Pinch to zoom. Two fingers to move. Tap a part to name it.'
  : 'Drag to turn. Scroll to zoom. Right-drag to move. Double-click empty space to recentre.';

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
controls.minDistance = 1.2;
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

function setHome() {
  controls.target.copy(HOME_TARGET);
  camera.position.copy(HOME_TARGET).addScaledVector(HOME_DIR, homeDistance());
  controls.update();
}

// Smooth return to the home view
let flight = null;
function flyHome() {
  flight = {
    t: 0,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: HOME_TARGET.clone(),
    toPos: HOME_TARGET.clone().addScaledVector(HOME_DIR, homeDistance()),
  };
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
setHome();

// Load the heart
let meshes = [];
loadHeart('/models/atrium-heart.glb', (p) => {
  loadingPct.textContent = `${Math.round(p * 100)}%`;
})
  .then(({ root, meshes: m }) => {
    meshes = m;
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

// Hover and tap labels
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerClient = { x: 0, y: 0 };
let pointerDirty = false;
let hovered = null;
let tapHideTimer = null;

function pick(clientX, clientY) {
  pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(meshes, false);
  return hits.length ? hits[0].object : null;
}

function setHovered(mesh) {
  if (hovered === mesh) return;
  if (hovered) hovered.material.emissiveIntensity = 0;
  hovered = mesh;
  if (hovered) hovered.material.emissiveIntensity = 0.12;
  canvas.style.cursor = hovered ? 'pointer' : '';
}

function showLabel(mesh, x, y) {
  const part = mesh.userData.part;
  if (!part) return hideLabel();
  labelName.textContent = part.name;
  const kind = GROUPS[part.group]?.label ?? '';
  labelKind.textContent = part.side ? `${kind}, ${part.side}` : kind;
  labelEl.dataset.blood = part.blood ?? '';
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

controls.addEventListener('start', stopIdleSpin);

canvas.addEventListener('pointermove', (e) => {
  pointerClient = { x: e.clientX, y: e.clientY };
  if (e.pointerType === 'mouse') pointerDirty = true;
});

canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  const quick = performance.now() - downAt.time < 400;
  downAt = null;
  if (e.pointerType !== 'mouse' && moved < 8 && quick) {
    const mesh = pick(e.clientX, e.clientY);
    setHovered(mesh);
    clearTimeout(tapHideTimer);
    if (mesh) {
      showLabel(mesh, e.clientX, e.clientY);
      tapHideTimer = setTimeout(() => {
        hideLabel();
        setHovered(null);
      }, 2600);
    } else {
      hideLabel();
    }
  }
});

canvas.addEventListener('pointerleave', () => {
  setHovered(null);
  hideLabel();
});

canvas.addEventListener('dblclick', (e) => {
  if (!pick(e.clientX, e.clientY)) flyHome();
});

// Idle spin stops for good after the first touch of the heart
let hintTimer = null;
function stopIdleSpin() {
  controls.autoRotate = false;
  if (!hintTimer) hintTimer = setTimeout(() => hintEl.classList.add('gone'), 4000);
}

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

  if (!reduceMotion) {
    rim.intensity = RIM_BASE * (1 + 0.35 * beatEnvelope(((t * BPM) / 60) % 1));
  }

  if (flight) {
    flight.t = Math.min(flight.t + 1 / 70, 1);
    const k = flight.t * flight.t * (3 - 2 * flight.t);
    camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
    if (flight.t === 1) flight = null;
  }

  if (pointerDirty && !dragging && meshes.length) {
    pointerDirty = false;
    const mesh = pick(pointerClient.x, pointerClient.y);
    setHovered(mesh);
    if (mesh) showLabel(mesh, pointerClient.x, pointerClient.y);
    else hideLabel();
  }

  controls.update();
  renderer.render(scene, camera);
});
