# AGENTS.md

## Project Overview

This is an **educational board game** built with Expo/React Native, primarily deployed as a **PWA (Progressive Web App)** via static web export to Vercel. The game features a 3D board with React Three Fiber, Zustand for local state, and Convex for multiplayer sync. While the codebase supports iOS and Android, **the web platform is the primary target** — evidenced by full PWA support, service worker caching, and a web-first CI pipeline.

**Package Manager:** `bun` (not npm). Use `bun install`, `bun run <script>`, `bunx <package>` for all package management. The project uses `bun.lock` for lockfile. DO NOT USE NPX / NPM IN THIS PROJECT.

## Documentation Resources

When working on this project, **always consult the official Expo documentation** available at:

- **https://docs.expo.dev/llms.txt** - Index of all available documentation files
- **https://docs.expo.dev/llms-full.txt** - Complete Expo documentation including Expo Router, Expo Modules API, development process
- **https://docs.expo.dev/llms-eas.txt** - Complete EAS (Expo Application Services) documentation
- **https://docs.expo.dev/llms-sdk.txt** - Complete Expo SDK documentation
- **https://reactnative.dev/docs/getting-started** - Complete React Native documentation

## Project Structure

```
/
├── app/                   # Expo Router file-based routing
│   ├── _layout.tsx        # Root layout (ThemeProvider, ConvexProvider, Stack)
│   ├── index.tsx          # Main game screen
│   ├── explore.tsx        # Redirects to help center modal
│   └── launch-button.tsx  # 3D launch button screen
├── src/
│   ├── components/
│   │   ├── game/          # Game UI (QuizModal, overlays, HUD)
│   │   └── ui/            # Reusable primitives (Card3D, AnimatedButton, AppIcon)
│   ├── constants/         # Colors, design tokens
│   ├── content/           # Quiz content, board schema
│   ├── domain/game/       # Core game engine (turn resolver, quiz logic, types)
│   ├── game/
│   │   ├── state/         # Zustand store (gameState.ts)
│   │   └── session/       # Session utilities
│   ├── hooks/             # usePresenceHeartbeat, useMultiplayerEventProcessor
│   ├── lib/r3f/           # React Three Fiber platform-specific imports
│   ├── services/
│   │   ├── audio/         # Audio manager
│   │   ├── multiplayer/   # Convex client, runtime store, turn utils
│   │   ├── persistence/   # Platform-specific KV repositories
│   │   └── sync/          # Sync adapters
│   └── styles/            # Theme configuration
├── assets/                # Static assets (images, board.json)
├── convex/                # Convex backend (rooms, quiz, board rules, schema)
├── hooks/                 # Platform-specific hooks
└── public/                # PWA assets (manifest, icons, service worker register)
```

## Architecture

### State Management

**Zustand** (local state) - Single store at `src/game/state/gameState.ts`:

- Slice pattern: `createSettingsSlice`, `createUiSlice`, `createSessionSlice`, `createGameEngineSlice`
- Auto-hydration from persistence on load
- Debounced saves

**Convex** (multiplayer sync) - Real-time backend:

- `useQuery` / `useMutation` for room state
- `usePresenceHeartbeat.ts` for online status
- `convexClient.ts` for connection management

### Navigation

**Stack Navigator** (no tabs) - All screen transitions via `expo-router`:

- Root layout wraps in ThemeProvider + ConvexProvider + Stack
- Screens: `index` (main game), `explore` (help center), `launch-button`

### 3D Rendering

**React Three Fiber** via `@react-three/fiber` and `@react-three/drei`:

- Platform-specific imports in `src/lib/r3f/` (`canvas.web.ts`, `canvas.native.ts`)
- Main scene: `GameScene.tsx` with Board, PlayerToken, Dice3D

### Design System

**Neobrutalism** aesthetic:

- Solid black borders, hard drop shadows (no blur, offset 2-8px)
- Bold brand colors: orange `#F7931E`, hot pink `#EC008C`, green `#009444`
- Colors centralized at `src/constants/colors.ts`
- Theme tokens at `src/styles/theme.ts` (spacing, borderRadius, shadows)

### PWA Features

- **App manifest** at `public/manifest.json` (`display: standalone`, full icon set with maskable variants)
- **Service worker** generated via Workbox at build time: `workbox generateSW workbox-config.js`
- **Registration** at `public/register-sw.js` — registers `/sw.js` on page load
- **Install prompt** component at `src/components/ui/PWAPrompt.tsx` (handles iOS Safari, Android Chrome, desktop)
- **Offline support** via service worker caching (workbox-config sets navigateFallback to `/index.html`)

### Platform-Specific Patterns (Web vs Native)

The project uses two-tier platform differentiation:

1. **Build-time (file extension):** Metro resolves `*.web.ts` / `*.native.ts` / `*.ts` files automatically:
   - `src/lib/r3f/` — `canvas.web.ts` exports from `@react-three/fiber`, `canvas.native.ts` from `@react-three/fiber/native`
   - `src/services/persistence/` — `kvRepositories.web.ts` uses `localStorage`, `kvRepositories.native.ts` uses `expo-sqlite/kv-store`
   - `hooks/use-color-scheme.web.ts` — SSR-safe color scheme detection

2. **Runtime (`Platform.OS` checks):** Used for per-component decisions:
   - Web-only components: `PWAPrompt`, `NetworkBadge` (return `null` on native)
   - 3D scene gating: some 3D elements render only on web
   - Animation driver: `useNativeDriver: false` on web
   - Audio: different strategies per platform (`src/services/audio/audioManager.ts`)
   - Haptics: no-ops on web (`src/utils/haptics.ts`)

## Essential Commands

### Development

