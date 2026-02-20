# BoardGame2

Mobile-first educational board game built with Expo + React Native + Expo Router.

## Tech stack

- Expo SDK 54 / React Native 0.81 / React 19
- Expo Router for navigation
- React Three Fiber + Drei for 3D board scene
- Zustand for state management
- Zod for runtime content validation
- Expo SQLite KV Store for local-first persistence foundations

## Project scripts

```bash
npm run start                # Expo dev server
npm run ios                  # Open iOS simulator/dev client
npm run android              # Open Android emulator/dev client
npm run web                  # Open web target
npm run build:web            # Export production web build to dist/

npm run lint                 # ESLint
npm run typecheck            # TypeScript checks
npm run test                 # Jest unit/component tests
npm run test:web-smoke       # Playwright web smoke tests
npm run verify               # doctor + dependency check + typecheck + lint + tests

npm run draft                # EAS preview workflow
npm run development-builds   # EAS development builds workflow
npm run deploy               # EAS production deploy workflow
```

## Production guardrails

- Board content is validated at runtime through `src/content/board.schema.ts`.
- Core movement/effect logic is deterministic in `src/domain/game/engine.ts`.
- CI workflow (`.github/workflows/ci.yml`) runs verification checks and web export.

## Architecture highlights

- `src/domain/game/*`: game domain types + deterministic engine functions
- `src/game/state/gameState.ts`: Zustand store composed by logical slices
- `src/services/persistence/*`: local repositories (`expo-sqlite/kv-store`)
- `src/services/sync/*`: backend-ready sync abstractions and default adapters
- `src/services/audio/audioManager.ts`: centralized audio playback manager

## Notes

- The app currently targets iOS + Android first, with web parity smoke coverage.
- Existing EAS workflows are in `.eas/workflows`.

## Vercel test deploy (preview)

The project is configured for Vercel via `vercel.json` and uses Expo static export (`dist/`).

```bash
# optional local sanity check
npm run build:web

# first deploy (interactive)
npx vercel@latest
```

After the first run, each new test deploy can be pushed with:

```bash
npx vercel@latest
```
