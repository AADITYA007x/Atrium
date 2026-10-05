import * as THREE from 'three';
import { beatUniforms } from './beat.js';
import { VERTEX_HEAD } from './heart.js';

// Glowing particles that follow the blood's route: body -> right heart -> lungs -> left heart -> body.
// Each leg has a gate that decides when blood may move: valves must be open for it to pass.

const POOR = new THREE.Color('#6f8fc9');
const RICH = new THREE.Color('#e5505b');
const COUNT = 1400;

const smooth = (x) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};

function worldVertices(mesh) {
  const pos = mesh.geometry.attributes.position;
  const out = [];
  for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
  return out;
}

function centroidOf(points) {
  const c = new THREE.Vector3();
  for (const p of points) c.add(p);
  return c.divideScalar(points.length);
}

// Approximate a vessel's centre line: group its vertices by distance from a starting point
// and average each group (the rings of a tube average to its centre).
function centerline(mesh, from, bins = 8) {
  const verts = worldVertices(mesh);
  const d = verts.map((p) => p.distanceTo(from));
  const lo = Math.min(...d);
  const hi = Math.max(...d);
  const sums = Array.from({ length: bins }, () => ({ p: new THREE.Vector3(), n: 0 }));
  verts.forEach((p, i) => {
    const b = Math.min(bins - 1, Math.floor(((d[i] - lo) / (hi - lo + 1e-9)) * bins));
    sums[b].p.add(p);
    sums[b].n++;
  });
  return sums.filter((s) => s.n > 0).map((s) => s.p.divideScalar(s.n));
}

function boxCentre(mesh) {
  return new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
}

// A leg is a smooth path sampled into a lookup table for fast position-at-distance queries
function makeLeg(points, { gate = 'free', radius = 0.06, color = 'poor', deform = 1 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const n = Math.max(24, Math.round(curve.getLength() * 40));
  const samples = curve.getSpacedPoints(n);
  const len = [0];
  for (let i = 1; i < samples.length; i++) len.push(len[i - 1] + samples[i].distanceTo(samples[i - 1]));
  return { samples, len, length: len[len.length - 1], gate, radius, color, deform };
}

function pointOnLeg(leg, s, out) {
  const L = leg.len;
  let lo = 0;
  let hi = L.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (L[mid] < s) lo = mid;
    else hi = mid;
  }
  const t = (s - L[lo]) / Math.max(L[hi] - L[lo], 1e-9);
  return out.copy(leg.samples[lo]).lerp(leg.samples[hi], Math.min(Math.max(t, 0), 1));
}

