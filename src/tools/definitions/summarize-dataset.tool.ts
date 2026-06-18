import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { structured, errorResponse } from "../../formatting/response.js";
import type { DatasetsService } from "../../services/datasets.service.js";
import type { ToolDefinition, ToolHandlerContext } from "../tool.interface.js";
import {
  summarizeDatasetInput,
  summarizeDatasetOutput,
  type SummarizeDatasetInput,
  type SummarizeDatasetOutput,
} from "../schemas/summarize-dataset.schema.js";

function contentText(content: unknown): string | undefined {
  if (content === null || typeof content !== "object") return undefined;
  const item = content as Record<string, unknown>;
  if (item["type"] !== "text") return undefined;
  const text = item["text"];
  return typeof text === "string" ? text : undefined;
}

function buildSummaryPrompt(
  dataset: SummarizeDatasetOutput["dataset"],
  language: "he" | "en",
): string {
  const languageLabel = language === "he" ? "Hebrew" : "English";
  const payload = {
    title: dataset.title,
    name: dataset.name,
    organization: dataset.organization,
    notes: dataset.notes,
    tags: dataset.tags,
    metadata_modified: dataset.metadata_modified,
    resources: dataset.resources.map((resource) => ({
      name: resource.name,
      format: resource.format,
      datastore_active: resource.datastore_active,
      description: resource.description,
    })),
  };

  return (
    `Summarize this Israeli data.gov.il dataset in ${languageLabel}. ` +
    "Explain what the dataset contains, who publishes it, which resources are queryable, " +
    "and 3 practical ways an analyst or AI agent could use it. " +
    "Be concise, factual, and avoid inventing fields not present in the metadata.\n\n" +
    JSON.stringify(payload, null, 2)
  );
}

export function createSummarizeDatasetTool(
  datasetsService: DatasetsService,
): ToolDefinition<typeof summarizeDatasetInput, typeof summarizeDatasetOutput> {
  return {
    name: "summarize_dataset",
    title: "Summarize Dataset",
    description:
      "Opt-in client-side AI summary for a specific data.gov.il dataset. " +
      "Use this after find_datasets() or get_dataset_info() when the user wants a concise " +
      "human-readable explanation of what a dataset contains and how to use it. " +
      "This tool requests MCP Sampling from the client when supported; if the client does " +
      "not support sampling or the request is declined, it falls back to returning the " +
      "dataset metadata with sampling.used=false.",
    inputSchema: summarizeDatasetInput,
    outputSchema: summarizeDatasetOutput,
    annotations: {
      readOnlyHint: true,
      idempotentHint: false,
      openWorldHint: true,
      title: "Summarize Dataset",
    },
    async handler(
      input: SummarizeDatasetInput,
      context: ToolHandlerContext,
    ): Promise<ReturnType<typeof structured<SummarizeDatasetOutput>>> {
      try {
        const d = await datasetsService.getInfo(input.dataset, false);
        const dataset: SummarizeDatasetOutput["dataset"] = {
          id: d.id,
          name: d.name,
          title: d.title,
          notes: d.notes ?? undefined,
          organization: d.organization?.title ?? d.organization?.name ?? undefined,
          tags: d.tags.map((tag) => tag.name),
          metadata_modified: d.metadata_modified,
          num_resources: d.num_resources,
          resources: d.resources.map((resource) => ({
            id: resource.id,
            name: resource.name,
            format: resource.format,
            datastore_active: resource.datastore_active,
            description: resource.description ?? undefined,
          })),
        };

        const sampling = {
          requested: true,
          available: Boolean(context.clientCapabilities?.sampling),
          used: false,
          fallback_reason: undefined as string | undefined,
          model: undefined as string | undefined,
          stop_reason: undefined as string | undefined,
        };

        let summary: string | undefined;

        if (!sampling.available) {
          sampling.fallback_reason = "client_does_not_support_sampling";
        } else {
          try {
            const result = await context.request.sendRequest(
              {
                method: "sampling/createMessage",
                params: {
                  messages: [
                    {
                      role: "user",
                      content: {
                        type: "text",
                        text: buildSummaryPrompt(dataset, input.language ?? "he"),
                      },
                    },
                  ],
                  systemPrompt:
                    "You are a careful Israeli open-data analyst. Use only the provided metadata.",
                  maxTokens: input.max_tokens ?? 700,
                },
              },
              CreateMessageResultSchema,
              { signal: context.signal },
            );

            summary = contentText(result.content);
            sampling.used = summary !== undefined;
            sampling.model = result.model;
            sampling.stop_reason = result.stopReason;
            if (!summary) {
              sampling.fallback_reason = "sampling_returned_non_text_content";
            }
          } catch (err: unknown) {
            sampling.fallback_reason =
              err instanceof Error ? `sampling_failed: ${err.message}` : "sampling_failed";
          }
        }

        const data: SummarizeDatasetOutput = {
          dataset,
          summary,
          sampling,
        };

        return structured(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(`Failed to summarize dataset '${input.dataset}': ${msg}`);
      }
    },
  };
}
