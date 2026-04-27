# BoardGame2 — Jogo da Prevenção

Educational board game with real-time multiplayer and a 3D board, primarily deployed as a **PWA (Progressive Web App)**. Built with Expo, React Three Fiber, and Convex.

## Features

- **3D Board Game** - Immersive 3D experience powered by React Three Fiber
- **Real-time Multiplayer** - Play with friends via Convex backend
- **Educational Content** - Quiz-based gameplay with HIV/AIDS prevention themes (Brazilian Portuguese)
- **PWA First** - Static web export to Vercel with service worker caching and install prompt
- **Cross-Platform** - Web (primary), iOS, and Android

## Tech Stack

- **Frontend**: Expo SDK 54, React Native 0.81, React 19, Expo Router
- **3D Rendering**: React Three Fiber + Drei + Postprocessing
- **Backend**: Convex (real-time multiplayer, room orchestration)
- **State Management**: Zustand (local), Convex (multiplayer sync)
- **Validation**: Zod
- **Persistence**: localStorage (web) / expo-sqlite/kv-store (native)
- **Testing**: Jest + React Native Testing Library, Playwright (web smoke tests)
- **CI/CD**: GitHub Actions, EAS Workflows, Vercel

## Project Structure

```
app/                    # Expo Router screens (index, explore, launch-button)
src/
├── components/
│   ├── game/           # Game UI (QuizModal, overlays, HUD)
│   └── ui/             # Reusable primitives (Card3D, AnimatedButton, PWAPrompt)
├── constants/          # Colors, design tokens
├── content/            # Quiz content, board schema
├── domain/game/        # Core game engine (turn resolver, quiz logic)
├── game/
│   ├── state/          # Zustand store
│   └── session/        # Session utilities
├── hooks/              # Custom hooks (presence, multiplayer events, network status)
├── lib/r3f/            # Platform-specific R3F imports (canvas.web.ts / canvas.native.ts)
└── services/
    ├── audio/          # Audio manager (platform-specific strategies)
    ├── multiplayer/    # Convex client integration
    ├── persistence/    # Platform-specific KV (localStorage vs expo-sqlite/kv-store)
    └── sync/           # Sync adapters
convex/                 # Convex backend (rooms, quiz, board rules, schema)
assets/                 # Board data, models, textures
public/                 # PWA (manifest.json, register-sw.js, icons)
```

## Getting Started

### Prerequisites

- **Bun** (package manager — do not use npm)
- Node.js 20+
- Expo-compatible iOS Simulator, Android Emulator, or Expo Go / development build

### Install

```bash
bun install
```

### Environment

Create a local environment file for multiplayer:

```bash
cp .env.example .env.local
```

Set your Convex deployment URL:

```bash
EXPO_PUBLIC_CONVEX_URL=your_convex_deployment_url
```

Without a valid Convex URL, single-device play still works.

## Running The App

```bash
bun run start          # Expo dev server
bun run ios            # iOS target
bun run android        # Android target
bun run web            # Web target
```

## Scripts

```bash
# Development
bun run start              # Expo dev server
bun run ios                # Launch iOS
bun run android            # Launch Android
bun run web                # Launch web

# Build
bun run build:web          # Static web export → dist/ + service worker
bun run bundle:check       # Bundle size budget check
bun run development-builds # EAS development builds

# Quality
bun run lint               # ESLint
bun run typecheck          # TypeScript checks
bun run test               # Jest tests
bun run test:watch         # Jest watch mode
bun run test:web-smoke     # Playwright smoke test (web)
bun run verify             # Full CI verification (doctor + deps + types + lint + tests)

# Deployment
bun run draft              # EAS preview workflow
bun run deploy             # EAS production workflow (Vercel + store builds)
```

## PWA

The project includes full Progressive Web App support:

- **Service worker** — Generated at build time via Workbox (`workbox generateSW workbox-config.js`), caches all static assets
- **Web manifest** — `public/manifest.json` with `display: standalone`, maskable icons
- **Install prompt** — `src/components/ui/PWAPrompt.tsx` handles iOS Safari, Android Chrome, and desktop
- **Offline fallback** — Workbox config uses `navigateFallback: /index.html` for SPA routing
- **Registration** — `public/register-sw.js` registers `/sw.js` on page load

Build for web: `bun run build:web` (exports static files to `dist/`, then generates service worker).

## Architecture

### State Management

- **Zustand** (`src/game/state/gameState.ts`) - Local game state with slice pattern
- **Convex** - Real-time multiplayer sync via queries and mutations

### Platform-Specific Patterns

Two-tier differentiation:

1. **File extension resolution** (`*.web.ts` / `*.native.ts`) — for module-level swaps (R3F imports, persistence backends)
2. **Runtime `Platform.OS` checks** — for per-component decisions (3D rendering gates, animation drivers, haptics, web-only components)

### Design System

Neobrutalism aesthetic:
- Solid black borders, hard drop shadows
- Brand colors: orange `#F7931E`, hot pink `#EC008C`, green `#009444`
- Colors at `src/constants/colors.ts`
- Theme tokens at `src/styles/theme.ts`

### Multiplayer Flow

Room phases: `lobby` → `awaiting_roll` → `awaiting_quiz` → `awaiting_ack` → `finished`

- Players join via room code
- Host starts when all ready
- Turn resolution happens on Convex backend
- Quiz answers auto-resolve on timeout (90s)

## EAS Build Profiles

- `development` - Dev client builds
- `development-simulator` - iOS simulator builds
- `preview` - Internal distribution
- `production` - Auto-increment production builds

## CI/CD

- **GitHub Actions**: Runs `bun install --frozen-lockfile`, web export, bundle checks, Playwright smoke tests on PRs
- **EAS Workflows**: Preview updates (draft), development builds, production deployment
- **Vercel**: Static web deployment from `dist/` output directory
- **Verification**: `bun run verify` runs expo-doctor, dep checks, typecheck, lint, and tests

## Known Gaps

- Asset and performance optimization for larger 3D assets
- Expanded native smoke coverage
- Stronger observability and analytics
- Offline sync conflict handling
- Final release hardening for store submission