/**
 * Tests for MCP resource definitions.
 */
import { describe, it, expect, vi } from "vitest";
import type { Mock } from "vitest";
import type { DatasetsService } from "../../src/services/datasets.service.js";
import type { CatalogService } from "../../src/catalog/index.js";
import { createDatasetResource } from "../../src/resources/definitions/dataset.resource.js";
import type { ResourceListItem } from "../../src/resources/resource.interface.js";

describe("dataset resource template", () => {
  it("lists dataset resources from CatalogService", async () => {
    const { datasetsService, catalogService, listDatasetResources } = mockServices();
    const resource = createDatasetResource(datasetsService, catalogService);

    const items = await resource.list?.();
    expect(listDatasetResources).toHaveBeenCalled();
    expect(items).toEqual([
      {
        uri: "datagov://dataset/test-dataset",
        name: "test-dataset",
        title: "Test Dataset",
        mimeType: "application/json",
      },
    ]);
  });

  it("completions delegate to CatalogService.completeDatasetName", () => {
    const { datasetsService, catalogService, completeDatasetName } = mockServices();
    const resource = createDatasetResource(datasetsService, catalogService);

    const completionFn = resource.completions?.["id"];
    expect(typeof completionFn).toBe("function");

    if (typeof completionFn === "function") {
      completionFn("bank");
      expect(completeDatasetName).toHaveBeenCalledWith("bank", 15);
    }
  });

  it("keeps the template handler generic for any valid dataset id", async () => {
    const { datasetsService, catalogService, getInfo } = mockServices();
    const resource = createDatasetResource(datasetsService, catalogService);

    const content = await resource.handler({ id: "some-valid-dataset" });

    expect(getInfo).toHaveBeenCalledWith("some-valid-dataset");
    expect(content.uri).toBe("datagov://dataset/some-valid-dataset");
    expect(content.mimeType).toBe("application/json");
    expect(JSON.parse(content.text ?? "{}")).toEqual({
      name: "some-valid-dataset",
      title: "Some Valid Dataset",
    });
  });
});

function mockServices(): {
  datasetsService: DatasetsService;
  catalogService: CatalogService;
  getInfo: Mock;
  listDatasetResources: Mock;
  completeDatasetName: Mock;
} {
  const getInfo = vi.fn((id: string) =>
    Promise.resolve({
      name: id,
      title: "Some Valid Dataset",
    }),
  );

  const fakeItems: ResourceListItem[] = [
    {
      uri: "datagov://dataset/test-dataset",
      name: "test-dataset",
      title: "Test Dataset",
      mimeType: "application/json",
    },
  ];

  const listDatasetResources = vi.fn(() => fakeItems);
  const completeDatasetName = vi.fn(() => ["test-dataset"]);

  return {
    datasetsService: { getInfo } as unknown as DatasetsService,
    catalogService: {
      listDatasetResources,
      completeDatasetName,
    } as unknown as CatalogService,
    getInfo,
    listDatasetResources,
    completeDatasetName,
  };
}
