/**
 * @agentflowx/bot-sdk — thin wrapper around the AgentFlow Bot Platform REST API.
 *
 * Zero runtime deps — uses native `fetch`. Browser-safe (works in service
 * workers, Cloudflare Workers, Deno, Node 20+, Bun).
 *
 *   const bot = new BotClient({ token: process.env.AF_BOT_TOKEN! });
 *   await bot.sendMessage({ room_id, text: 'hi' });
 *
 * Docs: https://docs.agentflow.website/bots
 */

export interface BotClientOptions {
  /** `af_bot_<hex>` from POST /api/v1/bots. */
  token: string;
  /** Override host. Default `https://bots.agentflow.website`. */
  host?: string;
  /** Override fetch (testing). */
  fetcher?: typeof fetch;
}

export interface SendMessageInput {
  room_id: string;
  text: string;
  markdown?: boolean;
  reply_to?: string;
}

export interface SendMessageResult {
  ok: true;
  event_id: string;
}

export interface MeResult {
  ok: true;
  slug: string;
  display_name: string;
  matrix_user_id: string;
  is_verified: boolean;
  tier: string;
  rate_limit_qps: number;
  webhook_url: string | null;
}

export class BotApiError extends Error {
  status: number;
  code: string;
  detail?: string;
  constructor(status: number, code: string, detail?: string) {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.name = 'BotApiError';
  }
}

const DEFAULT_HOST = 'https://bots.agentflow.website';

export class BotClient {
  private token: string;
  private host: string;
  private fetcher: typeof fetch;

  constructor(opts: BotClientOptions) {
    if (!opts.token) throw new Error('token_required');
    this.token = opts.token;
    this.host = (opts.host ?? DEFAULT_HOST).replace(/\/$/, '');
    this.fetcher = opts.fetcher ?? fetch;
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetcher(`${this.host}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-agentflow-bot-token': this.token,
        ...(init?.headers || {}),
      },
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      detail?: string;
    };
    if (!res.ok || body.ok === false) {
      throw new BotApiError(res.status, body.error ?? 'unknown_error', body.detail);
    }
    return body as T;
  }

  /** Send `m.text` (optionally markdown). Returns the new event_id. */
  sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    return this.call('/api/v1/sendMessage', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /** Join a room by `!id` or `#alias:server`. */
  joinRoom(roomIdOrAlias: string): Promise<{ ok: true; room_id: string }> {
    return this.call('/api/v1/joinRoom', {
      method: 'POST',
      body: JSON.stringify({ room_id_or_alias: roomIdOrAlias }),
    });
  }

  /** Introspect the calling bot (slug, mxid, tier, ...). */
  me(): Promise<MeResult> {
    return this.call('/api/v1/bots/me', { method: 'GET' });
  }

  /**
   * Register a webhook URL where the platform POSTs new room events.
   * Body of each delivery is `{update_id, message, room, sender}` (Telegram-style).
   * `X-AgentFlow-Signature` header is HMAC-SHA256 of the body using `secret`.
   * URL must be HTTPS public address — `https://localhost/` / private IPs blocked.
   */
  setWebhook(input: { url: string; secret: string }): Promise<{ ok: true; url: string }> {
    return this.call('/api/v1/setWebhook', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /** Drop the stored webhook URL. Delivery stops within ~5s. */
  deleteWebhook(): Promise<{ ok: true }> {
    return this.call('/api/v1/deleteWebhook', { method: 'POST' });
  }

  /** Inspect current webhook config. */
  getWebhookInfo(): Promise<{ ok: true; url: string | null; has_webhook: boolean }> {
    return this.call('/api/v1/getWebhookInfo', { method: 'GET' });
  }

  /**
   * Attach a mini-app widget to a Matrix room. Element renders it in the
   * right-side widget pane.
   *
   *   bot.registerWidget({ room_id, url: 'https://my-game.com', name: 'Darts' })
   */
  registerWidget(input: {
    room_id: string;
    url: string;
    name: string;
    widget_id?: string;
    data?: Record<string, unknown>;
  }): Promise<{ ok: true; event_id: string; widget_id: string }> {
    return this.call('/api/v1/registerWidget', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /* ─── Game API ──────────────────────────────────────────────────── */

  /**
   * Create a new "table" — a game-scoped record + Matrix room.
   * Returns table_id and the room_id (newly created if not provided).
   */
  createTable(input: {
    game: string;
    config?: Record<string, unknown>;
    room_id?: string;
    name?: string;
  }): Promise<{ ok: true; table_id: number; room_id: string; game: string }> {
    return this.call('/api/v1/games/createTable', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /** Add a player to an existing table. Idempotent. */
  joinTable(input: {
    table_id: number;
    player_mxid: string;
  }): Promise<{ ok: true; players: string[] }> {
    return this.call('/api/v1/games/joinTable', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /** Replace the table's state JSON. Bot owns the schema. */
  setTableState(input: {
    table_id: number;
    state: Record<string, unknown>;
    status?: 'open' | 'in_progress' | 'finished';
  }): Promise<{ ok: true; version: number }> {
    return this.call('/api/v1/games/setState', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /** Read table state. Available to anyone with the token of the bot that owns it. */
  getTableState(tableId: number): Promise<{
    ok: true;
    table_id: number;
    game: string;
    status: string;
    room_id: string;
    state: Record<string, unknown>;
    players: string[];
    version: number;
  }> {
    return this.call(`/api/v1/games/state?table_id=${encodeURIComponent(String(tableId))}`, {
      method: 'GET',
    });
  }

  /**
   * Settle table with optional payouts (mapped to `chat_game_balances`).
   * Mark table status='finished'.
   */
  closeTable(input: {
    table_id: number;
    payouts?: Array<{ af_user_id: number; pnl: number }>;
  }): Promise<{ ok: true; settled_at: string }> {
    return this.call('/api/v1/games/closeTable', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}

export default BotClient;
