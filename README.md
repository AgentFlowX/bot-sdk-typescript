# @agentflowx/bot-sdk

> TypeScript SDK for the [AgentFlow Bot Platform](https://github.com/AgentFlowX/bot-platform). Build Matrix bots without learning Matrix.

## Install

```bash
npm install @agentflowx/bot-sdk
```

## Quick start

```ts
import { BotClient } from '@agentflowx/bot-sdk';

const bot = new BotClient({
  token: process.env.AF_BOT_TOKEN!, // af_bot_<hex>
  // host: 'https://bots.agentflow.website',   // default
});

const { event_id } = await bot.sendMessage({
  room_id: '!abc:agentflow.website',
  text: 'Hello from my bot 👋',
  markdown: true,
});

await bot.joinRoom('#lobby:agentflow.website');
```

## Get a bot token

See [`bot-platform`](https://github.com/AgentFlowX/bot-platform#quick-start-60-seconds) or [docs.agentflow.website/bots/quickstart](https://docs.agentflow.website/bots/quickstart).

## API

| Method | Description |
|---|---|
| `bot.sendMessage({ room_id, text, markdown?, reply_to? })` | Send `m.text` event |
| `bot.joinRoom(roomIdOrAlias)` | Join a room by id or alias |
| `bot.me()` | Inspect calling bot (slug, matrix_user_id, tier, ...) |

More endpoints land as `bot-platform` adds them — webhooks, widgets, games. Tracked in [bot-platform roadmap](https://github.com/AgentFlowX/bot-platform#roadmap).

## Stack

- Zero deps. Uses native `fetch`.
- ESM + CJS dual build.
- Full TypeScript types.

## License

MIT.
