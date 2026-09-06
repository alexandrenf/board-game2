# Setup reference

Follow SKILL.md for scope, configured targets and server policy. The retained examples may describe an older CLI; verify installed behavior before use. Do not repeat authorization questions already answered by the request.

## Path 2: Add Convex to an Existing App

Use this when the user already has a frontend project and wants to add Convex as the backend.

### Install

```bash
bun add convex
```

### Initialize and start dev loop

Use the configured one-shot dev command when supported and authorized. This handles login, creates the `convex/` directory, writes the deployment URL to `.env.local`, and starts the file watcher. See the notes in Path 1 about why the agent should not run this directly.

### Wire up the provider

The Convex client must wrap the app at the root. The setup varies by framework.

Create the `ConvexReactClient` at module scope, not inside a component:

```tsx
// Bad: re-creates the client on every render
function App() {
  const convex = new ConvexReactClient(
    import.meta.env.VITE_CONVEX_URL as string,
  );
  return <ConvexProvider client={convex}>...</ConvexProvider>;
}

// Good: created once at module scope
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
function App() {
  return <ConvexProvider client={convex}>...</ConvexProvider>;
}
```

#### React (Vite)

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
);
```

#### Next.js (App Router)

```tsx
// app/ConvexClientProvider.tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

```tsx
// app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
```

#### Other frameworks

For Vue, Svelte, React Native, TanStack Start, Remix, and others, follow the matching quickstart guide:

- [Vue](https://docs.convex.dev/quickstart/vue)
- [Svelte](https://docs.convex.dev/quickstart/svelte)
- [React Native](https://docs.convex.dev/quickstart/react-native)
- [TanStack Start](https://docs.convex.dev/quickstart/tanstack-start)
- [Remix](https://docs.convex.dev/quickstart/remix)
- [Node.js (no frontend)](https://docs.convex.dev/quickstart/nodejs)

### Environment variables

The env var name depends on the framework:

| Framework    | Variable                 |
| ------------ | ------------------------ |
| Vite         | `VITE_CONVEX_URL`        |
| Next.js      | `NEXT_PUBLIC_CONVEX_URL` |
| Remix        | `CONVEX_URL`             |
| React Native | `EXPO_PUBLIC_CONVEX_URL` |

`bunx convex dev` writes the correct variable to `.env.local` automatically.
