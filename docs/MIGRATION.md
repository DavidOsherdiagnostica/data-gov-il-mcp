# Migration Guide — MCP Spec 2026-07-28 (Stateless HTTP)

This document maps every touch point that will need to change when the upcoming
**MCP stateless HTTP spec** (targeted for 2026-07-28, also referred to as
`2026-07-28-stateless` in the SDK roadmap) stabilises and the SDK releases v2.x.

The codebase has been designed so that **the vast majority of the project is
completely unaffected** by this spec change. Only the HTTP transport layer and
the SDK version bound need to change.

---

## Summary of the Spec Change

| Current (2025-11-25, SDK v1.x) | Future (2026-07-28, SDK v2.x) |
|---|---|
| Stateful sessions — each client gets a `Mcp-Session-Id` that persists across requests | Stateless — each HTTP request is fully independent |
| Server maintains `StreamableHTTPServerTransport` per session | Server creates a new transport instance per request |
| `SessionStore` maps session IDs → transports | `SessionStore` deleted entirely |
| `GET /mcp` for SSE streams uses session-ID routing | `GET /mcp` works without a session ID |
| `DELETE /mcp` terminates a session | `DELETE /mcp` not needed / semantics change |
| SDK exports `StreamableHTTPServerTransport` | SDK may export a new `StatelessHttpServerTransport` or update `StreamableHTTPServerTransport` |

---

## Files to Change

### 1. `package.json` — Version Bound

```
"@modelcontextprotocol/sdk": ">=1.13.0 <2"
```

When SDK v2 is released, **test** first before widening the bound. Steps:
1. Install the new version in a branch: `npm install @modelcontextprotocol/sdk@^2`
2. Run `npm run typecheck` — expect type errors only in the transport layer
3. Fix the transport (see step 3 below)
4. Update the bound to `>=2.0.0 <3` once CI is green

**No other dependency changes expected.**

---

### 2. `src/transports/session-store.ts` — Delete this file

The `SessionStore` class becomes entirely unnecessary. Remove the file.

Dependent imports:
- `src/transports/http.transport.ts` imports `SessionStore` — remove the import

---

### 3. `src/transports/http.transport.ts` — Replace Session Logic

This is the **only substantial code change** needed. The new transport handler
should look roughly like this (pseudocode; match actual SDK v2 API):

```typescript
// BEFORE (v1 stateful)
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  let transport: StreamableHTTPServerTransport;

  if (sessionId && this.sessions.has(sessionId)) {
    transport = this.sessions.get(sessionId)!;
  } else if (!sessionId) {
    // new session
    transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), ... });
    await mcpServer.connect(transport);
  }
  await transport.handleRequest(req, res, req.body);
});

// AFTER (v2 stateless)
app.post("/mcp", async (req, res) => {
  // One transport per request; no session tracking
  const transport = new StatelessHttpServerTransport();
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

Specific removals from `HttpTransport`:
- `private readonly sessions = new SessionStore()` → delete
- `onsessioninitialized` callback → delete
- `capturedTransport.onclose` cleanup → delete
- `GET /mcp` session-ID branch → remove session lookup; forward directly
- `DELETE /mcp` endpoint → remove entirely or update per new spec semantics
- `this.sessions.closeAll()` in `stop()` → delete

The `stop()` method keeps only the `http.Server` close call.

---

### 4. `src/transports/transport.interface.ts` — No change needed

The `ITransport` interface (`start()` / `stop()`) remains valid regardless of
the stateful/stateless distinction.

---

### 5. `src/bin/http.ts` — No change needed

The entry point constructs `HttpTransport` and calls `start()` — this stays
the same since the `ITransport` interface doesn't change.

---

### 6. All other files — No change needed

The following layers are **completely isolated** from the transport spec:

| Layer | Why unaffected |
|---|---|
| `src/config/` | Environment config, constants — transport-agnostic |
| `src/ckan/` | CKAN API client — transport-agnostic |
| `src/cache/` | In-memory cache — transport-agnostic |
| `src/services/` | Domain services — transport-agnostic |
| `src/tools/` | Tool definitions and handlers — transport-agnostic |
| `src/resources/` | Resource definitions and handlers — transport-agnostic |
| `src/prompts/` | Prompt definitions and handlers — transport-agnostic |
| `src/auth/` | Auth providers and middleware — transport-agnostic |
| `src/transports/stdio.transport.ts` | stdio protocol is unchanged by HTTP spec |
| `src/core/` | DI container, server factory, lifecycle — transport-agnostic |
| `src/observability/` | Logging — transport-agnostic |
| `src/formatting/` | Response builders — transport-agnostic |

---

## Checklist

When SDK v2 is released and you're ready to migrate:

- [ ] Create migration branch `chore/mcp-sdk-v2`
- [ ] `npm install @modelcontextprotocol/sdk@^2`
- [ ] Run `npm run typecheck` — note all errors (expect only transport layer)
- [ ] Delete `src/transports/session-store.ts`
- [ ] Rewrite session logic in `src/transports/http.transport.ts` per SDK v2 API
- [ ] Remove `TODO(2026-07-28)` comments throughout codebase (`rg "TODO(2026"`)
- [ ] Update `package.json` SDK version bound
- [ ] Run `npm run typecheck && npm run lint && npm test && npm run build`
- [ ] Update this `MIGRATION.md` to reflect the completed migration
- [ ] Update `CHANGELOG.md` with a `[3.x.0]` entry

---

## References

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [@modelcontextprotocol/sdk releases](https://github.com/modelcontextprotocol/typescript-sdk/releases)
- [SDK v1 → v2 changelog](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/CHANGELOG.md) _(update link when released)_
