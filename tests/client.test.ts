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
