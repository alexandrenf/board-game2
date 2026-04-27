import type { WebGLRenderer } from 'three';
import type { MutableRefObject } from 'react';

export function safeDisposeRenderer(rendererRef: MutableRefObject<WebGLRenderer | null>): void {
  const renderer = rendererRef.current;
  if (!renderer) return;
  try {
    renderer.dispose();
    if (typeof document !== 'undefined' && renderer.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  } catch {
    // Renderer may already be disposed, or its DOM element may already be removed
  }
  rendererRef.current = null;
}
