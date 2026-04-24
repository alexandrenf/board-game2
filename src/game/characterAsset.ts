/* eslint-disable @typescript-eslint/no-require-imports */
import { Asset } from 'expo-asset';

// Shared handle for the 10 MB character GLB so the boot screen can kick off
// the download in parallel with audio preload, before GameScene mounts.
export const CHARACTER_ASSET = Asset.fromModule(require('../../assets/character.glb'));
