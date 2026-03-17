export const isWebGLAvailable = (): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }

  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');

    return Boolean(context);
  } catch {
    return false;
  }
};
