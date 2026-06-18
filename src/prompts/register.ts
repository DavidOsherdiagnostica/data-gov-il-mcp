/**
 * Registers all MCP Prompts with argument completions via the SDK's
 * completable() helper — each prompt arg gets curated suggestions filtered
 * by what the user has typed so far.
 */
import { z } from "zod";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { foodNutritionPrompt } from "./definitions/food-nutrition.prompt.js";
import { environmentalPrompt } from "./definitions/environmental.prompt.js";
import { realEstatePrompt } from "./definitions/real-estate.prompt.js";
import type { CatalogService } from "../catalog/index.js";
import type { Logger } from "../observability/logger.js";

// ── Domain suggestion sets ────────────────────────────────────────────────────

const FOOD_ANALYSIS_TYPES = [
  "price analysis",
  "nutritional planning",
  "kosher compliance",
  "food safety",
  "import/export",
  "food labeling",
  "additives",
];

const ENVIRONMENTAL_FOCUS_AREAS = [
  "air quality",
  "green buildings",
  "waste management",
  "water resources",
  "contaminated sites",
  "greenhouse gases",
  "biodiversity",
  "environmental permits",
];

const REAL_ESTATE_FOCUS_AREAS = [
  "investment",
  "buyers guide",
  "urban renewal",
  "subsidized housing",
  "tel-aviv",
  "jerusalem",
  "haifa",
  "beer-sheva",
  "residential",
  "commercial",
  "land registry",
];

function makeSuggester(options: string[]) {
  return (partial: string | undefined): string[] => {
    if (!partial) return options;
    const lc = partial.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lc));
  };
}

// ── Registration ──────────────────────────────────────────────────────────────

export function registerAllPrompts(
  server: McpServer,
  catalogService: CatalogService,
  logger: Logger,
): void {
  const log = logger.child({ component: "prompts-registry" });

  // Build a completion callback for org names using the catalog
  const orgNames = catalogService.organizations(200).map((o) => o.name);
  const suggestOrg = (partial: string | undefined): string[] => {
    if (!partial) return orgNames.slice(0, 20);
    const lc = partial.toLowerCase();
    return orgNames.filter((n) => n.includes(lc)).slice(0, 20);
  };

  // ── Food & Nutrition ────────────────────────────────────────────────────────
  server.registerPrompt(
    foodNutritionPrompt.name,
    {
      description: foodNutritionPrompt.description,
      argsSchema: {
        analysis_type: completable(
          z
            .string()
            .optional()
            .describe(
              "Optional focus: 'price analysis', 'nutritional planning', 'kosher compliance', " +
                "'food safety', 'import/export', 'food labeling', 'additives'",
            ),
          makeSuggester(FOOD_ANALYSIS_TYPES),
        ),
        organization: completable(
          z
            .string()
            .optional()
            .describe(
              "Optionally scope to a specific publisher org slug (e.g. 'ministry-of-health'). " +
                "Get valid slugs from list_organizations().",
            ),
          suggestOrg,
        ),
      },
    },
    (args) => {
      const result = foodNutritionPrompt.handler({ analysis_type: args.analysis_type ?? "" });
      return { description: result.description, messages: result.messages };
    },
  );
  log.debug({ prompt: foodNutritionPrompt.name }, "Registered prompt");

  // ── Environmental & Sustainability ──────────────────────────────────────────
  server.registerPrompt(
    environmentalPrompt.name,
    {
      description: environmentalPrompt.description,
      argsSchema: {
        analysis_focus: completable(
          z
            .string()
            .optional()
            .describe(
              "Optional focus: 'air quality', 'green buildings', 'waste management', " +
                "'water resources', 'contaminated sites', 'greenhouse gases', " +
                "'biodiversity', 'environmental permits'",
            ),
          makeSuggester(ENVIRONMENTAL_FOCUS_AREAS),
        ),
        organization: completable(
          z
            .string()
            .optional()
            .describe(
              "Optionally scope to a specific publisher org slug. " +
                "Get valid slugs from list_organizations().",
            ),
          suggestOrg,
        ),
      },
    },
    (args) => {
      const result = environmentalPrompt.handler({ analysis_focus: args.analysis_focus ?? "" });
      return { description: result.description, messages: result.messages };
    },
  );
  log.debug({ prompt: environmentalPrompt.name }, "Registered prompt");

  // ── Real Estate ─────────────────────────────────────────────────────────────
  server.registerPrompt(
    realEstatePrompt.name,
    {
      description: realEstatePrompt.description,
      argsSchema: {
        market_focus: completable(
          z
            .string()
            .optional()
            .describe(
              "Optional focus: 'investment', 'buyers guide', 'urban renewal', " +
                "'subsidized housing', city name (tel-aviv, jerusalem, haifa, beer-sheva), " +
                "'residential', 'commercial', 'land registry'",
            ),
          makeSuggester(REAL_ESTATE_FOCUS_AREAS),
        ),
        organization: completable(
          z
            .string()
            .optional()
            .describe(
              "Optionally scope to a specific publisher org slug. " +
                "Get valid slugs from list_organizations().",
            ),
          suggestOrg,
        ),
      },
    },
    (args) => {
      const result = realEstatePrompt.handler({ market_focus: args.market_focus ?? "" });
      return { description: result.description, messages: result.messages };
    },
  );
  log.debug({ prompt: realEstatePrompt.name }, "Registered prompt");

  log.info({ count: 3 }, "All prompts registered");
}
