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
export class BotApiError extends Error {
    status;
    code;
    detail;
    constructor(status, code, detail) {
        super(`${code}${detail ? `: ${detail}` : ''}`);
        this.status = status;
        this.code = code;
        this.detail = detail;
        this.name = 'BotApiError';
    }
}
const DEFAULT_HOST = 'https://bots.agentflow.website';
export class BotClient {
    token;
    host;
    fetcher;
    constructor(opts) {
        if (!opts.token)
            throw new Error('token_required');
        this.token = opts.token;
        this.host = (opts.host ?? DEFAULT_HOST).replace(/\/$/, '');
        this.fetcher = opts.fetcher ?? fetch;
    }
    async call(path, init) {
        const res = await this.fetcher(`${this.host}${path}`, {
            ...init,
            headers: {
                'content-type': 'application/json',
                'x-agentflow-bot-token': this.token,
                ...(init?.headers || {}),
            },
        });
        const body = (await res.json().catch(() => ({})));
        if (!res.ok || body.ok === false) {
            throw new BotApiError(res.status, body.error ?? 'unknown_error', body.detail);
        }
        return body;
    }
    /** Send `m.text` (optionally markdown). Returns the new event_id. */
    sendMessage(input) {
        return this.call('/api/v1/sendMessage', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }
    /** Join a room by `!id` or `#alias:server`. */
    joinRoom(roomIdOrAlias) {
        return this.call('/api/v1/joinRoom', {
            method: 'POST',
            body: JSON.stringify({ room_id_or_alias: roomIdOrAlias }),
        });
    }
    /** Introspect the calling bot (slug, mxid, tier, ...). */
    me() {
        return this.call('/api/v1/bots/me', { method: 'GET' });
    }
    /**
     * Register a webhook URL where the platform POSTs new room events.
     * Body of each delivery is `{update_id, message, room, sender}` (Telegram-style).
     * `X-AgentFlow-Signature` header is HMAC-SHA256 of the body using `secret`.
     * URL must be HTTPS public address — `https://localhost/` / private IPs blocked.
     */
    setWebhook(input) {
        return this.call('/api/v1/setWebhook', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }
    /** Drop the stored webhook URL. Delivery stops within ~5s. */
    deleteWebhook() {
        return this.call('/api/v1/deleteWebhook', { method: 'POST' });
    }
    /** Inspect current webhook config. */
    getWebhookInfo() {
        return this.call('/api/v1/getWebhookInfo', { method: 'GET' });
    }
    /**
     * Attach a mini-app widget to a Matrix room. Element renders it in the
     * right-side widget pane.
     *
     *   bot.registerWidget({ room_id, url: 'https://my-game.com', name: 'Darts' })
     */
    registerWidget(input) {
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
    createTable(input) {
        return this.call('/api/v1/games/createTable', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }
    /** Add a player to an existing table. Idempotent. */
    joinTable(input) {
        return this.call('/api/v1/games/joinTable', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }
    /** Replace the table's state JSON. Bot owns the schema. */
    setTableState(input) {
        return this.call('/api/v1/games/setState', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }
    /** Read table state. Available to anyone with the token of the bot that owns it. */
    getTableState(tableId) {
        return this.call(`/api/v1/games/state?table_id=${encodeURIComponent(String(tableId))}`, {
            method: 'GET',
        });
    }
    /**
     * Settle table with optional payouts (mapped to `chat_game_balances`).
     * Mark table status='finished'.
     */
    closeTable(input) {
        return this.call('/api/v1/games/closeTable', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }
}
export default BotClient;
