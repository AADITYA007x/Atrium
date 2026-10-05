import * as THREE from 'three';
import { PARTS } from './parts.js';
import { materialFor, lineMaterialFor } from './heart.js';
import { beatUniforms } from './beat.js';

// Hand-built leaflets placed inside the atlas valve rings.
// span: share of the ring in degrees; len: leaflet length relative to ring radius.
const SPECS = {
  mitral_valve: {
    kind: 'av',
    // The larger anterior leaflet faces the aortic valve, as in a real heart
    faceToward: 'aortic_valve',
    leaflets: [
      { span: 150, len: 0.95 },
      { span: 210, len: 0.62 },
    ],
    papillary: ['papillary_anterolateral', 'papillary_posteromedial'],
  },
  tricuspid_valve: {
    kind: 'av',
    // The septal leaflet faces the septum
    faceToward: 'interventricular_septum',
    leaflets: [
      { span: 120, len: 0.75 },
      { span: 140, len: 0.9 },
      { span: 100, len: 0.7 },
    ],
    papillary: ['papillary_anterior', 'papillary_posterior', 'papillary_medial'],
  },
  aortic_valve: {
    kind: 'sl',
    downstream: 'ascending_aorta',
    // Two cusps are turned to face the openings of the coronary arteries
    coronary: ['right_coronary_artery', 'left_coronary_artery'],
    leaflets: [
      { span: 120, len: 0.95 },
      { span: 120, len: 0.95 },
      { span: 120, len: 0.95 },
    ],
  },
  pulmonary_valve: {
    kind: 'sl',
    downstream: 'pulmonary_trunk',
    faceToward: 'aortic_valve',
    leaflets: [
      { span: 120, len: 0.95 },
      { span: 120, len: 0.95 },
      { span: 120, len: 0.95 },
    ],
  },
};

const U = 18;
const V = 9;
const smooth = (x) => x * x * (3 - 2 * x);

function worldVertices(mesh) {
  const pos = mesh.geometry.attributes.position;
  const out = [];
  for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
  return out;
}

function centroid(points) {
  const c = new THREE.Vector3();
  for (const p of points) c.add(p);
  return c.divideScalar(points.length);
}

function closestTo(mesh, target) {
  let best = Infinity;
  const out = new THREE.Vector3();
  for (const p of worldVertices(mesh)) {
    const d = p.distanceToSquared(target);
    if (d < best) {
      best = d;
      out.copy(p);
    }
  }
  return out;
}

function percentile(values, q) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

function projectOnPlane(v, axis) {
  return v.clone().sub(axis.clone().multiplyScalar(v.dot(axis)));
}

// Measure a valve ring from the atlas mesh: centre, flow direction, radius and a reference direction
function measure(id, spec, meshById) {
  const mesh = meshById.get(id);
  const verts = worldVertices(mesh);
  const c = centroid(verts);
  let axis;
  if (spec.kind === 'av') {
    axis = beatUniforms.uAxis.value.clone().negate(); // atrium toward apex
  } else {
    const near = worldVertices(meshById.get(spec.downstream)).filter((p) => p.distanceTo(c) < 0.6);
    axis = (near.length ? centroid(near) : c.clone().add(beatUniforms.uAxis.value)).sub(c).normalize();
  }
  const radial = verts.map((p) => projectOnPlane(p.clone().sub(c), axis).length());
  const R = 0.5 * (percentile(radial, 0.5) + percentile(radial, 0.9));

  let ref;
  if (spec.coronary) {
    ref = projectOnPlane(closestTo(meshById.get(spec.coronary[0]), c).sub(c), axis).normalize();
  } else {
    const towardC = new THREE.Box3().setFromObject(meshById.get(spec.faceToward)).getCenter(new THREE.Vector3());
    ref = projectOnPlane(towardC.sub(c), axis).normalize();
  }
  const e1 = ref;
  const e2 = new THREE.Vector3().crossVectors(axis, e1).normalize();

  // Spin the aortic cusps so the second one faces the left coronary opening too
  let flip = 1;
  if (spec.coronary) {
    const lca = projectOnPlane(closestTo(meshById.get(spec.coronary[1]), c).sub(c), axis).normalize();
    const angleOf = (v) => Math.atan2(v.dot(e2), v.dot(e1));
    flip = angleOf(lca) >= 0 ? 1 : -1;
  }
  return { c, axis, R, e1, e2, flip };
}

function leafletLayout(spec, flip) {
  // Centre the first leaflet on the reference direction, then go round
  const out = [];
  let start = -spec.leaflets[0].span / 2;
  for (const l of spec.leaflets) {
    const a0 = THREE.MathUtils.degToRad(start) * flip;
    const a1 = THREE.MathUtils.degToRad(start + l.span) * flip;
    out.push({ a0: Math.min(a0, a1), a1: Math.max(a0, a1), len: l.len });
    start += l.span;
  }
  return out;
}

function buildGeometry(leafletCount) {
  const g = new THREE.BufferGeometry();
  const perLeaf = (U + 1) * (V + 1);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(perLeaf * leafletCount * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(perLeaf * leafletCount * 3), 3));
  const idx = [];
  for (let l = 0; l < leafletCount; l++) {
    const o = l * perLeaf;
    for (let v = 0; v < V; v++)
      for (let u = 0; u < U; u++) {
        const a = o + v * (U + 1) + u;
        const b = a + 1;
        const c = a + (U + 1);
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
  }
  g.setIndex(idx);
  return g;
}

