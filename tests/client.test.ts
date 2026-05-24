import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BotClient, BotApiError } from '../src/index.js';

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>): typeof fetch {
  return ((url: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(url), init ?? {}))) as unknown as typeof fetch;
}

test('BotClient: throws on missing token', () => {
  assert.throws(() => new BotClient({ token: '' }));
});

test('BotClient.sendMessage: sends token + body, returns event_id', async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch((url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ ok: true, event_id: '$ev42' }), { status: 200 });
    }),
  });
  const r = await bot.sendMessage({ room_id: '!x:y', text: 'hi' });
  assert.equal(r.event_id, '$ev42');
  assert.ok(captured);
  assert.ok((captured as any).url.endsWith('/api/v1/sendMessage'));
  assert.equal(
    ((captured as any).init.headers as Record<string, string>)['x-agentflow-bot-token'],
    'af_bot_' + 'a'.repeat(64),
  );
});

test('BotClient.sendMessage: throws BotApiError on 400', async () => {
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch(() =>
      new Response(JSON.stringify({ ok: false, error: 'invalid_body', detail: 'text required' }), { status: 400 }),
    ),
  });
  await assert.rejects(
    bot.sendMessage({ room_id: '!x:y', text: 'hi' }),
    (err: unknown) => err instanceof BotApiError && (err as BotApiError).code === 'invalid_body',
  );
});

test('BotClient.joinRoom: posts alias', async () => {
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch(() => new Response(JSON.stringify({ ok: true, room_id: '!r:y' }), { status: 200 })),
  });
  const r = await bot.joinRoom('#lobby:y');
  assert.equal(r.room_id, '!r:y');
});

test('BotClient.setWebhook: posts url + secret', async () => {
  let body: string | null = null;
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch((_u, init) => {
      body = String(init.body);
      return new Response(JSON.stringify({ ok: true, url: 'https://hook.test' }), { status: 200 });
    }),
  });
  await bot.setWebhook({ url: 'https://hook.test', secret: 'sekret123' });
  const parsed = JSON.parse(body as unknown as string);
  assert.equal(parsed.url, 'https://hook.test');
  assert.equal(parsed.secret, 'sekret123');
});

test('BotClient.deleteWebhook: posts empty body', async () => {
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 })),
  });
  const r = await bot.deleteWebhook();
  assert.equal(r.ok, true);
});

test('BotClient.getWebhookInfo: returns has_webhook flag', async () => {
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch(() =>
      new Response(JSON.stringify({ ok: true, url: 'https://x.io', has_webhook: true }), {
        status: 200,
      }),
    ),
  });
  const r = await bot.getWebhookInfo();
  assert.equal(r.has_webhook, true);
  assert.equal(r.url, 'https://x.io');
});

test('BotClient.registerWidget: sends room_id + url + name', async () => {
  let body: string | null = null;
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch((_u, init) => {
      body = String(init.body);
      return new Response(
        JSON.stringify({ ok: true, event_id: '$abc', widget_id: 'darts' }),
        { status: 200 },
      );
    }),
  });
  await bot.registerWidget({ room_id: '!r:y', url: 'https://darts.io', name: 'Darts' });
  const parsed = JSON.parse(body as unknown as string);
  assert.equal(parsed.room_id, '!r:y');
  assert.equal(parsed.name, 'Darts');
});

test('BotClient.createTable: returns table_id', async () => {
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch(() =>
      new Response(
        JSON.stringify({ ok: true, table_id: 42, room_id: '!t:y', game: 'durak' }),
        { status: 200 },
      ),
    ),
  });
  const r = await bot.createTable({ game: 'durak', config: { players: 2 } });
  assert.equal(r.table_id, 42);
  assert.equal(r.game, 'durak');
});

test('BotClient.setTableState: posts state + version returned', async () => {
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    fetcher: mockFetch(() =>
      new Response(JSON.stringify({ ok: true, version: 7 }), { status: 200 }),
    ),
  });
  const r = await bot.setTableState({ table_id: 1, state: { turn: 'p1' } });
  assert.equal(r.version, 7);
});

test('BotClient: respects custom host', async () => {
  let capturedUrl = '';
  const bot = new BotClient({
    token: 'af_bot_' + 'a'.repeat(64),
    host: 'http://localhost:4200/',
    fetcher: mockFetch((u) => {
      capturedUrl = u;
      return new Response(JSON.stringify({ ok: true, event_id: '$1' }), { status: 200 });
    }),
  });
  await bot.sendMessage({ room_id: '!x:y', text: 'hi' });
  assert.ok(capturedUrl.startsWith('http://localhost:4200/api/v1/sendMessage'));
});
