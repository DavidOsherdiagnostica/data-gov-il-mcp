/**
 * API-Key provider — validates Bearer tokens against a static key set.
 * Configure with AUTH_MODE=apikey and API_KEYS=key1,key2,...
 */
import type { IAuthProvider, AuthContext } from "../auth.interface.js";
import type { Request } from "express";

export class ApiKeyProvider implements IAuthProvider {
  constructor(private readonly validKeys: ReadonlySet<string>) {}

  authenticate(request: Request): Promise<AuthContext | null> {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return Promise.resolve(null);

    const key = auth.slice(7).trim();
    if (!key) return Promise.resolve(null);

    if (!this.validKeys.has(key)) {
      // Key present but invalid — throw so middleware returns 401
      return Promise.reject(new Error("Invalid API key"));
    }

    return Promise.resolve({ subject: `apikey:${key.slice(0, 8)}***`, credential: key });
  }
}
