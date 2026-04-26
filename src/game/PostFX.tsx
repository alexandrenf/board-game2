import React from 'react';
import { Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

/**
 * Post-processing effects for web + high quality tier only.
 * Uses Bloom (subtle glow on bright areas) and Vignette (edge darkening).
 * Wrapped in CanvasErrorBoundary in GameScene — on GL error, quality
 * auto-downgrades to 'medium' and this component is unmounted.
 */
export const PostFX: React.FC = () => {
  return (
    <>
      <Bloom
        intensity={0.35}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <Vignette
        offset={0.4}
        darkness={0.45}
        blendFunction={BlendFunction.NORMAL}
      />
    </>
  );
};
