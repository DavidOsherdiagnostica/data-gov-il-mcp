import type { PromptDefinition } from "../prompt.interface.js";
import { environmentalTemplate } from "../templates/environmental.template.js";

export const environmentalPrompt: PromptDefinition = {
  name: "environmental-sustainability-analysis",
  description:
    "Expert environmental and sustainability data analyst specializing in the Israeli environmental landscape. " +
    "Analyzes green buildings, air quality, waste management, water resources, and contaminated land data " +
    "from data.gov.il.",
  arguments: [
    {
      name: "analysis_focus",
      description:
        "Optional focus area: e.g. 'air quality', 'green buildings', 'waste management', " +
        "'water resources', 'contaminated sites'. Narrows the analysis to a specific domain.",
      required: false,
    },
  ],
  handler(args) {
    return {
      description: "Environmental & Sustainability Data Analysis Expert — Israeli Market",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: environmentalTemplate(args["analysis_focus"]),
          },
        },
      ],
    };
  },
};
