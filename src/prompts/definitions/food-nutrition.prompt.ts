import type { PromptDefinition } from "../prompt.interface.js";
import { foodNutritionTemplate } from "../templates/food-nutrition.template.js";

export const foodNutritionPrompt: PromptDefinition = {
  name: "food-nutrition-analysis",
  description:
    "Expert food and nutrition data analyst specializing in the Israeli food landscape. " +
    "Analyzes food prices, nutritional composition, kosher certification, food safety, " +
    "and supply chain data from data.gov.il.",
  arguments: [
    {
      name: "analysis_type",
      description:
        "Optional focus: e.g. 'price analysis', 'nutritional planning', 'kosher compliance', " +
        "'food safety', 'import/export'. Narrows the analysis to a specific domain.",
      required: false,
    },
  ],
  handler(args) {
    return {
      description: "Food & Nutrition Data Analysis Expert — Israeli Market",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: foodNutritionTemplate(args["analysis_type"]),
          },
        },
      ],
    };
  },
};
