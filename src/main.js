import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadHeart, createHalo } from './heart.js';
import { GROUPS } from './parts.js';
import { createPanel } from './panel.js';
import { createBrowser } from './browser.js';
import { createLayers } from './layers.js';
import { createSlice } from './slice.js';
import { createBeat, measureHeart } from './beat.js';
import { createDock } from './dock.js';
import { buildValves } from './valves.js';
import { createFlow } from './flow.js';
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
let pointerDirty = false;

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
renderer.localClippingEnabled = true;

const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6);

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
  return (MODEL_RADIUS / Math.sin(fit / 2)) * 1.05;
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
  const centre = sphere.center.clone();
  const current = camera.position.clone().sub(controls.target).normalize();
  const dir = part?.inside ? current : bestViewDirection(mesh, centre, dist, current);
  flyTo(centre, centre.clone().addScaledVector(dir, dist));
}

// Find a direction from which the part is not hidden behind the rest of the heart.
const viewRay = new THREE.Raycaster();
function bestViewDirection(mesh, centre, dist, current) {
  const heartCentre = heartBounds.isEmpty() ? new THREE.Vector3() : heartBounds.getCenter(new THREE.Vector3());
  const outward = centre.clone().sub(heartCentre);
  if (outward.length() < 0.2) outward.copy(current);
  outward.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const tilt = (v, y) => v.clone().setY(v.y + y).normalize();
  const turn = (v, deg) => v.clone().applyAxisAngle(up, THREE.MathUtils.degToRad(deg));

  const candidates = [
    current,
    tilt(outward, 0.25),
    outward,
    turn(tilt(outward, 0.25), 50),
    turn(tilt(outward, 0.25), -50),
    tilt(outward, -0.7),
    tilt(outward, 0.9),
    turn(outward, 100),
    turn(outward, -100),
  ];

  const blockers = meshes.filter((m) => m.visible && m.userData.opacityTarget > 0.5);
  for (const dir of candidates) {
    const from = centre.clone().addScaledVector(dir, dist);
    viewRay.set(from, dir.clone().negate());
    const hit = viewRay.intersectObjects(blockers, false).find((h) => clipPlane.distanceToPoint(h.point) >= 0);
    if (!hit || hit.object === mesh) return dir;
  }
  return tilt(outward, 0.25);
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
    const card = Object.values(tools).find((t) => t.card.classList.contains('open'))?.card;
    if (card) ty -= (card.offsetTop + card.offsetHeight) / 2.5;
    else if (!panel.el.classList.contains('open')) ty += dock.el.offsetHeight / 2;
  } else {
    ty += dock.el.offsetHeight / 2;
    if (panel.el.classList.contains('open')) tx += panel.el.offsetWidth / 2;
    if (browser.isOpen()) tx -= document.getElementById('browser').offsetWidth / 2;
  }
  viewShift.tx = THREE.MathUtils.clamp(tx, -w * 0.3, w * 0.3);
  viewShift.ty = THREE.MathUtils.clamp(ty, -h * 0.3, h * 0.3);
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
let valveSet = null;
let flow = null;
let flowWanted = false;
// While blood flow is shown, these walls turn see-through so the blood inside is visible
const FLOW_SEE_THROUGH = ['chamber', 'wall', 'vessel'];
const meshById = new Map();
let hovered = null;
let selected = null;

const HOVER_GLOW = 0.45;
const SELECT_GLOW = 1;

function refreshGlow() {
  for (const m of meshes) {
    m.userData.glowTarget = m === selected ? SELECT_GLOW : m === hovered ? HOVER_GLOW : 0;
  }
}

function refreshFade() {
  const fadeOthers = !!selected?.userData.part?.inside;
  for (const m of meshes) {
    const layerOpacity = layers.opacityFor(m.userData.partId, m.userData.part);
    let target = layerOpacity;
    if (m === selected) target = 1;
    else if (fadeOthers) target = Math.min(layerOpacity, 0.07);
    else if (flowWanted && FLOW_SEE_THROUGH.includes(m.userData.part?.group)) target = Math.min(layerOpacity, 0.13);
    m.userData.opacityTarget = target;
  }
}

const panel = createPanel({
  onSelect: (id, opts) => select(id, opts),
  onClose: () => deselect(),
});

const browser = createBrowser({
  onSelect: (id, opts) => select(id, opts),
  onToggle: (open) => {
    if (open) closeTools();
    updateViewShiftTarget();
  },
});

const layers = createLayers({ onChange: () => refreshFade() });

const beat = createBeat({ reduceMotion });
const halo = createHalo(clipPlane);
scene.add(halo.mesh);
const dock = createDock(beat, {
  onFlow: (on) => {
    flowWanted = on;
    flow?.setOn(on);
    refreshFade();
  },
});
const rootStyle = document.documentElement.style;

// Layers and Slice cards: one open at a time
const tools = {
  layers: { btn: document.getElementById('layers-toggle'), card: document.getElementById('layers') },
  slice: { btn: document.getElementById('slice-toggle'), card: document.getElementById('slice') },
};
function openTool(name) {
  for (const [key, t] of Object.entries(tools)) {
    const open = key === name && !t.card.classList.contains('open');
    t.card.classList.toggle('open', open);
    t.card.setAttribute('aria-hidden', String(!open));
    t.btn.setAttribute('aria-expanded', String(open));
  }
  if (name && browser.isOpen()) browser.close();
  updateViewShiftTarget();
}
function closeTools() {
  for (const t of Object.values(tools)) {
    t.card.classList.remove('open');
    t.card.setAttribute('aria-hidden', 'true');
    t.btn.setAttribute('aria-expanded', 'false');
  }
  updateViewShiftTarget();
}
function toolsOpen() {
  return Object.values(tools).some((t) => t.card.classList.contains('open'));
}
tools.layers.btn.addEventListener('click', () => openTool('layers'));
tools.slice.btn.addEventListener('click', () => openTool('slice'));