export function createFlow({ meshById, valveSet, scene, clipPlane }) {
  const M = (id) => meshById.get(id);
  const valveCentre = (id) => valveSet.valves.find((v) => v.id === id).m.c.clone();
  const valveAxis = (id) => valveSet.valves.find((v) => v.id === id).m.axis.clone();

  const ra = boxCentre(M('right_atrium'));
  const la = boxCentre(M('left_atrium'));
  const tric = valveCentre('tricuspid_valve');
  const mitral = valveCentre('mitral_valve');
  const pulm = valveCentre('pulmonary_valve');
  const aortic = valveCentre('aortic_valve');
  const apex = beatUniforms.uApex.value.clone();
  const up = new THREE.Vector3(0, 1, 0);
  const heartCentre = ra.clone().add(la).multiplyScalar(0.5);

  // Deep points inside each ventricle, toward the apex from the inlet valve
  const rvDeep = tric.clone().addScaledVector(valveAxis('tricuspid_valve'), 0.75).lerp(apex, 0.15);
  const lvDeep = mitral.clone().lerp(apex, 0.62);

  // Vessel centre lines, ordered in the direction blood flows
  const svc = centerline(M('superior_vena_cava'), ra).reverse();
  const ivc = centerline(M('inferior_vena_cava'), ra).reverse();
  const pt = centerline(M('pulmonary_trunk'), pulm);
  const ptEnd = pt[pt.length - 1];
  const lpa = centerline(M('pulmonary_artery_left'), ptEnd);
  const rpa = centerline(M('pulmonary_artery_right'), ptEnd);
  const pvIds = ['pulmonary_vein_left_superior', 'pulmonary_vein_left_inferior', 'pulmonary_vein_right_superior', 'pulmonary_vein_right_inferior'];
  const pv = Object.fromEntries(pvIds.map((id) => [id, centerline(M(id), la, 5).reverse()]));
  const asc = centerline(M('ascending_aorta'), aortic);
  const ascEnd = asc[asc.length - 1];
  const arch = centerline(M('aortic_arch'), ascEnd, 10);
  const archNearest = (p) => arch.reduce((a, b) => (b.distanceTo(p) < a.distanceTo(p) ? b : a));
  const branch = (id) => {
    const c = centroidOf(worldVertices(M(id)));
    const start = archNearest(c);
    return [start, ...centerline(M(id), start, 4)];
  };
  const bca = branch('brachiocephalic_artery');
  const lcca = branch('left_common_carotid_artery');
  const lsa = branch('left_subclavian_artery');
  const desc = centerline(M('descending_aorta'), arch[arch.length - 1], 6);

  // Loops outside the model: the lungs and the body (not modelled; shown as gentle arcs)
  const last = (a) => a[a.length - 1];
  const first = (a) => a[0];
  const sideways = (p) => {
    const v = p.clone().sub(heartCentre);
    v.y = 0;
    return v.normalize();
  };
  function lungLoop(paEnd, pvStart) {
    const out = sideways(paEnd);
    const lung = paEnd.clone().addScaledVector(out, 1.9).addScaledVector(up, -0.2);
    return {
      points: [paEnd, paEnd.clone().addScaledVector(out, 0.8).addScaledVector(up, 0.25), lung, pvStart.clone().addScaledVector(sideways(pvStart), 0.9).addScaledVector(up, -0.2), pvStart],
      label: lung,
    };
  }
  function bodyLoop(fromEnd, toStart, dir) {
    // dir 1: up to the head and arms; dir -1: down to the rest of the body. Both swing out to the right side.
    const side = new THREE.Vector3(-1, 0, 0);
    const away = fromEnd.clone().addScaledVector(up, 0.9 * dir);
    const far = new THREE.Vector3(heartCentre.x - 1.2, fromEnd.y + (dir > 0 ? 1.5 : -2.3), heartCentre.z - 0.2);
    const back = toStart.clone().addScaledVector(up, 0.7 * dir).addScaledVector(side, 0.3);
    return { points: [fromEnd, away, far, back, toStart], label: far };
  }

  const labels = [];
  const legs = {};
  // Every route has one or more variants; each variant is a list of legs plus where blood goes next
  const route = (name, variants) => (legs[name] = { variants });
  const poorOpts = (o) => ({ ...o, color: 'poor' });
  const richOpts = (o) => ({ ...o, color: 'rich' });

  route('svc', [{ legs: [makeLeg([...svc, ra, tric], poorOpts({ gate: 'atrium', radius: 0.07 }))], next: () => 'rv' }]);
  route('ivc', [{ legs: [makeLeg([...ivc, ra, tric], poorOpts({ gate: 'atrium', radius: 0.08 }))], next: () => 'rv' }]);
  route('rv', [
    {
      legs: [makeLeg([tric, rvDeep, pulm], poorOpts({ gate: 'ventricle', radius: 0.16 })), makeLeg(pt, poorOpts({ gate: 'artery', radius: 0.07 }))],
      next: () => (Math.random() < 0.55 ? 'rpa' : 'lpa'),
    },
  ]);

  for (const [side, path, veins, label] of [
    ['lpa', lpa, ['pulmonary_vein_left_superior', 'pulmonary_vein_left_inferior'], 'Left lung'],
    ['rpa', rpa, ['pulmonary_vein_right_superior', 'pulmonary_vein_right_inferior'], 'Right lung'],
  ]) {
    for (const id of veins) route(id, [{ legs: [makeLeg([...pv[id], la, mitral], richOpts({ gate: 'atrium', radius: 0.05 }))], next: () => 'lv' }]);
    const loops = veins.map((id) => lungLoop(last(path), first(pv[id])));
    labels.push({ text: label, at: loops[0].label });
    const artery = makeLeg(path, poorOpts({ gate: 'artery', radius: 0.05 }));
    route(
      side,
      veins.map((id, i) => ({
        legs: [artery, makeLeg(loops[i].points, { gate: 'loop', color: 'change', radius: 0.05, deform: 0 })],
        next: () => id,
      })),
    );
  }

  route('lv', [
    {
      legs: [makeLeg([mitral, lvDeep, aortic], richOpts({ gate: 'ventricle', radius: 0.17 })), makeLeg([aortic, ...asc], richOpts({ gate: 'artery', radius: 0.08 }))],
      next: () => {
        const r = Math.random();
        return r < 0.12 ? 'bca' : r < 0.2 ? 'lcca' : r < 0.28 ? 'lsa' : 'desc';
      },
    },
  ]);

  const archUpTo = (p) => {
    let best = 0;
    arch.forEach((a, i) => {
      if (a.distanceTo(p) < arch[best].distanceTo(p)) best = i;
    });
    return arch.slice(0, best + 1);
  };
  const headLoop = (path) => bodyLoop(last(path), first(svc), 1);
  const lowerLoop = bodyLoop(last(desc), first(ivc), -1);
  labels.push({ text: 'Head and arms', at: headLoop(bca).label });
  labels.push({ text: 'Rest of the body', at: lowerLoop.label });
  for (const [name, path] of [
    ['bca', bca],
    ['lcca', lcca],
    ['lsa', lsa],
  ]) {
    route(name, [
      {
        legs: [
          makeLeg([ascEnd, ...archUpTo(path[0]), ...path.slice(1)], richOpts({ gate: 'artery', radius: 0.04 })),
          makeLeg(headLoop(path).points, { gate: 'loop', color: 'back', radius: 0.05, deform: 0 }),
        ],
        next: () => 'svc',
      },
    ]);
  }
  route('desc', [
    {
      legs: [makeLeg([ascEnd, ...arch, ...desc], richOpts({ gate: 'artery', radius: 0.07 })), makeLeg(lowerLoop.points, { gate: 'loop', color: 'back', radius: 0.07, deform: 0 })],
      next: () => 'ivc',
    },
  ]);

  // Particles
  const names = Object.keys(legs);
  const particles = [];
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const deforms = new Float32Array(COUNT);
  const sizes = new Float32Array(COUNT);

  function legsOf(p) {
    return p.variant.legs;
  }

  function enter(p, name) {
    const variants = legs[name].variants;
    p.variant = variants[Math.floor(Math.random() * variants.length)];
    p.leg = 0;
    p.s = 0;
  }

  for (let i = 0; i < COUNT; i++) {
    const p = {
      offset: new THREE.Vector3().randomDirection().multiplyScalar(Math.cbrt(Math.random())),
      jitter: Math.random(),
      speed: 0.85 + Math.random() * 0.3,
    };
    enter(p, names[Math.floor(Math.random() * names.length)]);
    const L = legsOf(p);
    p.leg = Math.floor(Math.random() * L.length);
    p.s = Math.random() * L[p.leg].length;
    sizes[i] = 0.75 + Math.random() * 0.5;
    particles.push(p);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aDeform', new THREE.BufferAttribute(deforms, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const sprite = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const fade = { value: 0 };
  const material = new THREE.PointsMaterial({
    size: 0.085,
    map: sprite,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    clippingPlanes: [clipPlane],
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, beatUniforms, {
      uSwell: { value: 0 },
      uInvModel: { value: new THREE.Matrix4() },
      uFade: fade,
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}\nattribute float aDeform;\nattribute float aSize;`)
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed = mix(transformed, atriumDeform(transformed, vec3(0.0)), aDeform);',
      )
      .replace('gl_PointSize = size;', 'gl_PointSize = size * aSize;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFade;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= uFade;');
  };
  material.customProgramCacheKey = () => 'atrium-flow';

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 20;
  points.visible = false;
  scene.add(points);

  // Labels for the places outside the model
  const labelEls = labels.map((l) => {
    const el = document.createElement('div');
    el.className = 'flow-label';
    el.textContent = l.text;
    document.body.append(el);
    return { ...l, el };
  });

  const tmp = new THREE.Vector3();
  const col = new THREE.Color();
  let on = false;

  function speedFor(gate, beat) {
    switch (gate) {
      case 'atrium':
        return 0.3 + 0.25 * beat.v + 1.4 * beat.av * (0.4 + 0.6 * Math.max(beat.a, 1 - beat.v));
      case 'ventricle':
        return beat.av > 0.3 ? 0.9 * beat.av : 3.2 * beat.e;
      case 'artery':
        return 0.2 + 3.6 * beat.e;
      default:
        return 0.9;
    }
  }

  function gateOpen(gate, beat) {
    if (gate === 'atrium') return beat.av > 0.25;
    if (gate === 'ventricle') return beat.sl > 0.25;
    return true;
  }

  function update(dtSim, beat, camera, safe = { top: 0, bottom: window.innerHeight }) {
    fade.value += ((on ? 1 : 0) - fade.value) * 0.08;
    points.visible = fade.value > 0.01;
    if (!points.visible) {
      for (const l of labelEls) l.el.classList.remove('visible');
      return;
    }

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      let L = legsOf(p);
      let leg = L[p.leg];
      p.s += speedFor(leg.gate, beat) * p.speed * dtSim;
      if (p.s >= leg.length) {
        if (!gateOpen(leg.gate, beat)) {
          p.s = leg.length - 0.02 - p.jitter * 0.12; // wait behind a closed valve
        } else {
          p.s -= leg.length;
          p.leg++;
          if (p.leg >= L.length) enter(p, p.variant.next());
          L = legsOf(p);
          leg = L[p.leg];
        }
      }
      pointOnLeg(leg, Math.min(p.s, leg.length), tmp);
      // Spread across the vessel or chamber, narrowing to a stream as it passes a valve
      const t = p.s / leg.length;
      const pinch = leg.gate === 'atrium' || leg.gate === 'ventricle' ? 0.35 + 0.65 * Math.sin(Math.PI * Math.min(Math.max(t, 0.02), 0.98)) : 1;
      tmp.addScaledVector(p.offset, leg.radius * pinch);
      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;
      deforms[i] = leg.deform;

      if (leg.color === 'rich') col.copy(RICH);
      else if (leg.color === 'change') col.copy(POOR).lerp(RICH, smooth((t - 0.35) / 0.3));
      else if (leg.color === 'back') col.copy(RICH).lerp(POOR, smooth((t - 0.35) / 0.3));
      else col.copy(POOR);
      const glow = leg.gate === 'artery' ? 1.0 + 0.6 * beat.e : leg.gate === 'loop' ? 0.75 : 1.05;
      colors[i * 3] = col.r * glow;
      colors[i * 3 + 1] = col.g * glow;
      colors[i * 3 + 2] = col.b * glow;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.aDeform.needsUpdate = true;

    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const l of labelEls) {
      tmp.copy(l.at).project(camera);
      const sx = ((tmp.x + 1) / 2) * w;
      const sy = ((1 - tmp.y) / 2) * h;
      const visible = on && tmp.z < 1 && sx > 20 && sx < w - 20 && sy > safe.top && sy < safe.bottom;
      l.el.classList.toggle('visible', visible);
      if (visible) l.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
    }
  }

  return {
    update,
    setOn(v) {
      on = v;
    },
    isOn: () => on,
  };
}
