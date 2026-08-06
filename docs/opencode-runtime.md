# OpenCode runtime

OneFlow uses OpenCode for the coding-agent loop and Cynone Webby Builder for
workspace persistence, builds, and previews.

OpenCode is an internal process in the Webby Builder container. The builder
proxies the OpenCode API behind its existing authenticated `/api/opencode/*`
route, so OneFlow only needs its normal Webby Builder connection:

```text
WEBBY_BUILDER_URL=https://your-builder.example
WEBBY_BUILDER_SERVER_KEY=<matching builder server key>
```

No `OPENCODE_*` variables are required in OneFlow. The selected chat model is
passed to OpenCode for each job. Its API key is resolved from **Admin → AI
Providers** and installed through OpenCode's authenticated provider API before
the prompt runs.

Because OpenCode validates the prompt model against its own models.dev snapshot
and fails with "Model not found" for newly released provider models, each job
also writes the resolved provider/model into the workspace OpenCode config
(`provider.<id>.models` in both `opencode.json` and `.opencode/opencode.json`)
before the prompt runs. That workspace config merges with the models.dev
provider defaults, so any provider model works regardless of the builder's
OpenCode catalog age. Existing (valid) config files are preserved and merged,
never replaced. When a config file changes, the job disposes the cached
OpenCode instance (`POST /instance/dispose`, best-effort) so the server
reloads it instead of serving the stale catalog.

Both processes use the canonical workspace path:

```text
/app/storage/workspaces/<oneflow-workspace-id>
```

OpenCode edits that workspace. Webby Builder remains responsible for dependency
installation, validation, the persistent development server, and preview proxy.
