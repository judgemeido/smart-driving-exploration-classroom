import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl, fetchAsset, type AssetOptions } from './assets';
import { disposeObject } from './three-resources';
import { MeshoptDecoder } from 'meshoptimizer';

const compressedModels: Record<string, string> = {
  '/assets/yaojing-s9-optimized.glb': '/assets/yaojing-s9-optimized-compressed.glb',
  '/assets/yaojing-s9.glb': '/assets/yaojing-s9-traffic.glb',
  '/assets/lidar/ld016/LD016-engineering.glb': '/assets/lidar/ld016/LD016-engineering-compressed.glb',
};

export async function loadGltf(path: string, options: AssetOptions = {}) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const parse = async (source: string) => {
    const url = assetUrl(source);
    const data = await fetchAsset(url, options);
    return loader.parseAsync(data, new URL('.', new URL(url, location.href)).href);
  };
  let gltf;
  try { gltf = await parse(compressedModels[path] ?? path); }
  catch (error) {
    if (options.signal?.aborted || !compressedModels[path]) throw error;
    // Preserve the original asset as a fallback if a decoder or transfer fails.
    gltf = await parse(path);
  }
  if (options.signal?.aborted) {
    disposeObject(gltf.scene);
    throw options.signal.reason;
  }
  return gltf;
}
