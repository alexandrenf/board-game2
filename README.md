# BoardGame2

Mobile-first educational board game built with Expo, React Native, Expo Router, and Convex.

The project is no longer a default Expo template. It currently contains a playable 3D board-game experience, local persistence foundations, and an in-progress multiplayer backend.

## Current Status

- Playable game flow is implemented in the main app route.
- The board scene uses React Three Fiber and Drei for a 3D game experience.
- Core turn and movement rules are extracted into deterministic domain logic under `src/domain/game`.
- Board content is validated with Zod at runtime.
- Local-first persistence abstractions are in place via `expo-sqlite`.
- Convex-backed room and turn orchestration exists for multiplayer foundations.
- CI, Jest, Playwright smoke coverage, and web export are configured.

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- Expo Router
- React Three Fiber + Drei
- Convex
- Zustand
- Zod
- Expo SQLite
- Jest + React Native Testing Library
- Playwright

## Main Areas

- `app/`: Expo Router entry points and top-level screens.
- `src/components/game/`: gameplay overlays, HUD, menus, and modal UI.
- `src/game/`: 3D scene runtime, rendering, state, and board presentation.
- `src/domain/game/`: deterministic game engine and domain types.
- `src/services/persistence/`: platform-specific local storage repositories.
- `src/services/multiplayer/`: client-side multiplayer integration helpers.
- `convex/`: backend schema and room/turn logic for multiplayer.
- `assets/`: board data, models, textures, icons, and UI assets.
- `.eas/workflows/`: preview, dev-build, and production workflows.

## Getting Started

### Prerequisites

- Node.js 20+
- Bun
- Expo-compatible iOS Simulator, Android Emulator, or Expo Go / development build

### Install

```bash
bun install
```

### Environment

Create a local environment file if you want multiplayer enabled:

```bash
cp .env.example .env.local
```

Set:

```bash
EXPO_PUBLIC_CONVEX_URL=your_convex_deployment_url
```

Without a valid Convex URL, local single-device work is still possible, but multiplayer features will not connect.

## Running The App

```bash
npm run start
npm run ios
npm run android
npm run web
```

## Scripts

```bash
npm run start              # Expo dev server
npm run ios                # Launch iOS target
npm run android            # Launch Android target
npm run web                # Launch web target
npm run build:web          # Static web export to dist/ + service worker

npm run lint               # ESLint
npm run typecheck          # TypeScript checks
npm run test               # Jest tests
npm run test:watch         # Jest watch mode
npm run test:web-smoke     # Playwright smoke test
npm run bundle:check       # Web bundle budget check
npm run verify             # Doctor + dependency check + typecheck + lint + tests

npm run draft              # EAS preview workflow
npm run development-builds # EAS development builds workflow
npm run deploy             # EAS production workflow
```

## Multiplayer Notes

- Convex is already wired into the repository through `convex/schema.ts` and `convex/rooms.ts`.
- Room creation, room membership, turn sequencing, and event history are part of the current backend surface.
- The multiplayer path should still be treated as active work rather than fully production-hardened functionality.

## Quality Gates

- GitHub Actions runs `npm run verify`.
- Web export is validated in CI.
- Bundle size checks are included in CI.
- Playwright web smoke coverage runs on pull requests.

## Known Gaps

The project has solid foundations, but it is not fully release-complete yet. Based on the current repository status, the main remaining work is:

- asset and performance optimization for larger 3D assets
- expanded native smoke coverage
- stronger observability and analytics
- offline sync conflict handling and replay hardening
- final release hardening for store submission and rollout

## Deployment

EAS configuration is present in `eas.json`, with profiles for:

- `development`
- `development-simulator`
- `preview`
- `production`

Web export is configured through Expo static output and can be deployed from `dist/`. Vercel configuration is also present via `vercel.json`.

## Notes

- The Expo package name in `package.json` is still `expo-template-default`; that metadata has not been fully renamed yet.
- The app configuration itself is set to the actual project identity through `app.json` (`board-game2`).
