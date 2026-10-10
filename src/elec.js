import * as THREE from 'three';
import { beatUniforms } from './beat.js';
import { PARTS } from './parts.js';

// The heart's electrical system: when each region is activated, the ECG it produces,
// and the conduction pathways drawn as glowing lines.

export const ELEC_COLOR = new THREE.Color('#ffe6ad');

// Shared with every heart material (see heart.js)
export const elecUniforms = {
  uElecOn: { value: 0 },
  uElecTau: { value: 0 },
  uSA: { value: new THREE.Vector3() },
  uVA: { value: 10 },
  uTQ: { value: 0.16 },
  uF: { value: 1 },
  uTTend: { value: 0.4 },
  uElecColor: { value: ELEC_COLOR.clone() },
};

// Which electrical region each part belongs to: 0 atria, 1 ventricles, 2 septum, -1 none
export function elecRegionFor(partId, part) {
  if (partId === 'right_atrium' || partId === 'left_atrium') return 0;
  if (partId === 'interventricular_septum') return 2;
  if (partId === 'right_ventricle' || partId === 'left_ventricle' || part?.group === 'papillary') return 1;
  return -1;
}

// Electrical timing, measured from the start of the P wave (tau). Typical adult values.
export function elecTimes(c) {
  const f = Math.pow(c.RR / 0.8, 0.4);
  const tP = c.tV - 0.2 * f; // P wave starts this long before the ventricles begin to squeeze (beat time)
  const pDur = 0.09 * f;
  const tQ = 0.16 * f; // PR interval
  const qrs = 0.085;
  const tTend = c.tES - tP; // the T wave ends about when the aortic valve shuts
  const tTstart = tTend - 0.16 * f;
  return { f, tP, pDur, tQ, qrs, tTend, tTstart, RR: c.RR };
}

const gauss = (x, mu, sd) => Math.exp(-0.5 * ((x - mu) / sd) ** 2);

// A textbook-shaped lead II trace in millivolts
export function ecgAt(tau, e) {
  const { f, pDur, tQ, tTend } = e;
  let v = 0;
  v += 0.15 * gauss(tau, pDur * 0.5, pDur * 0.22);
  v += -0.1 * gauss(tau, tQ + 0.012, 0.006);
  v += 1.0 * gauss(tau, tQ + 0.036, 0.009);
  v += -0.25 * gauss(tau, tQ + 0.06, 0.008);
  v += 0.3 * gauss(tau, tTend - 0.075 * f, 0.042 * f);
  return v;
}

export function elecPhases(e) {
  return [
    { id: 'p', start: 0, end: e.pDur, label: 'P', name: 'P wave', sub: 'The SA node fires, and a wave of activation sweeps across both atria.' },
    { id: 'pr', start: e.pDur, end: e.tQ, name: 'PR segment', sub: 'The signal is held at the AV node for a moment, so the atria can finish emptying.' },
    {
      id: 'qrs',
      start: e.tQ,
      end: e.tQ + e.qrs,
      label: 'QRS',
      name: 'QRS complex',
      sub: 'The signal races down the septum and through the Purkinje fibres. The ventricles are activated almost at once.',
    },
    { id: 'st', start: e.tQ + e.qrs, end: e.tTstart, name: 'ST segment', sub: 'Every ventricular cell is active, and the ventricles squeeze.' },
    { id: 't', start: e.tTstart, end: e.tTend, label: 'T', name: 'T wave', sub: 'The ventricles recover, ready for the next signal.' },
    { id: 'rest', start: e.tTend, end: e.RR, name: 'Electrical quiet', sub: 'The SA node slowly charges up until it fires again.' },
  ];
}

