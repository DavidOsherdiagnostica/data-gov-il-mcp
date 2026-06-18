/**
 * OAuth 2.1 Resource Server provider — validates JWT Bearer tokens.
 * Requires: AUTH_MODE=oauth, OAUTH_JWKS_URI, OAUTH_ISSUER, OAUTH_AUDIENCE.
 *
 * This implements the MCP OAuth 2.1 Resource Server pattern:
 * the server trusts tokens issued by an external Authorization Server.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { IAuthProvider, AuthContext } from "../auth.interface.js";
import type { Request } from "express";

export interface OAuthProviderOptions {
  jwksUri: string;
  issuer: string;
  audience: string;
}

export class OAuthProvider implements IAuthProvider {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly opts: OAuthProviderOptions) {
    this.jwks = createRemoteJWKSet(new URL(opts.jwksUri));
  }

  async authenticate(request: Request): Promise<AuthContext | null> {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;

    const token = auth.slice(7).trim();
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.opts.issuer,
        audience: this.opts.audience,
      });

      const subject = typeof payload.sub === "string" ? payload.sub : "unknown";

      return {
        subject,
        credential: token,
        claims: payload,
      };
    } catch (err: unknown) {
      throw new Error(
        `JWT verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
