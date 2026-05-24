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
export declare class BotApiError extends Error {
    status: number;
    code: string;
    detail?: string;
    constructor(status: number, code: string, detail?: string);
}
export declare class BotClient {
    private token;
    private host;
    private fetcher;
    constructor(opts: BotClientOptions);
    private call;
    /** Send `m.text` (optionally markdown). Returns the new event_id. */
    sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
    /** Join a room by `!id` or `#alias:server`. */
    joinRoom(roomIdOrAlias: string): Promise<{
        ok: true;
        room_id: string;
    }>;
    /** Introspect the calling bot (slug, mxid, tier, ...). */
    me(): Promise<MeResult>;
    /**
     * Register a webhook URL where the platform POSTs new room events.
     * Body of each delivery is `{update_id, message, room, sender}` (Telegram-style).
     * `X-AgentFlow-Signature` header is HMAC-SHA256 of the body using `secret`.
     * URL must be HTTPS public address — `https://localhost/` / private IPs blocked.
     */
    setWebhook(input: {
        url: string;
        secret: string;
    }): Promise<{
        ok: true;
        url: string;
    }>;
    /** Drop the stored webhook URL. Delivery stops within ~5s. */
    deleteWebhook(): Promise<{
        ok: true;
    }>;
    /** Inspect current webhook config. */
    getWebhookInfo(): Promise<{
        ok: true;
        url: string | null;
        has_webhook: boolean;
    }>;
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
    }): Promise<{
        ok: true;
        event_id: string;
        widget_id: string;
    }>;
    /**
     * Create a new "table" — a game-scoped record + Matrix room.
     * Returns table_id and the room_id (newly created if not provided).
     */
    createTable(input: {
        game: string;
        config?: Record<string, unknown>;
        room_id?: string;
        name?: string;
    }): Promise<{
        ok: true;
        table_id: number;
        room_id: string;
        game: string;
    }>;
    /** Add a player to an existing table. Idempotent. */
    joinTable(input: {
        table_id: number;
        player_mxid: string;
    }): Promise<{
        ok: true;
        players: string[];
    }>;
    /** Replace the table's state JSON. Bot owns the schema. */
    setTableState(input: {
        table_id: number;
        state: Record<string, unknown>;
        status?: 'open' | 'in_progress' | 'finished';
    }): Promise<{
        ok: true;
        version: number;
    }>;
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
    }>;
    /**
     * Settle table with optional payouts (mapped to `chat_game_balances`).
     * Mark table status='finished'.
     */
    closeTable(input: {
        table_id: number;
        payouts?: Array<{
            af_user_id: number;
            pnl: number;
        }>;
    }): Promise<{
        ok: true;
        settled_at: string;
    }>;
}
export default BotClient;
