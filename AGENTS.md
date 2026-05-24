# bot-sdk-typescript — Claude Code rules

TypeScript SDK package published as `@agentflowx/bot-sdk` on npm.

## What this is

Thin wrapper around the [AgentFlow Bot Platform](https://github.com/AgentFlowX/bot-platform) REST API. Zero deps, uses native `fetch`.

## Rules

- Zero runtime deps. Native `fetch` only. Browser-safe.
- Every public method returns a typed `Promise<T>`. No callbacks.
- API surface mirrors `bot-platform/src/routes/*` — every endpoint there has a one-method wrapper here.
- On non-2xx HTTP responses or `{ok:false}` JSON, throw `BotApiError` (status + code + detail).
- ESM-only; CJS users use dynamic `import()`.
- `bun`, `Deno`, `Cloudflare Workers`, `Node 20+` all must work.

## Layout

```
src/index.ts       # BotClient + types + BotApiError
tests/             # unit tests with mocked fetcher
```

## Workflow

Don't add features that aren't yet in bot-platform. SDK leads docs but follows API.

When a new endpoint lands in bot-platform:
1. Add typed wrapper method here
2. Add unit test with mocked fetcher
3. Bump version (semver)
4. Update README quick-reference table

## Anti-slop

Banned: "really", "simply", "deeply", "just", "actually", "literally", em-dashes-as-dividers, three-item lists per paragraph, throat-clearers, passive voice, "Not X. Y." antitheses.
