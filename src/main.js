import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0d0809, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0, 9);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 16;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.25;

// A placeholder: a cloud of soft points, half venous blue, half arterial red.
const COUNT = 2400;
const positions = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);
const venous = new THREE.Color('#6f8fc9');
const arterial = new THREE.Color('#c2414a');
const tmp = new THREE.Color();

for (let i = 0; i < COUNT; i++) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = 1.6 * Math.cbrt(Math.random());
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  positions.set([x, y, z], i * 3);
  const mix = THREE.MathUtils.smoothstep(x, -0.6, 0.6);
  tmp.copy(venous).lerp(arterial, mix);
  colors.set([tmp.r, tmp.g, tmp.b], i * 3);
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const sprite = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

const material = new THREE.PointsMaterial({
  size: 0.09,
  map: sprite,
  vertexColors: true,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  opacity: 0.85,
});

const cloud = new THREE.Points(geometry, material);
scene.add(cloud);

// One heartbeat as a shape in time: a small atrial nudge, then the larger ventricular squeeze.
const BPM = 60;
document.getElementById('bpm').textContent = String(BPM);

function beatEnvelope(phase) {
  const bump = (p, start, length) => {
    if (p < start || p > start + length) return 0;
    const s = Math.sin(((p - start) / length) * Math.PI);
    return s * s;
  };
  return 0.25 * bump(phase, 0.0, 0.12) + 1.0 * bump(phase, 0.16, 0.3);
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) controls.autoRotate = false;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  const phase = ((t * BPM) / 60) % 1;
  const squeeze = reduceMotion ? 0 : beatEnvelope(phase);
  cloud.scale.setScalar(1 - 0.07 * squeeze);
  material.opacity = 0.7 + 0.25 * squeeze;
  controls.update();
  renderer.render(scene, camera);
});
