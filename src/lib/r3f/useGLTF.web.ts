import { useLoader } from '@react-three/fiber';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type GltfPath = string | string[];
type ExtendLoader = (loader: GLTFLoader) => void;

let dracoLoader: DRACOLoader | null = null;
let decoderPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/';

const configureLoader =
  (useDraco: boolean | string = true, useMeshopt: boolean = true, extendLoader?: ExtendLoader) =>
  (loader: GLTFLoader) => {
    extendLoader?.(loader);

    if (useDraco) {
      if (!dracoLoader) {
        dracoLoader = new DRACOLoader();
      }

      dracoLoader.setDecoderPath(typeof useDraco === 'string' ? useDraco : decoderPath);
      loader.setDRACOLoader(dracoLoader);
    }

    if (useMeshopt) {
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
  };

export const useGLTF = (
  path: GltfPath,
  useDraco?: boolean | string,
  useMeshopt?: boolean,
  extendLoader?: ExtendLoader,
) => useLoader(GLTFLoader, path, configureLoader(useDraco, useMeshopt, extendLoader));

useGLTF.preload = (
  path: GltfPath,
  useDraco?: boolean | string,
  useMeshopt?: boolean,
  extendLoader?: ExtendLoader,
) => useLoader.preload(GLTFLoader, path, configureLoader(useDraco, useMeshopt, extendLoader));

useGLTF.clear = (path: GltfPath) => useLoader.clear(GLTFLoader, path);

useGLTF.setDecoderPath = (path: string) => {
  decoderPath = path;
};
