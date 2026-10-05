import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { PARTS } from './parts.js';
import { beatUniforms } from './beat.js';

const COLORS = {
  muscle: '#76232a',
  atrium: '#81302f',
  valve: '#e6cdb9',
  papillary: '#94383a',
  rich: '#b0333d',
  poor: '#4b6498',
  coronaryArtery: '#d8434c',
  cardiacVein: '#7e9bd6',
};

// Colours seen where the knife has cut through tissue (the inside of a wall)
const CUT_COLORS = {
  muscle: '#9c443f',
  valve: '#efdccb',
  rich: '#c45a61',
  poor: '#7890c0',
};

// How much each artery widens as blood is pushed into it (model units)
const SWELL = {
  ascending_aorta: 0.03,
  aortic_arch: 0.025,
  pulmonary_trunk: 0.03,
  pulmonary_artery_left: 0.02,
  pulmonary_artery_right: 0.02,
  descending_aorta: 0.015,
  brachiocephalic_artery: 0.01,
  left_common_carotid_artery: 0.008,
  left_subclavian_artery: 0.008,
};

// Shared by every material: 0 when the heart is whole, 1 while a slice is active
export const sliceUniform = { value: 0 };
const glowColor = { value: new THREE.Color('#f0c879') };

function cutColorFor(part) {
  switch (part?.group) {
    case 'valve':
      return CUT_COLORS.valve;
    case 'vessel':
    case 'coronaryArtery':
    case 'cardiacVein':
      return part.blood === 'poor' ? CUT_COLORS.poor : CUT_COLORS.rich;
    default:
      return CUT_COLORS.muscle;
  }
}

export const VERTEX_HEAD = /* glsl */ `
uniform vec3 uApex;
uniform vec3 uAxis;
uniform float uLen;
uniform vec3 uAtria;
uniform float uVent;
uniform float uAtr;
uniform float uEject;
uniform float uSwell;
uniform mat4 uInvModel;

vec3 atriumDeform(vec3 p, vec3 n) {
  vec3 d = p - uApex;
  float hl = dot(d, uAxis);
  float h = hl / uLen;
  float hc = clamp(h, 0.0, 1.0);
  float belowValves = 1.0 - smoothstep(0.95, 1.15, h);

  // Ventricles squeeze inward, most in the middle
  vec3 radial = d - uAxis * hl;
  float wv = (0.35 + 0.65 * sin(3.14159 * hc)) * belowValves;
  p -= radial * (0.1 * uVent * wv);

  // A gentle wringing twist: apex and base turn opposite ways
  float ang = 0.06 * uVent * (hc - 0.5) * 2.0 * belowValves;
  vec3 r2 = p - uApex;
  float hl2 = dot(r2, uAxis);
  vec3 rad2 = r2 - uAxis * hl2;
  p = uApex + uAxis * hl2 + rad2 * cos(ang) + cross(uAxis, rad2) * sin(ang);

  // The valve plane pulls down toward the apex; the atria stretch, their roofs held by the veins
  float wl = h <= 1.0 ? hc : 1.0 - smoothstep(1.0, 1.8, h);
  p -= uAxis * (0.12 * uLen * uVent * wl);

  // Atria squeeze just before the ventricles
  float wa = smoothstep(0.95, 1.15, h) * (1.0 - smoothstep(1.7, 2.2, h));
  p -= (p - uAtria) * (0.07 * uAtr * wa);

  // Arteries widen as blood is pushed into them
  p += n * (uSwell * uEject);
  return p;
}
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform vec3 uCutColor;
uniform float uSliceOn;
uniform float uGlow;
uniform vec3 uGlowColor;
`;

