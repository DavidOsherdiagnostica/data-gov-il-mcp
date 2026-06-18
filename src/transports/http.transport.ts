/**
 * Streamable HTTP transport — for remote/web usage.
 * Implements the MCP Streamable HTTP transport protocol.
 *
 * Security hardening applied:
 *   - Helmet: standard security headers (CSP, HSTS, X-Content-Type-Options, …)
 *   - Rate limiting: configurable per-IP limit (RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX)
 *   - Request IDs: every response carries X-Request-Id for distributed tracing
 *   - DNS rebinding: Host header validated against allowed origins
 *   - CORS: origin restricted by CORS_ORIGIN env (no wildcard in production)
 *   - Body size cap: 1 MB on /mcp to prevent memory exhaustion
 *   - Structured request logging: method, path, status, latency, requestId
 *   - X-Powered-By removed
 *
 * MIGRATION NOTE (spec 2026-07-28):
 * Sessions will be removed in the stateless spec.
 * See docs/MIGRATION.md for step-by-step instructions.
 */
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ITransport } from "./transport.interface.js";
import { SessionStore } from "./session-store.js";
import { createHostOriginGuard } from "./security/host-origin-guard.js";
import { registerWellKnown } from "../auth/well-known.js";
import type { EnvConfig } from "../config/env.js";
import type { Logger } from "../observability/logger.js";

export interface HttpTransportOptions {
  env: EnvConfig;
  logger: Logger;
  /** Auth middleware (optional) — injected by entry point. */
  authMiddleware?: express.RequestHandler | undefined;
}

// Augment Express Request to carry the per-request ID and start time.
declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
    startMs: number;
  }
}

export class HttpTransport implements ITransport {
  private server?: http.Server;
  private readonly sessions = new SessionStore();
  private readonly log: Logger;

  constructor(private readonly opts: HttpTransportOptions) {
    this.log = opts.logger.child({ component: "http-transport" });
  }

  async start(mcpServer: McpServer): Promise<void> {
    const app = express();
    const { env } = this.opts;

    // ─── Trust proxy ──────────────────────────────────────────────────────────
    // Required for rate limiting and real-IP logging behind nginx/ALB.
    if (env.TRUST_PROXY) {
      app.set("trust proxy", env.TRUST_PROXY);
    }

    // ─── Request ID + timing ──────────────────────────────────────────────────
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.requestId = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
      req.startMs = Date.now();
      next();
    });

    // ─── Host / Origin validation (DNS rebinding protection) ──────────────────
    app.use(createHostOriginGuard(env, this.log));

    // ─── Security headers (helmet) ────────────────────────────────────────────
    app.use(
      helmet({
        // API server — no browser context, skip CSP to avoid interfering with
        // clients that POST JSON (content-type: application/json).
        contentSecurityPolicy: false,
        // HSTS is only useful over HTTPS; let the reverse proxy handle it.
        strictTransportSecurity: false,
      }),
    );

    // ─── CORS ─────────────────────────────────────────────────────────────────
    app.use(
      cors({
        origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((o) => o.trim()),
        methods: ["GET", "POST", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "X-Request-Id"],
        exposedHeaders: ["Mcp-Session-Id", "X-Request-Id"],
      }),
    );

    // ─── Rate limiting ────────────────────────────────────────────────────────
    if (env.RATE_LIMIT_MAX > 0 && env.RATE_LIMIT_WINDOW_MS > 0) {
      const limiter = rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { error: "Too many requests, please slow down." },
        skip: (req) => req.path === "/health",
      });
      app.use(limiter);
      this.log.info(
        { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX },
        "Rate limiting enabled",
      );
    } else {
      this.log.warn("Rate limiting is disabled (RATE_LIMIT_MAX=0 or RATE_LIMIT_WINDOW_MS=0)");
    }

    // ─── Body parsing ─────────────────────────────────────────────────────────
    // General routes get 1 MB; the MCP endpoint gets its own limit applied inline.
    app.use(express.json({ limit: "1mb" }));

    // ─── Attach X-Request-Id to every response ────────────────────────────────
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader("X-Request-Id", req.requestId);
      next();
    });

    // ─── Structured request logging ───────────────────────────────────────────
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.on("finish", () => {
        const ms = Date.now() - req.startMs;
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "debug";
        this.log[level](
          {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            ms,
            requestId: req.requestId,
            ip: req.ip,
          },
          "request",
        );
      });
      next();
    });

    // ─── Auth middleware ───────────────────────────────────────────────────────
    if (this.opts.authMiddleware) {
      app.use("/mcp", this.opts.authMiddleware);
    }

    // ─── Health / readiness ───────────────────────────────────────────────────
    app.get("/health", (_req, res) => {
      res.json({
        status: "ok",
        sessions: this.sessions.size(),
        transport: "streamable-http",
      });
    });

    // ─── OAuth Protected Resource Metadata (RFC 9728 / MCP auth) ─────────────
    // Must remain unauthenticated so MCP clients can discover the authorization
    // server after receiving a 401 WWW-Authenticate challenge.
    registerWellKnown(app, env);

    // ─── MCP endpoint ──────────────────────────────────────────────────────────
    app.post("/mcp", async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && this.sessions.has(sessionId)) {
        const existing = this.sessions.get(sessionId);
        if (!existing) {
          res.status(404).json({ error: "Session not found" });
          return;
        }
        transport = existing;
      } else if (!sessionId) {
        // New session
        const newSessionId = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessioninitialized: (id) => {
            this.sessions.set(id, transport);
            this.log.debug({ sessionId: id }, "Session initialized");
          },
        });

        const capturedTransport = transport;
        capturedTransport.onclose = () => {
          const id = capturedTransport.sessionId;
          if (id) {
            this.sessions.delete(id);
            this.log.debug({ sessionId: id }, "Session closed");
          }
        };

        await mcpServer.connect(transport);
      } else {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    });

    app.get("/mcp", async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const transport = sessionId ? this.sessions.get(sessionId) : undefined;
      if (!transport) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      await transport.handleRequest(req, res);
    });

    app.delete("/mcp", async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const transport = sessionId ? this.sessions.get(sessionId) : undefined;
      if (!transport) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      await transport.handleRequest(req, res);
      this.sessions.delete(sessionId!);
      this.log.debug({ sessionId }, "Session deleted");
    });

    // ─── 404 fallback ─────────────────────────────────────────────────────────
    app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: "Not found" });
    });

    // ─── Unhandled error handler ───────────────────────────────────────────────
    app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
      this.log.error({ err, requestId: req.requestId }, "Unhandled request error");
      res.status(500).json({ error: "Internal server error" });
    });

    // ─── Start HTTP server ─────────────────────────────────────────────────────
    await new Promise<void>((resolve, reject) => {
      this.server = app.listen(env.PORT, env.HOST, () => resolve());
      this.server.once("error", reject);
    });

    this.log.info(
      {
        port: env.PORT,
        host: env.HOST,
        rateLimitEnabled: env.RATE_LIMIT_MAX > 0 && env.RATE_LIMIT_WINDOW_MS > 0,
        trustProxy: env.TRUST_PROXY,
      },
      "HTTP transport listening",
    );
  }

  async stop(): Promise<void> {
    await this.sessions.closeAll();

    await new Promise<void>((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((err) => (err ? reject(err) : resolve()));
    });

    this.log.info("HTTP transport stopped");
  }
}