// Slice
const heartBounds = new THREE.Box3();
const planeHelper = new THREE.Mesh(
  new THREE.RingGeometry(1.75, 1.77, 96),
  new THREE.MeshBasicMaterial({ color: 0xd9b56c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
);
planeHelper.renderOrder = 10;
planeHelper.visible = false;
scene.add(planeHelper);
let helperShownAt = -1e9;

const slice = createSlice({
  plane: clipPlane,
  getBounds: () => heartBounds,
  getViewDirection: () => controls.target.clone().sub(camera.position).normalize(),
  onChange: ({ on }) => {
    if (on && !heartBounds.isEmpty()) {
      const centre = heartBounds.getCenter(new THREE.Vector3());
      clipPlane.projectPoint(centre, planeHelper.position);
      planeHelper.lookAt(planeHelper.position.clone().add(clipPlane.normal));
      helperShownAt = performance.now();
    }
    pointerDirty = true;
  },
  onAim: (normal) => {
    if (heartBounds.isEmpty()) return;
    stopIdleSpin();
    const target = controls.target.clone();
    const dist = camera.position.distanceTo(target);
    flyTo(target, target.clone().addScaledVector(normal, -dist));
  },
});


uiReady = true;
requestAnimationFrame(updateViewShiftTarget);

function select(id, { fly = false, fromList = false } = {}) {
  const mesh = meshById.get(id);
  if (!mesh) return;
  selected = mesh;
  halo.attach(mesh.isMesh ? mesh : null);
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
loadHeart('/models/atrium-heart.glb', {
  clipPlane,
  onProgress: (p) => {
    loadingPct.textContent = `${Math.round(p * 100)}%`;
  },
})
  .then(({ root, meshes: m }) => {
    meshes = m;
    for (const mesh of meshes) {
      meshById.set(mesh.userData.partId, mesh);
      mesh.userData.glowTarget = 0;
      mesh.userData.opacityTarget = 1;
    }
    scene.add(root);
    root.updateMatrixWorld(true);
    for (const mesh of meshes) mesh.material.userData.invModel.value.copy(mesh.matrixWorld).invert();
    measureHeart(meshById);

    // Replace the atlas's still valves with hand-built leaflets that open and close
    valveSet = buildValves({ meshById, clipPlane });
    for (const v of valveSet.valves) {
      v.old.parent.remove(v.old);
      meshes.splice(meshes.indexOf(v.old), 1, v.mesh);
      meshById.set(v.id, v.mesh);
      scene.add(v.mesh);
    }
    scene.add(valveSet.chordae);
    meshes.push(valveSet.chordae);
    meshById.set('chordae_tendineae', valveSet.chordae);
    flow = createFlow({ meshById, valveSet, scene, clipPlane });
    flow.setOn(flowWanted);
    for (const mesh of [...valveSet.valves.map((v) => v.mesh), valveSet.chordae]) {
      mesh.userData.glowTarget = 0;
      mesh.userData.opacityTarget = 1;
    }
    for (const mesh of meshes) {
      if (['chamber', 'wall'].includes(mesh.userData.part?.group)) heartBounds.expandByObject(mesh);
    }
    slice.refresh();
    refreshFade();
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
raycaster.params.Line.threshold = 0.012;
const pointer = new THREE.Vector2();
let pointerClient = { x: 0, y: 0 };

function pick(clientX, clientY) {
  pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const pickable = meshes.filter((m) => m.visible && m.userData.opacityTarget > 0.5);
  const hits = raycaster.intersectObjects(pickable, false);
  const hit = hits.find((h) => clipPlane.distanceToPoint(h.point) >= 0);
  return hit ? hit.object : null;
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
    if (toolsOpen()) closeTools();
    else if (browser.isOpen() && (typing || !selected)) browser.close();
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

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const ease = reduceMotion ? 1 : 0.12;

  const info = beat.update(dt);
  valveSet?.update(info.av, info.sl);
  const simDt = beat.state.playing ? Math.min(dt, 0.1) / beat.state.slow : 0;
  flow?.update(simDt, info, camera, { top: 90, bottom: dock.el.getBoundingClientRect().top - 16 });
  dock.update(info);
  rim.intensity = RIM_BASE * (1 + 0.45 * info.v + 0.2 * info.a);
  rootStyle.setProperty('--pulse', (0.35 + 0.65 * Math.max(info.v * 0.9, info.a * 0.5)).toFixed(3));

  for (const m of meshes) {
    const mat = m.material;
    const glow = mat.userData.glow;
    const glowTarget = m === selected ? SELECT_GLOW * (0.8 + 0.2 * info.v) : m.userData.glowTarget;
    glow.value += (glowTarget - glow.value) * (reduceMotion ? 1 : 0.15);
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
    m.visible = mat.opacity > 0.01 || target > 0;
  }

  const haloTarget = selected ? 0.5 + 0.25 * info.v : 0;
  const haloNow = halo.opacity + (haloTarget - halo.opacity) * (reduceMotion ? 1 : 0.12);
  halo.setOpacity(haloNow);
  if (!selected && haloNow < 0.005) halo.attach(null);

  const sinceHelper = (performance.now() - helperShownAt) / 1000;
  planeHelper.material.opacity = slice.isOn() ? Math.max(0, 0.55 * (1 - Math.max(0, sinceHelper - 1.2) / 1.2)) : 0;
  planeHelper.visible = planeHelper.material.opacity > 0.01;

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