// Conduction pathways drawn as lines; each vertex knows when the signal reaches it
function lineMaterial(clipPlane) {
  const local = { uGlow: { value: 0 } };
  const material = new THREE.LineBasicMaterial({
    color: ELEC_COLOR,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    clippingPlanes: [clipPlane],
  });
  material.userData.glow = local.uGlow;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, beatUniforms, elecUniforms, local);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTime;\nvarying float vTime;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTime = aTime;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uElecTau;\nuniform float uElecOn;\nuniform float uGlow;\nvarying float vTime;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float d = (uElecTau - vTime) / 0.012;
        float pulse = exp(-0.5 * d * d);
        float after = smoothstep(0.0, 1.0, d) * exp(-max(uElecTau - vTime, 0.0) * 6.0);
        diffuseColor.rgb *= 0.35 + 2.2 * pulse + 0.6 * after + 0.8 * uGlow;
        diffuseColor.a *= uElecOn;`,
      );
  };
  material.customProgramCacheKey = () => 'atrium-elec-line';
  return material;
}

function nodeMaterial() {
  const local = { uGlow: { value: 0 }, uLevel: { value: 0 } };
  const material = new THREE.MeshBasicMaterial({
    color: ELEC_COLOR,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.userData.glow = local.uGlow;
  material.userData.level = local.uLevel;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, elecUniforms, local);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uElecOn;\nuniform float uGlow;\nuniform float uLevel;')
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb *= 0.4 + 1.8 * uLevel + 0.8 * uGlow;\ndiffuseColor.a *= uElecOn;',
      );
  };
  material.customProgramCacheKey = () => 'atrium-elec-node';
  return material;
}

function boxCentre(mesh) {
  return new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
}

function surfacePoints(mesh, filter) {
  const pos = mesh.geometry.attributes.position;
  const out = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 2) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    if (filter(v)) out.push(v.clone());
  }
  return out;
}

export function buildConduction({ meshById, valveSet, clipPlane }) {
  const apex = beatUniforms.uApex.value.clone();
  const axis = beatUniforms.uAxis.value.clone();
  const len = beatUniforms.uLen.value;
  const hOf = (p) => p.clone().sub(apex).dot(axis) / len;
  const vc = (id) => valveSet.valves.find((v) => v.id === id).m.c.clone();

  const ra = boxCentre(meshById.get('right_atrium'));
  const la = boxCentre(meshById.get('left_atrium'));
  const tric = vc('tricuspid_valve');
  const mitral = vc('mitral_valve');
  const septum = boxCentre(meshById.get('interventricular_septum'));
  const lvC = boxCentre(meshById.get('left_ventricle'));
  const rvC = boxCentre(meshById.get('right_ventricle'));

  // SA node: in the right atrial wall where the superior vena cava joins
  const svcPts = surfacePoints(meshById.get('superior_vena_cava'), () => true);
  let junction = svcPts[0];
  for (const p of svcPts) if (p.distanceTo(ra) < junction.distanceTo(ra)) junction = p;
  const sa = junction.clone().lerp(ra, 0.15);

  // AV node: low in the wall between the atria, between the two inlet valves
  const av = tric.clone().lerp(mitral, 0.38).addScaledVector(axis, 0.08);
  // His bundle: from the AV node into the top of the septum
  const hisEnd = av.clone().lerp(septum, 0.45);
  // Septal sideways direction (from right ventricle toward left)
  const side = lvC.clone().sub(rvC);
  side.sub(axis.clone().multiplyScalar(side.dot(axis))).normalize();
  const nearApex = apex.clone().lerp(septum, 0.42);

  // Timing
  const atrialFar = Math.max(sa.distanceTo(la) * 1.35, sa.distanceTo(av) * 1.2);

  const paths = [];
  const add = (id, points, t0, t1) => paths.push({ id, curve: new THREE.CatmullRomCurve3(points), t0, t1 });

  // Atrial pathways (times filled in per beat as fractions; stored as relative 0..1 of their phase)
  add('internodal_pathways', [sa, ra.clone().lerp(sa, 0.3), av], 'atria', 'av');
  add('internodal_pathways', [sa, sa.clone().lerp(la, 0.5).addScaledVector(axis, 0.25), la.clone().addScaledVector(axis, 0.2)], 'atria', 'atriaEnd');
  add('his_bundle', [av, av.clone().lerp(hisEnd, 0.5), hisEnd], 'his0', 'his1');
  add('bundle_branches', [hisEnd, septum.clone().addScaledVector(side, 0.09), nearApex.clone().addScaledVector(side, 0.12)], 'bb0', 'bb1');
  add('bundle_branches', [hisEnd, septum.clone().addScaledVector(side, -0.09), nearApex.clone().addScaledVector(side, -0.12)], 'bb0', 'bb1');

  // Purkinje fibres: from near the apex, fanning up the inside of both ventricles
  // Purkinje fibres: from the bundle branch near the apex, a fine net climbing the inside of each
  // ventricle wall. Each fibre follows the inner surface up one side of the chamber, with short twigs.
  const fan = (meshId, count, offset) => {
    const mesh = meshById.get(meshId);
    const centre = boxCentre(mesh);
    const e1 = side.clone();
    const e2 = new THREE.Vector3().crossVectors(axis, e1);
    const info = surfacePoints(mesh, () => true).map((p) => {
      const r = p.clone().sub(centre);
      r.sub(axis.clone().multiplyScalar(r.dot(axis)));
      return { p, h: hOf(p), ang: Math.atan2(r.dot(e2), r.dot(e1)), rad: r.length() };
    });
    const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    // The point on the inner wall at a given height and angle (the inner wall is the one nearest the middle)
    const wallPoint = (h, ang) => {
      const near = info.filter((q) => Math.abs(q.h - h) < 0.045 && angDiff(q.ang, ang) < 0.22);
      if (near.length < 3) return null;
      // Average the few points nearest the middle: a steady spot on the inner wall
      near.sort((x, y) => x.rad - y.rad);
      const pick = near.slice(0, 4);
      const p = pick.reduce((acc, q) => acc.add(q.p), new THREE.Vector3()).divideScalar(pick.length);
      const hh = pick.reduce((acc, q) => acc + q.h, 0) / pick.length;
      const axisPoint = apex.clone().addScaledVector(axis, hh * len);
      return p.lerp(axisPoint, 0.06);
    };
    const startSide = meshId === 'left_ventricle' ? 0.12 : -0.12;
    const bands = [0.2, 0.32, 0.44, 0.56, 0.68];
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * Math.PI * 2 + offset;
      const start = nearApex.clone().addScaledVector(side, startSide).addScaledVector(axis, 0.03 * (k % 3));
      const climb = [start];
      for (const h of bands) {
        const q = wallPoint(h, ang);
        if (q) climb.push(q);
      }
      if (climb.length < 3) continue;
      add('purkinje_fibres', climb, 'pk0', 'pk1');
      // Twigs: short side branches that make the fibres read as a net rather than a brush
      for (let i = 2; i < climb.length; i += 2) {
        const h = bands[Math.min(i - 1, bands.length - 1)] + 0.06;
        const twig = wallPoint(h, ang + (i % 4 === 0 ? 0.32 : -0.32));
        if (twig) add('purkinje_fibres', [climb[i], climb[i].clone().lerp(twig, 0.5), twig], 'pk0', 'pk1');
      }
    }
  };
  fan('left_ventricle', 10, 0.2);
  fan('right_ventricle', 7, 0.5);

  // Build one LineSegments per part
  const groups = {};
  for (const p of paths) (groups[p.id] ??= []).push(p);
  const objects = [];
  const lineInfos = [];
  for (const [id, list] of Object.entries(groups)) {
    const pos = [];
    const meta = [];
    for (const p of list) {
      const n = 24;
      const pts = p.curve.getSpacedPoints(n);
      for (let i = 0; i < n; i++) {
        pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        meta.push({ p, u: i / n }, { p, u: (i + 1) / n });
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aTime', new THREE.Float32BufferAttribute(new Float32Array(meta.length), 1));
    const line = new THREE.LineSegments(g, lineMaterial(clipPlane));
    line.name = id;
    line.userData.partId = id;
    line.userData.part = PARTS[id];
    line.frustumCulled = false;
    line.renderOrder = 30;
    objects.push(line);
    lineInfos.push({ line, meta });
  }

  // Nodes as small glowing spheres
  const nodeGeo = new THREE.SphereGeometry(0.045, 20, 14);
  const nodes = [
    ['sa_node', sa],
    ['av_node', av],
  ].map(([id, p]) => {
    const m = new THREE.Mesh(nodeGeo, nodeMaterial());
    m.position.copy(p);
    m.name = id;
    m.userData.partId = id;
    m.userData.part = PARTS[id];
    m.renderOrder = 31;
    m.updateMatrixWorld();
    objects.push(m);
    return m;
  });

  elecUniforms.uSA.value.copy(sa);

  let lastKey = '';
  function retime(e) {
    const key = `${e.RR.toFixed(4)}`;
    if (key === lastKey) return;
    lastKey = key;
    const tAtria = e.pDur * 0.95;
    elecUniforms.uVA.value = atrialFar / tAtria;
    elecUniforms.uTQ.value = e.tQ;
    elecUniforms.uF.value = e.f;
    elecUniforms.uTTend.value = e.tTend;
    const T = {
      atria: 0,
      av: sa.distanceTo(av) / elecUniforms.uVA.value,
      atriaEnd: tAtria,
      his0: e.tQ - 0.03 * e.f,
      his1: e.tQ - 0.01,
      bb0: e.tQ - 0.01,
      bb1: e.tQ + 0.012,
      pk0: e.tQ + 0.012,
      pk1: e.tQ + 0.035,
    };
    for (const { line, meta } of lineInfos) {
      const a = line.geometry.attributes.aTime;
      meta.forEach((m, i) => a.setX(i, T[m.p.t0] + (T[m.p.t1] - T[m.p.t0]) * m.u));
      a.needsUpdate = true;
    }
    return T;
  }

  let times = null;
  function update(beatState, on) {
    const c = beatState.times;
    const e = elecTimes(c);
    retime(e);
    times = e;
    let tau = (beatState.t - e.tP) % c.RR;
    if (tau < 0) tau += c.RR;
    elecUniforms.uElecTau.value = tau;
    elecUniforms.uElecOn.value += ((on ? 1 : 0) - elecUniforms.uElecOn.value) * 0.08;

    // SA node: a slow pacemaker ramp, then a flash as it fires. AV node: glows while it holds the signal.
    const saFire = Math.exp(-0.5 * (tau / 0.015) ** 2) + Math.exp(-0.5 * ((tau - c.RR) / 0.015) ** 2);
    const ramp = tau > e.tTend ? 0.35 * ((tau - e.tTend) / (c.RR - e.tTend)) ** 2 : 0;
    nodes[0].material.userData.level.value = Math.max(saFire, ramp);
    const avArrive = sa.distanceTo(av) / elecUniforms.uVA.value;
    const holding = tau > avArrive && tau < e.tQ - 0.02 ? 0.55 + 0.25 * Math.sin(tau * 60) : 0;
    nodes[1].material.userData.level.value = Math.max(holding, Math.exp(-0.5 * ((tau - avArrive) / 0.012) ** 2));

    const phases = elecPhases(e);
    const phase = phases.find((p) => tau >= p.start && tau < p.end) ?? phases[phases.length - 1];
    return { tau, e, phase, phases };
  }

  return { objects, nodes, update, times: () => times };
}
