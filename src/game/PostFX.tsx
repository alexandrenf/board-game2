import React from 'react';
import { Platform } from 'react-native';
import { useGameStore } from './state/gameState';

let EffectComposer: any = null;
let Bloom: any = null;
let Vignette: any = null;

if (Platform.OS === 'web') {
  try {
    const pp = require('@react-three/postprocessing');
    EffectComposer = pp.EffectComposer;
    Bloom = pp.Bloom;
    Vignette = pp.Vignette;
  } catch {
  }
}

const PostFXInner: React.FC = () => {
  const setRenderQuality = useGameStore((s) => s.setRenderQuality);

  if (!EffectComposer || !Bloom || !Vignette) return null;

  let content: React.ReactElement | null = null;
  try {
    content = (
      <EffectComposer>
        <Bloom
          intensity={0.35}
          luminanceThreshold={0.85}
          mipmapBlur
        />
        <Vignette
          offset={0.4}
          darkness={0.45}
        />
      </EffectComposer>
    );
  } catch {
    setRenderQuality('medium');
  }

  return content;
};

export const PostFX: React.FC = () => {
  const renderQuality = useGameStore((s) => s.renderQuality);

  if (Platform.OS !== 'web') return null;
  if (renderQuality !== 'high') return null;

  return <PostFXInner />;
};
