# Setup reference

Follow SKILL.md for scope, configured targets and server policy. The retained examples may describe an older CLI; verify installed behavior before use. Do not repeat authorization questions already answered by the request.

## Path 1: New Project (Recommended)

Use the official scaffolding tool. It creates a complete project with the frontend framework, Convex backend, and all config wired together.

### Pick a template

| Template                   | Stack                                     |
| -------------------------- | ----------------------------------------- |
| `react-vite-shadcn`        | React + Vite + Tailwind + shadcn/ui       |
| `nextjs-shadcn`            | Next.js App Router + Tailwind + shadcn/ui |
| `react-vite-clerk-shadcn`  | React + Vite + Clerk auth + shadcn/ui     |
| `nextjs-clerk`             | Next.js + Clerk auth                      |
| `nextjs-convexauth-shadcn` | Next.js + Convex Auth + shadcn/ui         |
| `nextjs-lucia-shadcn`      | Next.js + Lucia auth + shadcn/ui          |
| `bare`                     | Convex backend only, no frontend          |

If the user has not specified a preference, default to `react-vite-shadcn` for simple apps or `nextjs-shadcn` for apps that need SSR or API routes.

You can also use any GitHub repo as a template:

```bash
npm create convex@latest my-app -- -t owner/repo
npm create convex@latest my-app -- -t owner/repo#branch
```

### Scaffold the project

Always pass the project name and template flag to avoid interactive prompts:

```bash
npm create convex@latest my-app -- -t react-vite-shadcn
cd my-app
npm install
```

The scaffolding tool creates files but does not run `npm install`, so you must run it yourself.

To scaffold in the current directory (if it is empty):

```bash
npm create convex@latest . -- -t react-vite-shadcn
npm install
```

### Start the dev loop

`bunx convex dev` is a long-running watcher process that syncs backend code to a Convex deployment on every save. It also requires authentication on first run (browser-based OAuth). Both of these make it unsuitable for an agent to run directly.

**Development server setup, when requested:**

Use the configured one-shot dev command when supported and authorized. Start a watcher only if the task needs one. On first run it will prompt them to log in or develop anonymously. Once running, it will:

- Create a Convex project and dev deployment
- Write the deployment URL to `.env.local`
- Create the `convex/` directory with generated types
- Watch for changes and sync continuously

The user should keep `bunx convex dev` running in the background while you work on code. The watcher will automatically pick up any files you create or edit in `convex/`.

**Exception - cloud or headless agents:** Environments that cannot open a browser for interactive login should use Agent Mode (see below) to run anonymously without user interaction.

### Start the frontend

The user should also run the frontend dev server in a separate terminal:

```bash
bun run dev
```

Vite apps serve on `http://localhost:5173`, Next.js on `http://localhost:3000`.

### What you get

After scaffolding, the project structure looks like:

```
my-app/
  convex/           # Backend functions and schema
    _generated/     # Auto-generated types (check this into git)
    schema.ts       # Database schema (if template includes one)
  src/              # Frontend code (or app/ for Next.js)
  package.json
  .env.local        # CONVEX_URL / VITE_CONVEX_URL / NEXT_PUBLIC_CONVEX_URL
```

The template already has:

- `ConvexProvider` wired into the app root
- Correct env var names for the framework
- Tailwind and shadcn/ui ready (for shadcn templates)
- Auth provider configured (for auth templates)

Proceed to adding schema, functions, and UI.
