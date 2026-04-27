let cached: boolean | null = null;

export const isWebGLAvailable = (): boolean => {
  if (cached !== null) return cached;

  if (typeof document === 'undefined') {
    cached = true;
    return cached;
  }

  try {
    const canvas = document.createElement('canvas');
    const context: WebGLRenderingContext | WebGL2RenderingContext | null =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    cached = Boolean(context);

    if (context) {
      const ext = context.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    }

    return cached;
  } catch {
    cached = false;
    return cached;
  }
};
