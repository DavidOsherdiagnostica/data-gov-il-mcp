import { describe, expect, it, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { registerResourceSubscriptions } from "../../src/resources/subscriptions.js";
import type {
  ResourceDefinition,
  ResourceTemplateDefinition,
} from "../../src/resources/resource.interface.js";
import type { Logger } from "../../src/observability/logger.js";

describe("resource subscriptions", () => {
  it("accepts subscriptions for known static resources", async () => {
    const { manager, subscribe } = setup();

    subscribe("datagov://tags");

    expect(manager.isSubscribed("datagov://tags")).toBe(true);
  });

  it("accepts subscriptions for matching template resources", () => {
    const { manager, subscribe } = setup();

    subscribe("datagov://dataset/some-dataset");

    expect(manager.isSubscribed("datagov://dataset/some-dataset")).toBe(true);
  });

  it("rejects subscriptions for unknown resources", () => {
    const { subscribe } = setup();

    expect(() => subscribe("datagov://unknown")).toThrow(McpError);
  });

  it("only sends update notifications for subscribed resources", async () => {
    const { manager, subscribe, sendResourceUpdated } = setup();

    await expect(manager.notifyUpdated("datagov://tags")).resolves.toBe(false);
    expect(sendResourceUpdated).not.toHaveBeenCalled();

    subscribe("datagov://tags");
    await expect(manager.notifyUpdated("datagov://tags")).resolves.toBe(true);
    expect(sendResourceUpdated).toHaveBeenCalledWith({ uri: "datagov://tags" });
  });

  it("removes subscriptions", async () => {
    const { manager, subscribe, unsubscribe, sendResourceUpdated } = setup();

    subscribe("datagov://tags");
    unsubscribe("datagov://tags");

    expect(manager.isSubscribed("datagov://tags")).toBe(false);
    await expect(manager.notifyUpdated("datagov://tags")).resolves.toBe(false);
    expect(sendResourceUpdated).not.toHaveBeenCalled();
  });
});

function setup() {
  const setRequestHandler = vi.fn();
  const sendResourceUpdated = vi.fn(() => Promise.resolve());
  const server = {
    server: {
      setRequestHandler,
      sendResourceUpdated,
    },
  } as unknown as McpServer;

  const manager = registerResourceSubscriptions(server, {
    staticResources: [
      {
        uri: "datagov://tags",
        name: "Tags",
        handler: () => Promise.resolve({ uri: "datagov://tags", text: "{}" }),
      } satisfies ResourceDefinition,
    ],
    templateResources: [
      {
        uriTemplate: "datagov://dataset/{id}",
        name: "Dataset",
        handler: ({ id }) =>
          Promise.resolve({ uri: `datagov://dataset/${id ?? ""}`, text: "{}" }),
      } satisfies ResourceTemplateDefinition,
    ],
    logger: mockLogger(),
  });

  const subscribeHandler = setRequestHandler.mock.calls[0]?.[1] as (request: {
    params: { uri: string };
  }) => Record<string, never>;
  const unsubscribeHandler = setRequestHandler.mock.calls[1]?.[1] as (request: {
    params: { uri: string };
  }) => Record<string, never>;

  return {
    manager,
    sendResourceUpdated,
    subscribe: (uri: string) => subscribeHandler({ params: { uri } }),
    unsubscribe: (uri: string) => unsubscribeHandler({ params: { uri } }),
  };
}

function mockLogger(): Logger {
  const logger = {
    child: vi.fn(() => logger),
    debug: vi.fn(),
  };
  return logger as unknown as Logger;
}
