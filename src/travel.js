import * as THREE from 'three';
import { beatUniforms } from './beat.js';
import { sliceUniform } from './heart.js';

// Travel inside: a glowing drop rides a network of paths through the heart, stopping in each chamber,
// waiting at each valve until it opens, and letting the visitor choose at every fork. The camera stays
// just outside and follows the drop, and the heart is cut open in front of it so its surroundings show.
// "Follow one drop of blood" walks the same network with the choices made for you.

const POOR = new THREE.Color('#6f8fc9');
const RICH = new THREE.Color('#e5505b');

const STATIONS = {
  svc: {
    name: 'Superior vena cava',
    blood: 'poor',
    text: 'Oxygen-poor blood from the head, neck and arms drains down this wide vein. Ahead, it opens into the right atrium.',
  },
  ivc: {
    name: 'Inferior vena cava',
    blood: 'poor',
    text: 'Blood from the legs, belly and pelvis rises through the largest vein in the body. Ahead, it opens into the right atrium.',
  },
  ra: {
    name: 'Right atrium',
    blood: 'poor',
    text: 'A thin-walled collecting room. Blood arrives from both venae cavae and from the heart’s own veins. Somewhere in the wall near the top, the SA node starts every heartbeat. Below lies the tricuspid valve.',
  },
  rv: {
    name: 'Right ventricle',
    blood: 'poor',
    text: 'Its wall is much thinner than the left ventricle’s: the trip through the lungs is short and needs little pressure. Papillary muscles and their cords hold the tricuspid leaflets. The way out is up, through the pulmonary valve.',
  },
  pt: {
    name: 'Pulmonary trunk',
    blood: 'poor',
    text: 'An artery that carries oxygen-poor blood, which is why it is blue. Just ahead it splits in two, one branch for each lung.',
  },
  lungL: {
    name: 'Left lung',
    blood: 'rich',
    outside: true,
    text: 'The lungs are not modelled in Atrium. Here the artery divides into capillaries so narrow that red blood cells pass in single file. Across a wall far thinner than a cell, carbon dioxide leaves and oxygen comes in. At rest each cell spends about three quarters of a second here.',
  },
  lungR: {
    name: 'Right lung',
    blood: 'rich',
    outside: true,
    text: 'The lungs are not modelled in Atrium. Here the artery divides into capillaries so narrow that red blood cells pass in single file. Across a wall far thinner than a cell, carbon dioxide leaves and oxygen comes in. At rest each cell spends about three quarters of a second here.',
  },
  la: {
    name: 'Left atrium',
    blood: 'rich',
    text: 'Oxygen-rich blood pours in from the lungs through the pulmonary veins. Below lies the mitral valve.',
  },
  lv: {
    name: 'Left ventricle',
    blood: 'rich',
    text: 'The thickest wall in the heart. Its squeeze sends blood to the whole body at roughly five times the pressure the right ventricle makes. The way out is the aortic valve, right beside the mitral valve.',
  },
  aorta: {
    name: 'Ascending aorta',
    blood: 'rich',
    text: 'Just above the valve, the two coronary arteries leave to feed the heart muscle first. Ahead the aorta arches over and sends out branches. Choose where to go.',
  },
  head: {
    name: 'Head and arms',
    blood: 'poor',
    outside: true,
    text: 'Not modelled in Atrium. In the capillaries of the brain, face and arms, blood gives up oxygen and turns oxygen-poor. The brain is about 2% of body weight but uses about a fifth of the body’s oxygen at rest.',
  },
  body: {
    name: 'Rest of the body',
    blood: 'poor',
    outside: true,
    text: 'Not modelled in Atrium. Through the gut, kidneys, muscles and legs, blood gives up its oxygen and heads home. At rest a trip all the way round the body takes about a minute.',
  },
};

const WAIT_TEXT = {
  av: (name) => `Waiting at the ${name}. It opens when the ventricle below relaxes and its pressure falls.`,
  sl: (name) => `Waiting at the ${name}. It opens only when the ventricle squeezes hard enough to beat the pressure in the artery.`,
};

// The guided journey: the choices one drop makes
const GUIDE = {
  ivc: 'ivc>ra',
  ra: 'ra>rv',
  rv: 'rv>pt',
  pt: 'pt>lungR',
  lungR: 'lungR>la#pulmonary_vein_right_inferior',
  la: 'la>lv',
  lv: 'lv>aorta',
  aorta: 'aorta>body',
  body: 'body>ivc',
};

const smoothstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// The same bending the heart's shaders apply, so the camera rides with the beating walls
const dTmp = new THREE.Vector3();
const rTmp = new THREE.Vector3();
const cTmp = new THREE.Vector3();
function deform(p, out) {
  const U = beatUniforms;
  const apex = U.uApex.value;
  const axis = U.uAxis.value;
  const len = U.uLen.value;
  const vent = U.uVent.value;
  out.copy(p);
  dTmp.copy(out).sub(apex);
  const hl = dTmp.dot(axis);
  const h = hl / len;
  const hc = Math.min(Math.max(h, 0), 1);
  const below = 1 - smoothstep(0.95, 1.15, h);
  rTmp.copy(dTmp).addScaledVector(axis, -hl);
  const wv = (0.35 + 0.65 * Math.sin(Math.PI * hc)) * below;
  out.addScaledVector(rTmp, -0.1 * vent * wv);

  const ang = 0.06 * vent * (hc - 0.5) * 2 * below;
  dTmp.copy(out).sub(apex);
  const hl2 = dTmp.dot(axis);
  rTmp.copy(dTmp).addScaledVector(axis, -hl2);
  cTmp.crossVectors(axis, rTmp);
  out.copy(apex).addScaledVector(axis, hl2).addScaledVector(rTmp, Math.cos(ang)).addScaledVector(cTmp, Math.sin(ang));

  const wl = h <= 1 ? hc : 1 - smoothstep(1, 1.8, h);
  out.addScaledVector(axis, -0.12 * len * vent * wl);

  const wa = smoothstep(0.95, 1.15, h) * (1 - smoothstep(1.7, 2.2, h));
  dTmp.copy(out).sub(U.uAtria.value);
  out.addScaledVector(dTmp, -0.07 * U.uAtr.value * wa);
  return out;
}

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

// Station points inside the chambers, chosen where each has the most room around it so the camera
// does not sit against a wall. Worked out once from atrium-heart.glb by casting rays in 14 directions
// from each point and moving it toward the largest clearance (too slow to repeat on every page load).
// If the model file changes, these need working out again.
const CAVITY = {
  ra: [-0.7048, -0.217, -0.0121],
  la: [-0.1718, 0.3263, -0.6864],
  rv: [-0.2211, -0.4337, 0.3808],
  lv: [0.675, -0.1635, 0.2476],
};
const cavity = (id) => new THREE.Vector3(...CAVITY[id]);


function curveOf(points) {
  const clean = [];
  for (const p of points) if (!clean.length || clean[clean.length - 1].distanceTo(p) > 0.03) clean.push(p.clone());
  if (clean.length < 2) clean.push(clean[0].clone().add(new THREE.Vector3(0, 0.01, 0)));
  const curve = new THREE.CatmullRomCurve3(clean, false, 'centripetal');
  return { curve, length: curve.getLength() };
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function ringTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(64, 64, 52, 0, Math.PI * 2);
  g.stroke();
  return new THREE.CanvasTexture(c);
}

// The part each stop sits in, glowed softly so it is clear where the drop is
const PART_AT = {
  svc: 'superior_vena_cava',
  ivc: 'inferior_vena_cava',
  ra: 'right_atrium',
  rv: 'right_ventricle',
  pt: 'pulmonary_trunk',
  la: 'left_atrium',
  lv: 'left_ventricle',
  aorta: 'ascending_aorta',
};

// How far the camera sits from the drop
const DIST = { chamber: 4.8, door: 3.9, outside: 8.5 };
const TRAIL = 16;

