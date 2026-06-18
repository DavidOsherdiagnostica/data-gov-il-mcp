/**
 * Typed CKAN HTTP client.
 * Single responsibility: make HTTP GET requests to the CKAN API and return
 * typed, validated results. All serialization/deserialization lives here.
 */
import axios, { type AxiosInstance } from "axios";
import { type Logger } from "../observability/logger.js";
import { CkanError } from "./errors.js";
import type { CkanEnvelope, DatastoreSearchParams } from "./types.js";

export interface CkanClientOptions {
  baseUrl: string;
  defaultTimeoutMs: number;
  searchTimeoutMs: number;
  userAgent: string;
  logger: Logger;
}

export class CkanClient {
  private readonly http: AxiosInstance;
  private readonly log: Logger;
  private readonly searchTimeoutMs: number;

  constructor(private readonly opts: CkanClientOptions) {
    this.log = opts.logger.child({ component: "ckan-client" });
    this.searchTimeoutMs = opts.searchTimeoutMs;

    this.http = axios.create({
      baseURL: opts.baseUrl,
      timeout: opts.defaultTimeoutMs,
      headers: {
        "User-Agent": opts.userAgent,
        Accept: "application/json",
      },
    });
  }

  /**
   * Make a GET request to a CKAN endpoint and return the typed result.
   * Throws CkanError on any failure.
   */
  async get<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    timeoutMs?: number,
  ): Promise<T> {
    this.log.debug({ endpoint, params }, "CKAN request");

    try {
      const response = await this.http.get<CkanEnvelope<T>>(endpoint, {
        params,
        timeout: timeoutMs ?? this.opts.defaultTimeoutMs,
      });

      const data = response.data;

      if (!data.success) {
        throw CkanError.unsuccessfulEnvelope(
          endpoint,
          typeof data.error?.message === "string" ? data.error.message : undefined,
        );
      }

      this.log.debug({ endpoint }, "CKAN response OK");
      return data.result;
    } catch (err: unknown) {
      if (err instanceof CkanError) throw err;

      // Axios timeout
      if (axios.isAxiosError(err) && err.code === "ECONNABORTED") {
        throw CkanError.timeout(endpoint, timeoutMs ?? this.opts.defaultTimeoutMs);
      }

      // Axios HTTP error response
      if (axios.isAxiosError(err) && err.response) {
        throw CkanError.httpStatus(endpoint, err.response.status, err.response.statusText);
      }

      // Axios network error (no response received)
      if (axios.isAxiosError(err) && err.request) {
        throw CkanError.network(endpoint, err);
      }

      // Unknown error
      throw new CkanError(
        `Unexpected error calling ${endpoint}: ${err instanceof Error ? err.message : String(err)}`,
        "unknown",
        { endpoint, cause: err },
      );
    }
  }

  /**
   * Helper: datastore_search with proper serialization of complex params.
   * Handles filters (JSON stringify), fields (comma-join), sort (comma-join).
   */
  async datastoreSearch(params: DatastoreSearchParams) {
    const serialized: Record<string, unknown> = {
      resource_id: params.resource_id,
      limit: params.limit,
      offset: params.offset,
    };

    if (params.q) serialized["q"] = params.q;
    if (params.filters) serialized["filters"] = params.filters; // already JSON string from service
    if (params.fields) serialized["fields"] = params.fields; // already comma-joined
    if (params.sort) serialized["sort"] = params.sort; // already comma-joined
    if (params.include_total) serialized["include_total"] = params.include_total;
    if (params.distinct) serialized["distinct"] = params.distinct;

    return this.get<import("./types.js").DatastoreSearchResult>(
      "datastore_search",
      serialized,
      this.searchTimeoutMs,
    );
  }
}
