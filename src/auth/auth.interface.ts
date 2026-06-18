/**
 * Auth provider contract.
 * Implement this interface to add new authentication mechanisms.
 */
import type { Request } from "express";

export interface AuthContext {
  /** Identifier for the authenticated principal (e.g. sub claim or key prefix). */
  subject: string;
  /** Raw token/key used for authentication. */
  credential: string;
  /** Additional claims from the token (OAuth only). */
  claims?: Record<string, unknown>;
}

export interface IAuthProvider {
  /**
   * Authenticate an incoming HTTP request.
   * Returns AuthContext if authenticated, null if unauthenticated.
   * Throws if the credentials are present but invalid (as opposed to absent).
   */
  authenticate(request: Request): Promise<AuthContext | null>;
}
