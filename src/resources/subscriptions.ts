import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ErrorCode,
  McpError,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "../observability/logger.js";
import type { ResourceDefinition, ResourceTemplateDefinition } from "./resource.interface.js";

export interface ResourceSubscriptionOptions {
  staticResources: ResourceDefinition[];
  templateResources: ResourceTemplateDefinition[];
  logger: Logger;
}

export interface ResourceSubscriptionManager {
  isSubscribed(uri: string): boolean;
  notifyUpdated(uri: string): Promise<boolean>;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templateToRegex(uriTemplate: string): RegExp {
  const escaped = escapeRegex(uriTemplate);
  return new RegExp(`^${escaped.replace(/\\\{[^}]+\\\}/g, "[^/]+")}$`);
}

function createResourceMatcher(
  staticResources: ResourceDefinition[],
  templateResources: ResourceTemplateDefinition[],
): (uri: string) => boolean {
  const staticUris = new Set(staticResources.map((resource) => resource.uri));
  const templatePatterns = templateResources.map((resource) => templateToRegex(resource.uriTemplate));

  return (uri: string): boolean =>
    staticUris.has(uri) || templatePatterns.some((pattern) => pattern.test(uri));
}

/**
 * Adds MCP resource subscription support per the stable resource spec:
 * clients subscribe/unsubscribe by URI, and updates are only emitted for
 * resources that were previously subscribed by the client connection.
 */
export function registerResourceSubscriptions(
  server: McpServer,
  options: ResourceSubscriptionOptions,
): ResourceSubscriptionManager {
  const log = options.logger.child({ component: "resource-subscriptions" });
  const isKnownResource = createResourceMatcher(options.staticResources, options.templateResources);
  const subscriptions = new Set<string>();

  server.server.setRequestHandler(SubscribeRequestSchema, (request) => {
    const { uri } = request.params;
    if (!isKnownResource(uri)) {
      throw new McpError(ErrorCode.InvalidParams, `Resource '${uri}' is not known or subscribable`);
    }

    subscriptions.add(uri);
    log.debug({ uri, count: subscriptions.size }, "Resource subscription registered");
    return {};
  });

  server.server.setRequestHandler(UnsubscribeRequestSchema, (request) => {
    const { uri } = request.params;
    subscriptions.delete(uri);
    log.debug({ uri, count: subscriptions.size }, "Resource subscription removed");
    return {};
  });

  return {
    isSubscribed(uri: string): boolean {
      return subscriptions.has(uri);
    },

    async notifyUpdated(uri: string): Promise<boolean> {
      if (!subscriptions.has(uri)) return false;
      await server.server.sendResourceUpdated({ uri });
      log.debug({ uri }, "Resource update notification sent");
      return true;
    },
  };
}