export function createTravel({ camera, controls, scene, clipPlane, reduceMotion, onEnter, onExit, onPlace }) {
  const el = document.getElementById('travel');
  const whereEl = el.querySelector('.travel-where');
  const nameEl = el.querySelector('.travel-name');
  const textEl = el.querySelector('.travel-text');
  const waitEl = el.querySelector('.travel-wait');
  const choicesEl = el.querySelector('.travel-choices');
  const leaveBtn = el.querySelector('.travel-leave');
  const toggle = document.getElementById('travel-toggle');

  let built = false;
  let active = false;
  let guided = false;
  let station = null;
  let move = null; // the edge being travelled
  let introOpen = false;
  let visitedBody = false;
  const pos = {};
  const edges = {};
  const centre = new THREE.Vector3();
  const saved = {};

  // The drop: a glowing core, a soft halo, a gold ring that pulses with the beat, and a fading trail
  const glow = glowTexture();
  const spriteOf = (map, scale, opacity) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, color: POOR.clone(), transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
    );
    s.scale.setScalar(scale);
    s.userData.opacity = opacity;
    s.renderOrder = 60;
    scene.add(s);
    return s;
  };
  const core = spriteOf(glow, 0.13, 1);
  const halo = spriteOf(glow, 0.42, 0.25);
  const ring = spriteOf(ringTexture(), 0.24, 0.7);
  ring.material.color.set('#e9c47a');
  const trail = Array.from({ length: TRAIL }, (_, i) => spriteOf(glow, 0.09 * (1 - i / TRAIL) + 0.02, 0.5 * (1 - i / TRAIL)));
  const history = [];
  let fade = 0;
  let historyClock = 0;

  function build({ meshById, valveSet }) {
    const M = (id) => meshById.get(id);
    const valve = (id) => valveSet.valves.find((v) => v.id === id).m;
    const up = new THREE.Vector3(0, 1, 0);

    const ra = cavity('ra');
    const la = cavity('la');
    const heartCentre = ra.clone().add(la).multiplyScalar(0.5);
    centre.copy(heartCentre);
    const tric = valve('tricuspid_valve');
    const mitral = valve('mitral_valve');
    const pulm = valve('pulmonary_valve');
    const aortic = valve('aortic_valve');
    const rvDeep = cavity('rv');
    const lvDeep = cavity('lv');

    const svc = centerline(M('superior_vena_cava'), ra).reverse();
    const ivc = centerline(M('inferior_vena_cava'), ra).reverse();
    const pt = centerline(M('pulmonary_trunk'), pulm.c);
    const ptEnd = pt[pt.length - 1];
    const lpa = centerline(M('pulmonary_artery_left'), ptEnd);
    const rpa = centerline(M('pulmonary_artery_right'), ptEnd);
    const asc = centerline(M('ascending_aorta'), aortic.c);
    const ascEnd = asc[asc.length - 1];
    const arch = centerline(M('aortic_arch'), ascEnd, 10);
    const desc = centerline(M('descending_aorta'), arch[arch.length - 1], 6);
    const last = (a) => a[a.length - 1];
    const sideways = (p) => {
      const v = p.clone().sub(heartCentre);
      v.y = 0;
      return v.normalize();
    };
    const archUpTo = (p) => {
      let best = 0;
      arch.forEach((a, i) => {
        if (a.distanceTo(p) < arch[best].distanceTo(p)) best = i;
      });
      return arch.slice(0, best + 1);
    };
    const branch = (id) => {
      const c = centroidOf(worldVertices(M(id)));
      const start = arch.reduce((a, b) => (b.distanceTo(c) < a.distanceTo(c) ? b : a));
      return [...archUpTo(start), ...centerline(M(id), start, 4).slice(1)];
    };

    // Stations
    Object.assign(pos, {
      svc: svc[Math.min(3, svc.length - 2)],
      ivc: ivc[Math.min(2, ivc.length - 2)],
      ra,
      rv: rvDeep,
      pt: ptEnd,
      la,
      lv: lvDeep,
      aorta: ascEnd,
    });
    const lungAt = (paEnd) => paEnd.clone().addScaledVector(sideways(paEnd), 1.9).addScaledVector(up, -0.2);
    pos.lungL = lungAt(last(lpa));
    pos.lungR = lungAt(last(rpa));
    const bcaPath = branch('brachiocephalic_artery');
    pos.head = new THREE.Vector3(heartCentre.x - 1.2, last(bcaPath).y + 1.5, heartCentre.z - 0.2);
    pos.body = new THREE.Vector3(heartCentre.x - 1.2, last(desc).y - 2.3, heartCentre.z - 0.2);


    const edge = (key, label, points, gate = null) => {
      const [from, rest] = key.split('>');
      const to = rest.split('#')[0];
      edges[key] = { key, from, to, label, gate, ...curveOf(points) };
    };
    // A valve crossing: approach to a door just before the valve, wait, then go through
    const valveEdge = (key, label, before, v, kind, after, valveName) => {
      const door = v.c.clone().addScaledVector(v.axis, -0.2);
      const [from, to] = key.split('>');
      const a = curveOf([...before, door]);
      const b = curveOf([door, v.c, ...after]);
      edges[key] = { key, from, to, label, gate: { kind, name: valveName }, approach: a, cross: b };
    };

    edge('svc>ra', 'Into the right atrium', [...svc.slice(Math.min(3, svc.length - 2)), ra]);
    edge('ivc>ra', 'Into the right atrium', [...ivc.slice(Math.min(2, ivc.length - 2)), ra]);
    valveEdge('ra>rv', 'Through the tricuspid valve', [ra], tric, 'av', [tric.c.clone().addScaledVector(tric.axis, 0.3), rvDeep], 'tricuspid valve');
    valveEdge('rv>pt', 'Through the pulmonary valve', [rvDeep], pulm, 'sl', pt.slice(1), 'pulmonary valve');

    for (const [side, path, veins] of [
      ['lungL', lpa, ['pulmonary_vein_left_superior', 'pulmonary_vein_left_inferior']],
      ['lungR', rpa, ['pulmonary_vein_right_superior', 'pulmonary_vein_right_inferior']],
    ]) {
      const end = last(path);
      edge(
        `pt>${side}`,
        side === 'lungL' ? 'Left pulmonary artery, to the left lung' : 'Right pulmonary artery, to the right lung',
        [ptEnd, ...path, end.clone().addScaledVector(sideways(end), 0.8).addScaledVector(up, 0.25), pos[side]],
      );
      for (const id of veins) {
        const pv = centerline(M(id), la, 5).reverse();
        const start = pv[0];
        const label = `Back by the ${id.includes('superior') ? 'upper' : 'lower'} pulmonary vein`;
        edge(`${side}>la#${id}`, label, [pos[side], start.clone().addScaledVector(sideways(start), 0.9).addScaledVector(up, -0.2), ...pv, la]);
      }
    }

    valveEdge('la>lv', 'Through the mitral valve', [la], mitral, 'av', [mitral.c.clone().addScaledVector(mitral.axis, 0.3), lvDeep], 'mitral valve');
    valveEdge('lv>aorta', 'Through the aortic valve', [lvDeep], aortic, 'sl', asc.slice(1), 'aortic valve');

    for (const [id, label] of [
      ['brachiocephalic_artery', 'Brachiocephalic artery, to the right arm and head'],
      ['left_common_carotid_artery', 'Left common carotid artery, to the head'],
      ['left_subclavian_artery', 'Left subclavian artery, to the left arm'],
    ]) {
      const path = branch(id);
      edge(`aorta>head#${id}`, label, [ascEnd, ...path, last(path).clone().addScaledVector(up, 0.9), pos.head]);
    }
    edge('aorta>body', 'Descending aorta, to the rest of the body', [ascEnd, ...arch, ...desc, last(desc).clone().addScaledVector(up, -0.9), pos.body]);

    const side = new THREE.Vector3(-1, 0, 0);
    edge('head>svc', 'Return through the superior vena cava', [pos.head, svc[0].clone().addScaledVector(up, 0.7).addScaledVector(side, 0.3), ...svc.slice(0, Math.min(4, svc.length - 1))]);
    edge('body>ivc', 'Return through the inferior vena cava', [pos.body, ivc[0].clone().addScaledVector(up, -0.7).addScaledVector(side, 0.3), ...ivc.slice(0, Math.min(3, ivc.length - 1))]);

    built = true;
  }
  function choicesFrom(id) {
    return Object.values(edges).filter((e) => e.from === id);
  }

  // UI
  function button(label, onClick, extra = '') {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = extra;
    b.textContent = label;
    b.addEventListener('click', onClick);
    li.append(b);
    return li;
  }

  function showIntro() {
    introOpen = true;
    document.body.classList.add('travel-card');
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    el.dataset.tone = '';
    whereEl.textContent = 'Travel inside';
    nameEl.textContent = 'Follow the blood';
    textEl.textContent =
      'A glowing drop travels through the beating heart, and the heart opens in front of it so you can always see where it is. It waits at each valve until it opens, and at every fork you choose the way.';
    waitEl.textContent = '';
    choicesEl.replaceChildren(
      button('Follow one drop of blood', () => start('ivc', true), 'primary'),
      button('Choose my own way, starting from the head', () => start('svc', false)),
      button('Choose my own way, starting from the body', () => start('ivc', false)),
    );
    leaveBtn.textContent = 'Close';
  }

  function hideCard() {
    introOpen = false;
    document.body.classList.remove('travel-card');
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function renderStation() {
    const s = STATIONS[station];
    el.dataset.tone = s.blood;
    whereEl.textContent = guided ? 'One drop of blood, now in the' : 'The drop is in the';
    nameEl.textContent = s.name;
    textEl.textContent = s.text;
    waitEl.textContent = '';
    leaveBtn.textContent = 'Stop travelling';
    if (guided) {
      const e = edges[GUIDE[station]];
      const items = [];
      if (station === 'body' && visitedBody) {
        textEl.textContent += ' That was the whole circuit: right heart, lungs, left heart, body.';
        items.push(button('Go around again', () => go(e), 'primary'));
      } else items.push(button(`Continue: ${e.label.charAt(0).toLowerCase()}${e.label.slice(1)}`, () => go(e), 'primary'));
      items.push(
        button('Choose my own way from here', () => {
          guided = false;
          renderStation();
        }),
      );
      choicesEl.replaceChildren(...items);
    } else {
      choicesEl.replaceChildren(...choicesFrom(station).map((e) => button(e.label, () => go(e))));
    }
  }

  function renderMoving() {
    const to = STATIONS[move.to];
    el.dataset.tone = to.blood;
    whereEl.textContent = 'Heading for the';
    nameEl.textContent = to.name;
    textEl.textContent = move.label + '.';
    waitEl.textContent = '';
    choicesEl.replaceChildren();
  }

  // Motion
  const dropRaw = new THREE.Vector3();
  const dropPos = new THREE.Vector3();
  const follow = new THREE.Vector3();
  const viewDir = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const delta = new THREE.Vector3();
  const color = POOR.clone();
  let dist = DIST.chamber;
  let cut = -1e6; // depth of the cut along the view direction
  let prevOpen = { av: 1, sl: 0 };
  let settle = 0; // seconds left of easing into a stop before the visitor takes over the zoom

  const isOutside = (id) => !!STATIONS[id]?.outside;

  function start(id, isGuided) {
    if (!built) return;
    guided = isGuided;
    visitedBody = false;
    if (!active) {
      active = true;
      Object.assign(saved, {
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance,
        enablePan: controls.enablePan,
      });
      controls.enablePan = false;
      controls.autoRotate = false;
      document.body.classList.add('traveling');
      onEnter();
      viewDir.copy(camera.position).sub(controls.target).normalize();
      dist = camera.position.distanceTo(controls.target);
      follow.copy(controls.target);
      cut = -1e6;
      history.length = 0;
    }
    // Arrive from outside the heart, down from the head or up from the body
    const entry = edges[id === 'svc' ? 'head>svc' : 'body>ivc'];
    go(entry);
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    introOpen = false;
  }

  function go(e) {
    move = { ...e, path: e.gate ? e.approach : e, phase: e.gate ? 'approach' : 'path', u: 0 };
    station = null;
    controls.enabled = false;
    onPlace(null);
    renderMoving();
  }

  function arrive(id) {
    station = id;
    move = null;
    if (id === 'body') visitedBody = true;
    settle = 1.5;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.enabled = true;
    onPlace(PART_AT[id] ?? null);
    renderStation();
  }

  function leave() {
    if (!active) {
      hideCard();
      return;
    }
    active = false;
    move = null;
    station = null;
    controls.minDistance = saved.minDistance;
    controls.maxDistance = saved.maxDistance;
    controls.enablePan = saved.enablePan;
    controls.enabled = true;
    document.body.classList.remove('traveling');
    onPlace(null);
    hideCard();
    onExit();
  }

  leaveBtn.addEventListener('click', leave);
  toggle.addEventListener('click', () => {
    if (active) leave();
    else if (introOpen) hideCard();
    else showIntro();
  });

  // Speed of the drop in model units per second: unhurried inside the heart, quicker on the long loops outside
  function speedFor(m) {
    if (m.phase === 'cross') return 0.7;
    return isOutside(m.from) || isOutside(m.to) ? 1.3 : 0.4;
  }

  function update(dt, info, playing, slow = 1) {
    dt = Math.min(dt, 0.05);
    fade += ((active ? 1 : 0) - fade) * (reduceMotion ? 1 : 0.06);
    for (const s of [core, halo, ring, ...trail]) {
      s.material.opacity = fade * s.userData.opacity;
      s.visible = fade > 0.01;
    }
    if (!active) {
      prevOpen = { av: info.av, sl: info.sl };
      return false;
    }

    sliceUniform.value = 1; // shade the cut surfaces
    let distTarget = DIST.chamber;
    if (move) {
      const m = move;
      if (m.phase === 'wait') {
        distTarget = DIST.door;
        const open = m.gate.kind === 'av' ? info.av : info.sl;
        const was = prevOpen[m.gate.kind];
        // Go on a fresh opening so the valve stays open long enough to pass;
        // in slow motion an already-open valve stays open long enough anyway
        const fresh = was < 0.5 && open >= 0.5;
        const canPass = playing ? fresh || (open > 0.95 && slow >= 3) : open > 0.6;
        if (canPass) {
          m.phase = 'cross';
          m.path = m.cross;
          m.u = 0;
          waitEl.textContent = '';
        } else {
          waitEl.textContent =
            !playing && open <= 0.6
              ? `The ${m.gate.name} is shut. Press play so the heart beats and it can open.`
              : WAIT_TEXT[m.gate.kind](m.gate.name);
        }
      } else {
        m.u = reduceMotion ? 1 : Math.min(1, m.u + (speedFor(m) * dt) / m.path.length);
        if (m.phase !== 'path' && m.u > 0.6) distTarget = DIST.door;
        if (m.phase === 'cross' && m.u < 0.4) distTarget = DIST.door;
        if (m.phase === 'approach') distTarget = m.u > 0.5 ? DIST.door : DIST.chamber;
        if (m.phase === 'path' && (isOutside(m.from) || isOutside(m.to))) {
          // Pull back while the drop is out in the lungs or body, come close again as it nears the heart
          const away = Math.min(1, m.path.curve.getPointAt(m.u, tmp).distanceTo(centre) / 2.2);
          distTarget = DIST.chamber + (DIST.outside - DIST.chamber) * smoothstep(0.35, 1, away);
        }
        m.path.curve.getPointAt(m.u, dropRaw);
        const fromC = m.from && STATIONS[m.from].blood === 'rich' ? RICH : POOR;
        const toC = STATIONS[m.to].blood === 'rich' ? RICH : POOR;
        color.copy(fromC).lerp(toC, smoothstep(0.35, 0.85, m.u));
        if (m.u >= 1) {
          if (m.phase === 'approach') {
            m.phase = 'wait';
          } else arrive(m.to);
        }
      }
    } else if (station) {
      dropRaw.copy(pos[station]);
      color.copy(STATIONS[station].blood === 'rich' ? RICH : POOR);
      distTarget = isOutside(station) ? DIST.outside : DIST.chamber;
    }

    // The drop rides with the beating walls
    deform(dropRaw, dropPos);
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 3);

    if (station && controls.enabled) {
      // Resting: the visitor may turn and zoom; keep the drop at the centre of the turn
      delta.copy(dropPos).sub(controls.target);
      controls.target.add(delta);
      camera.position.add(delta);
      viewDir.copy(camera.position).sub(controls.target).normalize();
      dist = camera.position.distanceTo(controls.target);
      settle = Math.max(0, settle - dt);
      if (settle > 0) {
        dist += (distTarget - dist) * k;
        camera.position.copy(controls.target).addScaledVector(viewDir, dist);
      }
    } else {
      follow.lerp(dropPos, k);
      dist += (distTarget - dist) * k;
      controls.target.copy(follow);
      camera.position.copy(follow).addScaledVector(viewDir, dist);
      camera.lookAt(follow);
    }

    // Cut the heart open just in front of the drop, facing the camera; no cut when the drop is far outside
    const n = tmp.copy(viewDir).negate();
    const far = dropPos.distanceTo(centre) > 2.4;
    const cutTarget = far ? n.dot(centre) - 4 : n.dot(dropPos) - 0.2;
    cut += (cutTarget - cut) * (reduceMotion || cut < -1e5 ? 1 : 1 - Math.exp(-dt * 4));
    clipPlane.normal.copy(n);
    clipPlane.constant = -cut;

    // Drop visuals
    const pulse = 1 + 0.12 * info.v;
    core.position.copy(dropPos);
    halo.position.copy(dropPos);
    ring.position.copy(dropPos);
    core.scale.setScalar(0.13 * pulse);
    ring.scale.setScalar(0.24 * (1 + 0.25 * info.v));
    core.material.color.copy(color).multiplyScalar(1.1);
    halo.material.color.copy(color);
    historyClock += dt;
    if (historyClock > 0.04) {
      historyClock = 0;
      history.unshift(dropPos.clone());
      if (history.length > TRAIL) history.pop();
    }
    trail.forEach((s, i) => {
      const p = history[Math.min(i + 1, history.length - 1)] ?? dropPos;
      s.position.copy(p);
      s.material.color.copy(color);
    });

    prevOpen = { av: info.av, sl: info.sl };
    // True while the journey drives the camera rather than the visitor
    return !(station && controls.enabled);
  }

  return {
    build,
    update,
    leave,
    isActive: () => active,
    isOpen: () => active || introOpen,
  };
}
