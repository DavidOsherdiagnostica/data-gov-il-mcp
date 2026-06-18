/**
 * Auth provider factory — selects the implementation based on AUTH_MODE env.
 */
import type { IAuthProvider } from "./auth.interface.js";
import { NoopProvider } from "./providers/noop.provider.js";
import { ApiKeyProvider } from "./providers/apikey.provider.js";
import { OAuthProvider } from "./providers/oauth.provider.js";
import type { EnvConfig } from "../config/env.js";
import { apiKeys } from "../config/env.js";

export function createAuthProvider(env: EnvConfig): IAuthProvider {
  switch (env.AUTH_MODE) {
    case "none":
      return new NoopProvider();

    case "apikey":
      if (apiKeys.size === 0) {
        throw new Error(
          "AUTH_MODE=apikey requires at least one key in API_KEYS (comma-separated)",
        );
      }
      return new ApiKeyProvider(apiKeys);

    case "oauth": {
      if (!env.OAUTH_JWKS_URI || !env.OAUTH_ISSUER || !env.OAUTH_AUDIENCE) {
        throw new Error(
          "AUTH_MODE=oauth requires OAUTH_JWKS_URI, OAUTH_ISSUER, and OAUTH_AUDIENCE",
        );
      }
      return new OAuthProvider({
        jwksUri: env.OAUTH_JWKS_URI,
        issuer: env.OAUTH_ISSUER,
        audience: env.OAUTH_AUDIENCE,
      });
    }
  }
}