const tmp = new THREE.Vector3();
const dirTmp = new THREE.Vector3();

function leafletPoint(out, m, kind, leaf, u, v, open) {
  const theta = leaf.a0 + u * (leaf.a1 - leaf.a0);
  const mid = (leaf.a0 + leaf.a1) / 2;
  const R = m.R;
  const edge = 0.55 + 0.45 * Math.sin(Math.PI * u); // shorter near the commissures

  let rC, zC, thC, rO, zO, thO;
  if (kind === 'av') {
    // Shut: leaflets meet in the middle, domed slightly back toward the atrium
    rC = R * (1 - v);
    zC = R * (0.06 * v - 0.12 * Math.sin(Math.PI * v) * Math.sin(Math.PI * u));
    thC = theta;
    // Open: hanging down into the ventricle like a funnel, gaps at the commissures
    thO = mid + (theta - mid) * (1 - 0.14 * v);
    rO = R * (1 - 0.24 * v);
    zO = R * leaf.len * edge * v;
  } else {
    // Shut: three pockets meet in the middle, bellied back toward the ventricle
    rC = R * (1 - v);
    zC = R * (0.12 * v - 0.32 * Math.sin(Math.PI * v) * (0.6 + 0.4 * Math.sin(Math.PI * u)));
    thC = theta;
    // Open: pressed back against the artery wall
    thO = mid + (theta - mid) * (1 - 0.1 * v);
    rO = R * (0.97 - 0.07 * v);
    zO = R * leaf.len * (0.75 + 0.25 * Math.sin(Math.PI * u)) * v;
  }
  const k = smooth(open);
  const r = rC + (rO - rC) * k;
  const z = zC + (zO - zC) * k;
  const th = thC + (thO - thC) * k;
  dirTmp.copy(m.e1).multiplyScalar(Math.cos(th)).addScaledVector(m.e2, Math.sin(th));
  return out.copy(m.c).addScaledVector(dirTmp, r).addScaledVector(m.axis, z);
}

export function buildValves({ meshById, clipPlane }) {
  const valves = [];
  for (const [id, spec] of Object.entries(SPECS)) {
    const old = meshById.get(id);
    const m = measure(id, spec, meshById);
    const leaves = leafletLayout(spec, m.flip);
    const geometry = buildGeometry(leaves.length);
    const mesh = new THREE.Mesh(geometry, materialFor(PARTS[id], id, clipPlane));
    mesh.name = id;
    mesh.userData.partId = id;
    mesh.userData.part = PARTS[id];
    mesh.frustumCulled = false;
    valves.push({ id, spec, m, leaves, mesh, old, last: -1 });
  }

  // Chordae: from points on each AV leaflet edge to the tip of the nearest papillary muscle
  const cords = [];
  for (const valve of valves.filter((x) => x.spec.kind === 'av')) {
    const tips = valve.spec.papillary.map((pid) => closestTo(meshById.get(pid), valve.m.c));
    valve.leaves.forEach((leaf, li) => {
      for (const [u, v] of [
        [0.18, 1],
        [0.4, 1],
        [0.62, 1],
        [0.84, 1],
        [0.3, 0.7],
        [0.7, 0.7],
      ]) {
        const anchor = leafletPoint(new THREE.Vector3(), valve.m, 'av', leaf, u, v, 0);
        let tip = tips[0];
        for (const t of tips) if (t.distanceTo(anchor) < tip.distanceTo(anchor)) tip = t;
        cords.push({ valve, leaf, u, v, tip });
      }
    });
  }
  const cordGeometry = new THREE.BufferGeometry();
  cordGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cords.length * 6), 3));
  const chordae = new THREE.LineSegments(cordGeometry, lineMaterialFor('#efe1cf', clipPlane));
  chordae.name = 'chordae_tendineae';
  chordae.userData.partId = 'chordae_tendineae';
  chordae.userData.part = PARTS.chordae_tendineae;
  chordae.frustumCulled = false;

  function update(av, sl, force = false) {
    for (const valve of valves) {
      const open = valve.spec.kind === 'av' ? av : sl;
      if (!force && Math.abs(open - valve.last) < 1e-4) continue;
      valve.last = open;
      const pos = valve.mesh.geometry.attributes.position;
      let i = 0;
      for (const leaf of valve.leaves)
        for (let v = 0; v <= V; v++)
          for (let u = 0; u <= U; u++) {
            leafletPoint(tmp, valve.m, valve.spec.kind, leaf, u / U, v / V, open);
            pos.setXYZ(i++, tmp.x, tmp.y, tmp.z);
          }
      pos.needsUpdate = true;
      valve.mesh.geometry.computeVertexNormals();
      valve.mesh.geometry.computeBoundingSphere();
      valve.mesh.geometry.computeBoundingBox();
    }
    const cp = cordGeometry.attributes.position;
    cords.forEach((cord, i) => {
      leafletPoint(tmp, cord.valve.m, 'av', cord.leaf, cord.u, cord.v, av);
      cp.setXYZ(i * 2, tmp.x, tmp.y, tmp.z);
      cp.setXYZ(i * 2 + 1, cord.tip.x, cord.tip.y, cord.tip.z);
    });
    cp.needsUpdate = true;
    cordGeometry.computeBoundingSphere();
  }

  update(1, 0, true);
  return { valves, chordae, update };
}
