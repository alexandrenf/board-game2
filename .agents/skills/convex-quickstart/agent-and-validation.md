# Setup reference

Follow SKILL.md for scope, configured targets and server policy. The retained examples may describe an older CLI; verify installed behavior before use. Do not repeat authorization questions already answered by the request.

## Agent Mode (Cloud and Headless Agents)

When running in a cloud or headless agent environment where interactive browser login is not possible, set `CONVEX_AGENT_MODE=anonymous` to use a local anonymous deployment.

Add `CONVEX_AGENT_MODE=anonymous` to `.env.local`, or set it inline:

```bash
CONVEX_AGENT_MODE=anonymous bunx convex dev
```

This runs a local Convex backend on the VM without requiring authentication, and avoids conflicting with the user's personal dev deployment.

## Verify the Setup

After setup, confirm everything is working:

1. The user confirms `bunx convex dev` is running without errors
2. The `convex/_generated/` directory exists and has `api.ts` and `server.ts`
3. `.env.local` contains the deployment URL

## Writing Your First Function

Once the project is set up, create a schema and a query to verify the full loop works.

`convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});
```

`convex/tasks.ts`:

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("tasks", { text: args.text, completed: false });
  },
});
```

Use in a React component (adjust the import path based on your file location relative to `convex/`):

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function Tasks() {
  const tasks = useQuery(api.tasks.list);
  const create = useMutation(api.tasks.create);

  return (
    <div>
      <button onClick={() => create({ text: "New task" })}>Add</button>
      {tasks?.map((t) => (
        <div key={t._id}>{t.text}</div>
      ))}
    </div>
  );
}
```

## Development vs Production

Always use `bunx convex dev` during development. It runs against your personal dev deployment and syncs code on save.

When ready to ship, deploy to production:

```bash
bunx convex deploy
```

This pushes to the production deployment, which is separate from dev. Do not use `deploy` during development.

## Next Steps

- Add authentication: use the `convex-setup-auth` skill
- Design your schema: see [Schema docs](https://docs.convex.dev/database/schemas)
- Build components: use the `convex-create-component` skill
- Plan a migration: use the `convex-migration-helper` skill
- Add file storage: see [File Storage docs](https://docs.convex.dev/file-storage)
- Set up cron jobs: see [Scheduling docs](https://docs.convex.dev/scheduling)

## Checklist

- [ ] Determined starting point: new project or existing app
- [ ] If new project: scaffolded with `npm create convex@latest` using appropriate template
- [ ] If existing app: installed `convex` and wired up the provider
- [ ] User has `bunx convex dev` running and connected to a deployment
- [ ] `convex/_generated/` directory exists with types
- [ ] `.env.local` has the deployment URL
- [ ] Verified a basic query/mutation round-trip works
