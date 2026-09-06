# Board game working guidance

This is an Expo/React Native educational board game, primarily a web PWA with static export. Use Bun: bun install, bun run, bunx. Preserve the existing React Three Fiber, Zustand and Convex architecture.

Use [AGENT-REFERENCE.md](AGENT-REFERENCE.md) for architecture, locations and commands. Read only the relevant section and confirm current source. For uncertain or version-sensitive Expo/React Native behavior, consult installed source/types or the appropriate official documentation; a routine edit does not require a general documentation pass.

Preserve the neobrutalist design system: solid borders, hard shadows, established brand colors and tokens. Reuse platform-specific web/native modules for rendering and persistence; preserve web-safe animation, haptic and audio behavior.

The web build exports to dist and generates its Workbox service worker. Verify affected PWA, offline/navigation and caching behavior for relevant changes; prioritize web validation. Native module/config changes may require a development build.

For Convex work, read convex/_generated/ai/guidelines.md if available. Keep schema, indexes and calling code consistent. Client identification currently uses a clientId parameter; it is not authenticated identity. Do not mistake it for an authorization guarantee.

Preserve unrelated work. Run checks appropriate to the changed behavior. Do not use reset, publish, deploy or app-store submission commands as routine verification.
