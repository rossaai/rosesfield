import { createMcpHandler } from "@modelcontextprotocol/server"
import type { AppDefinition } from "@rosesfield/contract"
import type { HostedModel } from "@rosesfield/generation"
import type { GatewayApp } from "#gateway-env"
import { catalogMcpServer } from "#mcp/catalog-mcp-server"

export const mcpPath = "/mcp"

const catalogMethods: readonly string[] = ["tools/list", "tools/call"]

async function methodsOf(request: Request): Promise<string[]> {
  if (request.method !== "POST") {
    return []
  }
  const body: unknown = await request
    .clone()
    .json()
    .catch(() => null)
  const messages: unknown[] = Array.isArray(body) ? body : [body]
  return messages.flatMap((message) => {
    if (typeof message !== "object" || message === null) {
      return []
    }
    const method = Object.getOwnPropertyDescriptor(message, "method")?.value
    return typeof method === "string" ? [method] : []
  })
}

export function mcpRoute(
  app: GatewayApp,
  apps: readonly AppDefinition[]
): void {
  app.all(mcpPath, async (c) => {
    const { scope } = c.var
    const methods = await methodsOf(c.req.raw)
    const needsCatalog = methods.some((one) => catalogMethods.includes(one))
    const models: readonly HostedModel[] = needsCatalog
      ? await scope.handlers.listModels
          .execute({})
          .then((listed) => listed.models)
          .catch(() => [])
      : []
    const handler = createMcpHandler(() =>
      catalogMcpServer({ apps, models, scope })
    )
    return handler.fetch(c.req.raw)
  })
}
