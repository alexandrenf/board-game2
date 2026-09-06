---
name: convex-quickstart
description: "Set up a new Convex backend or add Convex to an existing app using its package manager and configured deployment."
---

# Set up Convex

Use only for a new backend or adding Convex to an app. Existing Convex feature work should proceed without setup. Use Bun and the existing deployment configuration.

Read [new-project.md](new-project.md) for scaffolding, [existing-app.md](existing-app.md) for the relevant frontend, or [agent-and-validation.md](agent-and-validation.md) for setup verification. These retained examples may target an older CLI: verify uncertain behavior against installed source or official documentation.

Use configured one-shot codegen/dev checks when supported and authorized. Do not ask the user to run commands the agent can safely perform; clarify only missing authentication or deployment choices. Respect no-server requests and do not leave a watcher as a completion requirement. Do not infer production deployment authorization from a setup request. Report exactly what was verified.
