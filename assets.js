import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const models = new Map();
const icons = new Map();
const readiness = new WeakMap();
const queue = [];
let active = 0;
let loaded = 0;
const failed = new Set();

function showProgress() {
  const status = document.getElementById('model-status');
  if (!status) return;
  const pending = active + queue.length;
  const message = pending ? 'Loading island models · ' + loaded + ' / ' + (loaded + pending)
    : failed.size ? 'Some island models could not load. Reload to try again.' : '';
  status.hidden = !message;
  status.textContent = message;
}

function startDownloads() {
  while (active < 5 && queue.length) {
    const {slug, resolve, reject} = queue.shift();
    active++;
    loader.loadAsync('assets/' + slug + '.glb').then(({scene}) => {
      const bounds = new T.Box3().setFromObject(scene, true);
      const center = bounds.getCenter(new T.Vector3());
      const size = bounds.getSize(new T.Vector3());
      const model = new T.Group();
      scene.position.sub(new T.Vector3(center.x, bounds.min.y, center.z));
      model.add(scene);
      scene.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          for(const material of [].concat(node.material)){if(material.map)material.map.anisotropy=4}
        }
      });
      failed.delete(slug);
      loaded++;
      resolve({model, size});
    }).catch(error => {
      failed.add(slug);
      models.delete(slug);
      reject(error);
    }).finally(() => {
      active--;
      startDownloads();
    });
  }
  showProgress();
}

function load(slug) {
  if (!models.has(slug)) {
    models.set(slug, new Promise((resolve, reject) => {
      queue.push({slug, resolve, reject});
      startDownloads();
    }));
  }
  return models.get(slug);
}

export function placeAsset(parent, slug, position, dimensions, yaw = 0) {
  const holder = new T.Group();
  holder.name = slug;
  holder.position.fromArray(position);
  holder.rotation.y = yaw;
  parent.add(holder);
  const ready = load(slug).then(({model, size}) => {
    const instance = model.clone(true);
    instance.scale.set(...dimensions.map((length, axis) =>
      length / Math.max(size.getComponent(axis), 0.00001)
    ));
    holder.add(instance);
    return holder;
  });
  ready.catch(error => console.error('Could not load game model', slug, error));
  readiness.set(holder, ready);
  return holder;
}

export function assetReady(holder) {
  return readiness.get(holder);
}

export function assetImage(slug) {
  if (!icons.has(slug)) {
    const image = new Image();
    image.src = 'assets/' + slug + '.webp';
    icons.set(slug, image);
  }
  const image = icons.get(slug);
  return image.complete && image.naturalWidth ? image : null;
}
