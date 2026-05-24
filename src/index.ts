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
}

export default BotClient;
