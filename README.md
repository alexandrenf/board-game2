# BoardGame2

Educational board game with real-time multiplayer, built with Expo, React Native, React Three Fiber, and Convex.

## Features

- **3D Board Game** - Immersive 3D experience powered by React Three Fiber
- **Real-time Multiplayer** - Play with friends via Convex backend
- **Educational Content** - Quiz-based gameplay with HIV/AIDS prevention themes
- **Cross-Platform** - iOS, Android, and Web support

## Tech Stack

- **Frontend**: Expo SDK 54, React Native 0.81, React 19, Expo Router
- **3D Rendering**: React Three Fiber + Drei
- **Backend**: Convex (real-time multiplayer, room orchestration)
- **State Management**: Zustand (local), Convex (multiplayer sync)
- **Validation**: Zod
- **Persistence**: expo-sqlite
- **Testing**: Jest + React Native Testing Library, Playwright

## Project Structure

```
app/                    # Expo Router screens (index, explore, launch-button)
src/
├── components/
│   ├── game/           # Game UI (QuizModal, overlays, HUD)
│   └── ui/             # Reusable primitives (Card3D, AnimatedButton)
├── constants/          # Colors, design tokens
├── content/            # Quiz content, board schema
├── domain/game/        # Core game engine (turn resolver, quiz logic)
├── game/
│   ├── state/          # Zustand store
│   └── session/        # Session utilities
├── hooks/              # Custom hooks (presence, multiplayer events)
├── lib/r3f/            # Platform-specific R3F imports
└── services/
    ├── audio/          # Audio manager
    ├── multiplayer/     # Convex client integration
    ├── persistence/    # Platform-specific KV storage
    └── sync/           # Sync adapters
convex/                 # Convex backend (rooms, quiz, board rules, schema)
assets/                 # Board data, models, textures
```

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
bun run build:web          # Static web export to dist/
bun run development-builds # EAS development builds

# Quality
bun run lint               # ESLint
bun run typecheck          # TypeScript checks
bun run test               # Jest tests
bun run test:watch         # Jest watch mode
bun run test:web-smoke     # Playwright smoke test
bun run verify             # Full verification (doctor + deps + types + lint + tests)

# Deployment
bun run draft              # EAS preview workflow
bun run deploy             # EAS production workflow
```

## Architecture

### State Management

- **Zustand** (`src/game/state/gameState.ts`) - Local game state with slice pattern
- **Convex** - Real-time multiplayer sync via queries and mutations

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
- Quiz answers auto-resolve on timeout

## EAS Build Profiles

- `development` - Dev client builds
- `development-simulator` - iOS simulator builds
- `preview` - Internal distribution
- `production` - Auto-increment production builds

## Quality Gates

- GitHub Actions runs `bun run verify`
- Web export validated in CI
- Bundle size checks in CI
- Playwright smoke tests on PRs

## Known Gaps

- Asset and performance optimization for larger 3D assets
- Expanded native smoke coverage
- Stronger observability and analytics
- Offline sync conflict handling
- Final release hardening for store submission