export function materialFor(part, partId, clipPlane) {
  const base = {
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ff9c8a'),
    side: THREE.DoubleSide,
    clippingPlanes: [clipPlane],
  };
  let color = COLORS.muscle;
  switch (part?.group) {
    case 'chamber':
      color = part.name.includes('atrium') ? COLORS.atrium : COLORS.muscle;
      break;
    case 'wall':
      color = COLORS.muscle;
      break;
    case 'valve':
      color = COLORS.valve;
      base.roughness = 0.4;
      base.sheenColor = new THREE.Color('#fff1e6');
      break;
    case 'papillary':
      color = COLORS.papillary;
      break;
    case 'vessel':
      color = part.blood === 'rich' ? COLORS.rich : COLORS.poor;
      if (part.blood === 'poor') base.sheenColor = new THREE.Color('#b8ccff');
      break;
    case 'coronaryArtery':
      color = COLORS.coronaryArtery;
      base.clearcoat = 0.6;
      break;
    case 'cardiacVein':
      color = COLORS.cardiacVein;
      base.sheenColor = new THREE.Color('#c8d6ff');
      break;
  }

  const material = new THREE.MeshPhysicalMaterial({ ...base, color: new THREE.Color(color) });
  const local = {
    uCutColor: { value: new THREE.Color(cutColorFor(part)) },
    uGlow: { value: 0 },
    uSwell: { value: SWELL[partId] ?? 0 },
    uInvModel: { value: new THREE.Matrix4() },
  };
  material.userData.glow = local.uGlow;
  material.userData.invModel = local.uInvModel;
  material.userData.swell = local.uSwell;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, beatUniforms, local, { uSliceOn: sliceUniform, uGlowColor: glowColor });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 atriumW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vec3 atriumN = normalize(mat3(modelMatrix) * objectNormal);
        atriumW = atriumDeform(atriumW, atriumN);
        transformed = (uInvModel * vec4(atriumW, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nif ( !gl_FrontFacing ) diffuseColor.rgb = mix( diffuseColor.rgb, uCutColor, uSliceOn );',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float atriumFres = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
        atriumFres = pow(atriumFres, 3.5);
        totalEmissiveRadiance += uGlowColor * (atriumFres * 0.9 + 0.035) * uGlow;`,
      );
  };
  material.customProgramCacheKey = () => 'atrium-v4';
  return material;
}

// Thin lines (the chordae) that bend with the beat and brighten when selected
export function lineMaterialFor(color, clipPlane) {
  const local = { uGlow: { value: 0 } };
  const material = new THREE.LineBasicMaterial({ color: new THREE.Color(color), clippingPlanes: [clipPlane], transparent: true, opacity: 1 });
  material.userData.glow = local.uGlow;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, beatUniforms, local, {
      uSwell: { value: 0 },
      uInvModel: { value: new THREE.Matrix4() },
      uGlowColor: glowColor,
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = atriumDeform(transformed, vec3(0.0));');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow;\nuniform vec3 uGlowColor;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uGlowColor * 1.4, clamp(uGlow, 0.0, 1.0) * 0.85);');
  };
  material.customProgramCacheKey = () => 'atrium-line';
  return material;
}

// A soft gold outline drawn just outside the selected part, moving with the beat
export function createHalo(clipPlane) {
  const local = {
    uSwell: { value: 0 },
    uInvModel: { value: new THREE.Matrix4() },
    uHaloWidth: { value: 0.022 },
    uHaloOpacity: { value: 0 },
  };
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#f0c879'),
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    clippingPlanes: [clipPlane],
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, beatUniforms, local);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}\nuniform float uHaloWidth;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 atriumW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vec3 atriumN = normalize(mat3(modelMatrix) * normal);
        atriumW = atriumDeform(atriumW, atriumN) + atriumN * uHaloWidth;
        transformed = (uInvModel * vec4(atriumW, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uHaloOpacity;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= uHaloOpacity;');
  };
  material.customProgramCacheKey = () => 'atrium-halo';
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.matrixAutoUpdate = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.visible = false;

  let attached = false;
  return {
    mesh,
    attach(target) {
      attached = !!target;
      if (!target) {
        mesh.visible = false;
        return;
      }
      mesh.geometry = target.geometry;
      mesh.matrix.copy(target.matrixWorld);
      mesh.matrixWorld.copy(target.matrixWorld);
      local.uInvModel.value.copy(target.material.userData.invModel.value);
      local.uSwell.value = target.material.userData.swell.value;
      const r = new THREE.Box3().setFromObject(target).getBoundingSphere(new THREE.Sphere()).radius;
      local.uHaloWidth.value = THREE.MathUtils.clamp(r * 0.025, 0.012, 0.03);
    },
    setOpacity(o) {
      local.uHaloOpacity.value = o;
      mesh.visible = attached && o > 0.005;
    },
    get opacity() {
      return local.uHaloOpacity.value;
    },
  };
}

export function loadHeart(url, { onProgress, clipPlane }) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        const meshes = [];
        root.traverse((obj) => {
          if (!obj.isMesh) return;
          const key = obj.name in PARTS ? obj.name : obj.parent?.name;
          const part = PARTS[key];
          obj.userData.partId = key;
          obj.userData.part = part;
          obj.material = materialFor(part, key, clipPlane);
          obj.frustumCulled = false;
          meshes.push(obj);
        });
        resolve({ root, meshes });
      },
      (event) => {
        if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
      },
      reject,
    );
  });
}
