/**
 * Typed CKAN errors — replace the generic `throw new Error(string)` pattern.
 */

export type CkanErrorKind = "timeout" | "network" | "http-status" | "unsuccessful-envelope" | "unknown";

export class CkanError extends Error {
  readonly kind: CkanErrorKind;
  readonly statusCode: number | undefined;
  readonly endpoint: string | undefined;

  constructor(
    message: string,
    kind: CkanErrorKind,
    options?: { statusCode?: number; endpoint?: string; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "CkanError";
    this.kind = kind;
    this.statusCode = options?.statusCode;
    this.endpoint = options?.endpoint;
  }

  get isRetryable(): boolean {
    return this.kind === "timeout" || this.kind === "network";
  }

  static timeout(endpoint: string, timeoutMs: number): CkanError {
    return new CkanError(
      `Request to ${endpoint} timed out after ${timeoutMs}ms`,
      "timeout",
      { endpoint },
    );
  }

  static network(endpoint: string, cause?: unknown): CkanError {
    return new CkanError(
      `Unable to reach data.gov.il API (${endpoint}) — check internet connection`,
      "network",
      { endpoint, cause },
    );
  }

  static httpStatus(endpoint: string, status: number, statusText: string): CkanError {
    return new CkanError(
      `CKAN API returned HTTP ${status} ${statusText} for ${endpoint}`,
      "http-status",
      { endpoint, statusCode: status },
    );
  }

  static unsuccessfulEnvelope(endpoint: string, errorMsg?: string): CkanError {
    return new CkanError(
      `CKAN API returned success=false for ${endpoint}${errorMsg ? `: ${errorMsg}` : ""}`,
      "unsuccessful-envelope",
      { endpoint },
    );
  }
}
