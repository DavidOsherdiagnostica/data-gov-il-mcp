/**
 * CLI entry point — query data.gov.il directly from the terminal.
 *
 * A thin command-line front-end over the same domain services the MCP server
 * uses (built via the shared composition root), so terminal output and MCP
 * tool output stay in lockstep. stdout carries ONLY the JSON result; all logs
 * go to stderr via pino, so the CLI composes cleanly in pipelines:
 *
 *   data-gov-il-mcp-cli find-datasets "תקציב" --sort=newest | jq '.results[].name'
 *   data-gov-il-mcp-cli search-records <resource_id> --limit=5 --filters='{"city":"חיפה"}'
 */
import "dotenv/config";
import { env } from "../config/env.js";
import { logger } from "../observability/logger.js";
import { buildContainer } from "../core/container.js";
import { DEFAULT_LIMITS, type SortOption } from "../config/constants.js";

const log = logger.child({ transport: "cli" });

interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string>;
}

/** Minimal zero-dependency argv parser: `cmd pos1 pos2 --flag=value --bool`. */
function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const positionals: string[] = [];
  const flags: Record<string, string> = {};
  for (const token of rest) {
    if (token.startsWith("--")) {
      const body = token.slice(2);
      const eq = body.indexOf("=");
      if (eq === -1) flags[body] = "true";
      else flags[body.slice(0, eq)] = body.slice(eq + 1);
    } else {
      positionals.push(token);
    }
  }
  return { command, positionals, flags };
}

const HELP = `data-gov-il-mcp CLI — query Israeli Government Open Data (data.gov.il)

Usage:
  data-gov-il-mcp-cli <command> [arguments] [--flags]

Commands:
  find-datasets <query>        Search the catalog. Flags: --tags=<tag> --sort=<newest|relevance|popular|updated>
  get-dataset <id>             Full metadata for a dataset (slug or UUID). Flag: --tracking
  list-resources <id>          List a dataset's resources (files/datastores). Flag: --tracking
  search-records <resourceId>  Query datastore records.
                               Flags: --q=<text> --limit=<n> --offset=<n> --fields=<a,b>
                                      --sort=<"field asc"> --filters=<json> --distinct=<field> --total
  list-organizations           List all publishing organizations.
  get-organization <id>        Full metadata for an organization (slug).
  help                         Show this help.

Output: JSON on stdout (logs on stderr). Pipe to jq for filtering.`;

/** Emit a JSON result to stdout and exit cleanly. */
function emit(result: unknown): void {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

async function run(): Promise<void> {
  const { command, positionals, flags } = parseArgs(process.argv.slice(2));

  if (command === "" || command === "help" || flags["help"] === "true") {
    process.stdout.write(HELP + "\n");
    return;
  }

  const container = buildContainer(env, logger);
  const first = positionals[0];

  switch (command) {
    case "find-datasets": {
      if (!first) throw new Error("find-datasets requires a <query> argument");
      emit(
        await container.datasetsService.search({
          query: first,
          sort: flags["sort"] as SortOption | undefined,
          tags: flags["tags"],
        }),
      );
      break;
    }

    case "get-dataset": {
      if (!first) throw new Error("get-dataset requires a <id> argument (dataset slug or UUID)");
      emit(await container.datasetsService.getInfo(first, flags["tracking"] === "true"));
      break;
    }

    case "list-resources": {
      if (!first) throw new Error("list-resources requires a <id> argument (dataset slug or UUID)");
      emit(
        await container.resourcesService.listForDataset({
          datasetId: first,
          includeTracking: flags["tracking"] === "true",
        }),
      );
      break;
    }

    case "search-records": {
      if (!first) throw new Error("search-records requires a <resourceId> argument");
      let filters: Record<string, unknown> | undefined;
      if (flags["filters"] !== undefined) {
        try {
          filters = JSON.parse(flags["filters"]) as Record<string, unknown>;
        } catch {
          throw new Error(`--filters must be valid JSON, e.g. --filters='{"city":"חיפה"}'`);
        }
      }
      emit(
        await container.recordsService.search({
          resourceId: first,
          q: flags["q"],
          limit: flags["limit"] !== undefined ? Number(flags["limit"]) : DEFAULT_LIMITS.search,
          offset: flags["offset"] !== undefined ? Number(flags["offset"]) : undefined,
          filters,
          fields: flags["fields"] !== undefined ? flags["fields"].split(",") : undefined,
          sort: flags["sort"] !== undefined ? flags["sort"].split(",") : undefined,
          includeTotal: flags["total"] === "true" ? true : undefined,
          distinct: flags["distinct"],
        }),
      );
      break;
    }

    case "list-organizations": {
      emit(await container.organizationsService.list());
      break;
    }

    case "get-organization": {
      if (!first) throw new Error("get-organization requires a <id> argument (organization slug)");
      emit(await container.organizationsService.getInfo(first));
      break;
    }

    default:
      throw new Error(`Unknown command: "${command}". Run "data-gov-il-mcp-cli help" for usage.`);
  }
}

run().catch((err: unknown) => {
  log.error({ err }, "CLI command failed");
  process.stderr.write(`[data-gov-il-mcp] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
