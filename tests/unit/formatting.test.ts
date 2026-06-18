/**
 * Tests for response formatting utilities.
 */
import { describe, it, expect } from "vitest";
import { text, errorResponse, structured, formatCount } from "../../src/formatting/response.js";
import { formatSearchRecordsError } from "../../src/formatting/guidance.js";
import { CkanError } from "../../src/ckan/errors.js";

describe("response builders", () => {
  it("text() creates a text-only response with no structuredContent", () => {
    const resp = text("Hello world");
    expect(resp.content).toHaveLength(1);
    expect(resp.content[0]).toEqual({ type: "text", text: "Hello world" });
    expect(resp.isError).toBeUndefined();
    expect(resp.structuredContent).toBeUndefined();
  });

  it("errorResponse() sets isError=true and emits JSON", () => {
    const resp = errorResponse("Something went wrong");
    expect(resp.isError).toBe(true);
    // content text must be parseable JSON
    const parsed = JSON.parse(resp.content[0]!.text) as unknown;
    expect(parsed).toMatchObject({ error: "Something went wrong" });
  });

  it("structured() content text is pretty-printed JSON matching structuredContent", () => {
    const data = { count: 5, items: ["a", "b"] };
    const resp = structured(data);
    expect(resp.structuredContent).toEqual(data);
    expect(resp.isError).toBeUndefined();
    // content text must be parseable JSON equal to structuredContent
    const parsed = JSON.parse(resp.content[0]!.text) as unknown;
    expect(parsed).toEqual(data);
  });

  it("structured() content text contains no prose markers", () => {
    const data = { total: 3, results: [] };
    const resp = structured(data);
    const text = resp.content[0]!.text;
    expect(text).not.toContain("NEXT STEPS");
    expect(text).not.toContain("WORKFLOW");
    expect(text).not.toContain("Popular");
  });

  it("structured() content text is identical JSON to JSON.stringify(data, null, 2)", () => {
    const data = { x: 1, y: null, z: [true, false] };
    const resp = structured(data);
    expect(resp.content[0]!.text).toBe(JSON.stringify(data, null, 2));
  });

  it("formatCount with no total", () => {
    expect(formatCount(3)).toBe("Found 3 results.");
    expect(formatCount(1)).toBe("Found 1 result.");
  });

  it("formatCount with total larger than found", () => {
    expect(formatCount(10, 1500)).toBe("Found 10 of 1,500 total results.");
  });

  it("formatCount with total equal to found", () => {
    expect(formatCount(5, 5)).toBe("Found 5 results.");
  });
});

describe("formatSearchRecordsError", () => {
  const resourceId = "7c8255d0-49ef-49db-8904-4cf917586031";

  it("adds field-ID hint for CKAN 409 errors", () => {
    const err = CkanError.httpStatus("datastore_search", 409, "Conflict");
    const message = formatSearchRecordsError(err, resourceId);

    expect(message).toContain(resourceId);
    expect(message).toContain("409");
    expect(message).toContain("fields[].id");
    expect(message).toContain("Probe first");
  });

  it("passes through other errors without the 409 hint", () => {
    const err = CkanError.timeout("datastore_search", 5000);
    const message = formatSearchRecordsError(err, resourceId);

    expect(message).toContain(resourceId);
    expect(message).not.toContain("Probe first");
  });
});
