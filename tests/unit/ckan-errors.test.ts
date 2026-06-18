/**
 * Tests for CKAN error types.
 */
import { describe, it, expect } from "vitest";
import { CkanError } from "../../src/ckan/errors.js";

describe("CkanError", () => {
  it("creates timeout error", () => {
    const err = CkanError.timeout("package_search", 10000);
    expect(err).toBeInstanceOf(CkanError);
    expect(err.kind).toBe("timeout");
    expect(err.endpoint).toBe("package_search");
    expect(err.isRetryable).toBe(true);
    expect(err.message).toContain("10000ms");
  });

  it("creates network error", () => {
    const err = CkanError.network("package_search");
    expect(err.kind).toBe("network");
    expect(err.isRetryable).toBe(true);
  });

  it("creates HTTP status error", () => {
    const err = CkanError.httpStatus("package_search", 500, "Internal Server Error");
    expect(err.kind).toBe("http-status");
    expect(err.statusCode).toBe(500);
    expect(err.isRetryable).toBe(false);
  });

  it("creates unsuccessful envelope error", () => {
    const err = CkanError.unsuccessfulEnvelope("package_show", "Not found");
    expect(err.kind).toBe("unsuccessful-envelope");
    expect(err.isRetryable).toBe(false);
    expect(err.message).toContain("Not found");
  });

  it("is an instance of Error", () => {
    const err = new CkanError("test", "unknown");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CkanError");
  });
});
