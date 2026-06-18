import type { PromptDefinition } from "../prompt.interface.js";
import { realEstateTemplate } from "../templates/real-estate.template.js";

export const realEstatePrompt: PromptDefinition = {
  name: "real-estate-market-analysis",
  description:
    "Expert real estate data analyst specializing in the Israeli property market. " +
    "Analyzes construction sites, urban renewal, subsidized housing (Mechir LaMishtaken), " +
    "demographics, municipal finances, and green building certifications from data.gov.il.",
  arguments: [
    {
      name: "market_focus",
      description:
        "Optional market focus: e.g. 'investment', 'buyers guide', 'urban renewal', " +
        "'subsidized housing', 'specific city'. Narrows the analysis to a specific segment.",
      required: false,
    },
  ],
  handler(args) {
    return {
      description: "Real Estate Data Analysis Expert — Israeli Market",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: realEstateTemplate(args["market_focus"]),
          },
        },
      ],
    };
  },
};
