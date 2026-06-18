/**
 * HTTP session store — isolated in its own module.
 *
 * MIGRATION NOTE (spec 2026-07-28):
 * The stateless spec removes session management entirely.
 * When migrating, delete this file and update http.transport.ts to
 * use a new stateless transport. No other files need to change.
 *
 * TODO(2026-07-28): Replace with stateless transport per SEP-004.
 * See: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/XXX
 */
import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export class SessionStore {
  private readonly sessions = new Map<string, StreamableHTTPServerTransport>();

  get(sessionId: string): StreamableHTTPServerTransport | undefined {
    return this.sessions.get(sessionId);
  }

  set(sessionId: string, transport: StreamableHTTPServerTransport): void {
    this.sessions.set(sessionId, transport);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  size(): number {
    return this.sessions.size;
  }

  /** Close and evict all active sessions. */
  async closeAll(): Promise<void> {
    const closeTasks = Array.from(this.sessions.values()).map((t) =>
      t.close().catch(() => undefined),
    );
    await Promise.allSettled(closeTasks);
    this.sessions.clear();
  }
}
