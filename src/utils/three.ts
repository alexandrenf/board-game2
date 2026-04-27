import type { WebGLRenderer } from 'three';
import type { MutableRefObject } from 'react';

export function safeDisposeRenderer(  rendererRef: MutableRefObject<WebGLRenderer | null>) {
  const renderer = rendererRef.current;
  if (!renderer) return;
  try {
    renderer.dispose();
  } catch {
    // Renderer may already be disposed
  }
  if (typeof document !== 'undefined' && renderer.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
  rendererRef.current = null;
}
