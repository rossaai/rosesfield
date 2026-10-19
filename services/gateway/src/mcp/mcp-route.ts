import { createMcpHandler } from "@modelcontextprotocol/server"
import type { AppDefinition } from "@rosesfield/contract"
import type { GatewayApp } from "#gateway-env"
import { catalogMcpServer } from "#mcp/catalog-mcp-server"

export const mcpPath = "/mcp"

export function mcpRoute(
  app: GatewayApp,
  apps: readonly AppDefinition[]
): void {
  app.all(mcpPath, async (c) => {
    const { scope } = c.var
    const models = await scope.handlers.listModels
      .execute({})
      .then((listed) => listed.models)
      .catch(() => [])
    const handler = createMcpHandler(() =>
      catalogMcpServer({ apps, models, scope })
    )
    return handler.fetch(c.req.raw)
  })
}
