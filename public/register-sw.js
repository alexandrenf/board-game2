(() => {
  if (!('serviceWorker' in navigator)) return;

  const register = async () => {
    try {
      const response = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) return;
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      // Intentionally silent to avoid noisy logs in environments without a generated SW.
    }
  };

  window.addEventListener('load', () => {
    void register();
  });
})();
