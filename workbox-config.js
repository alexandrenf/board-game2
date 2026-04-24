module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,png,jpg,jpeg,svg,ico,json,ttf,woff,woff2,glb,ogg,mp3,wav,m4a}'],
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/sw\.js$/, /register-sw\.js$/, /manifest\.json$/],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
};
