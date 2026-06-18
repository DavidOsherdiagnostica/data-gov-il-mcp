/**
 * No-op auth provider — always authenticates as anonymous.
 * Used for stdio mode and open HTTP deployments (AUTH_MODE=none).
 */
import type { IAuthProvider, AuthContext } from "../auth.interface.js";
import type { Request } from "express";

export class NoopProvider implements IAuthProvider {
  authenticate(_request: Request): Promise<AuthContext> {
    return Promise.resolve({ subject: "anonymous", credential: "" });
  }
}