```bash
bunx expo start                    # Start dev server
bunx expo start --clear            # Clear cache and start
bunx expo install <package>        # Install with compatible versions
bunx expo install --check          # Check for updates
bunx expo install --fix            # Auto-fix invalid versions
bun run development-builds         # Create development builds
bun run reset-project              # Reset to blank template
```

### Building & Testing

```bash
bunx expo doctor                   # Check project health
bunx expo lint                    # Run ESLint
bun run typecheck                 # TypeScript type checking
bun run test                      # Run Jest tests
bun run test:watch                # Jest watch mode
bun run test:web-smoke            # Playwright smoke test (web)
bun run verify                    # Full CI verification suite
bun run draft                     # Publish preview update (workflow)
```

### Building for Web (Primary Target)

```bash
bun run build:web                 # Static web export → dist/ + service worker
bun run bundle:check              # Check bundle size budget
```

The web build pipeline: `expo export --platform web` generates static files, then `workbox generateSW` creates the service worker.

### Production

```bash
bunx eas-cli@latest build --platform ios -s     # iOS build + submit
bunx eas-cli@latest build --platform android -s # Android build + submit
bun run deploy                                 # Deploy to production (workflow)
```

### Deployment

- **Web**: Deployed to Vercel via EAS deploy workflow (static export from `dist/`)
- **CI**: GitHub Actions runs `bun install --frozen-lockfile`, web export, bundle checks, and Playwright smoke tests on PRs

## Development Guidelines

### Code Style & Standards

- **TypeScript First**: Use TypeScript for all new code
- **Naming Conventions**: Meaningful, descriptive names
- **Self-Documenting Code**: Clear code; comments only for complex logic
- **React 19 Patterns**: Function components with hooks, proper useEffect deps, memoization

### Key Patterns

**Zustand Store Slices:**

```typescript
export const useGameStore = create<GameState>((set, get) => ({
  ...createSettingsSlice(set, get),
  ...createUiSlice(set, get),
  ...createSessionSlice(set, get),
  ...createGameEngineSlice(set, get),
}));
```

**Platform-Specific Imports:**

```typescript
// src/lib/r3f/canvas.ts → imports from canvas.web.ts or canvas.native.ts
// src/services/persistence/kvRepositories.ts → kvRepositories.web.ts or .native.ts
```

**Haptic Feedback:**

```typescript
import { triggerHaptic } from "@/utils/haptics";
triggerHaptic("light" | "medium" | "heavy" | "success" | "warning" | "error");
```

### Recommended Libraries

- **Navigation**: `expo-router`
- **3D**: `@react-three/fiber`, `@react-three/drei`
- **Images**: `expo-image`
- **Animations**: `react-native-reanimated`
- **Gestures**: `react-native-gesture-handler`
- **Storage**: `expo-sqlite` / `expo-sqlite/kv-store`
- **Haptics**: `expo-haptics`
- **Gradients**: `expo-linear-gradient`
- **Icons**: `@expo/vector-icons`

## Debugging & Development Tools

### DevTools Integration

- **React Native DevTools**: Use MCP `open_devtools` command
- **Network Inspection**: Monitor API calls in DevTools
- **Logging**: `console.log` (debug), `console.warn` (deprecation), `console.error` (errors)

### Automated Testing with MCP Tools

Docs: https://docs.expo.dev/eas/ai/mcp/

- **Component Testing**: Add `testID` props
- **Visual Testing**: `automation_take_screenshot`
- **Interaction Testing**: `automation_tap_by_testid`
- **View Verification**: `automation_find_view_by_testid`

## EAS Workflows CI/CD

Workflows are in `.eas/workflows/` directory.

Docs: https://docs.expo.dev/eas/workflows/

### Build Profiles (eas.json)

- **development**: Dev client builds
- **development-simulator**: iOS simulator builds
- **preview**: Internal distribution
- **production**: Auto-increment production builds

## Convex Backend

**Schema Tables:**

- `rooms` - Game room state (by_code, by_last_active_at indexes)
- `roomPlayers` - Players in rooms (by_room, by_client indexes)
- `roomEvents` - Immutable event log
- `roomTurnOperations` - Turn resolution tracking
- `roomQuizRounds` - Active quiz questions
- `roomQuizAnswers` - Player answers
- `roomPresence` - Heartbeat/online status

**Key Files:**

- `convex/schema.ts` - Database schema
- `convex/rooms.ts` - Core multiplayer logic (create/join room, turn management)
- `convex/quiz.ts` - Quiz question selection
- `convex/boardRules.ts` - Board movement rules
- `convex/crons.ts` - Cleanup job (runs every 12 hours)

**Room Phases:** `lobby` → `awaiting_roll` → `awaiting_quiz` → `awaiting_ack` → `finished`

**Security Note:** This project does NOT use Convex auth (no auth.config.ts). Client identification is via `clientId` string parameter passed to mutations.

## Troubleshooting

### Expo Go Errors

If errors in **Expo Go** or project not running, create a **development build**. Expo Go has limited native module support. After installing new packages or adding config plugins, new development builds are often required.

### Web Build Notes

- The project serves primarily as a PWA; always test on web before native
- Build: `bun run build:web` runs `expo export --platform web` then `workbox generateSW`
- The web build generates a complete PWA in `dist/` with service worker
- Vercel deployment uses `dist/` as the output directory

---

## AI Agent Instructions

1. **Always consult documentation** before implementing:
   - General Expo: https://docs.expo.dev/llms-full.txt
   - EAS/deployment: https://docs.expo.dev/llms-eas.txt
   - SDK/API: https://docs.expo.dev/llms-sdk.txt

2. **Understand before implementing**: Read relevant docs section

3. **Follow existing patterns**: Look at similar code before writing new code

4. **Check Convex guidelines**: Read `convex/_generated/ai/guidelines.md` for Convex API rules

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
