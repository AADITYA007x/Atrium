import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { PARTS } from './parts.js';

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

function materialFor(part) {
  const base = {
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ff9c8a'),
    side: THREE.DoubleSide,
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
  return new THREE.MeshPhysicalMaterial({ ...base, color: new THREE.Color(color) });
}

export function loadHeart(url, onProgress) {
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
          obj.material = materialFor(part);
          obj.material.emissive = new THREE.Color('#d9b56c');
          obj.material.emissiveIntensity = 0;
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
