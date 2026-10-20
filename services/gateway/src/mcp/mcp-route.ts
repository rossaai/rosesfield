import { createMcpHandler } from "@modelcontextprotocol/server"
import { type ModelForm, publishedModelOf } from "@rosesfield/catalog/comfy"
import type { AppDefinition } from "@rosesfield/contract"
import { gatewayCopy } from "#copy.en"
import type { GatewayApp, RequestScope } from "#gateway-env"
import { catalogMcpServer } from "#mcp/catalog-mcp-server"

export const mcpPath = "/mcp"

const catalogMethods: readonly string[] = ["tools/list", "tools/call"]

const internalError = -32603

type Message = {
  id: unknown
  method: string
}

async function bodyOf(request: Request): Promise<unknown> {
  return request.method === "POST"
    ? request.json().catch(() => undefined)
    : undefined
}

function messagesOf(body: unknown): Message[] {
  const messages: unknown[] = Array.isArray(body) ? body : [body]
  return messages.flatMap((message) => {
    if (typeof message !== "object" || message === null) {
      return []
    }
    const field = (name: string): unknown =>
      Object.getOwnPropertyDescriptor(message, name)?.value
    const method = field("method")
    return typeof method === "string" ? [{ id: field("id"), method }] : []
  })
}

async function formsFor(
  scope: RequestScope,
  apps: readonly AppDefinition[]
): Promise<readonly ModelForm[] | null> {
  const models = apps.flatMap((app) => {
    const model = publishedModelOf(app)
    return model === null ? [] : [model]
  })
  if (models.length === 0) {
    return []
  }
  const read = await scope.handlers.readModelForms.execute({ models })
  return read.refusal === null ? read.forms : null
}

function unreadReply(messages: readonly Message[]): Response {
  const replies = messages
    .filter((message) => message.id !== undefined)
    .map((message) => ({
      jsonrpc: "2.0",
      id: message.id,
      error: { code: internalError, message: gatewayCopy.mcp.catalogUnread },
    }))
  return Response.json(replies.length === 1 ? replies[0] : replies)
}

export function mcpRoute(
  app: GatewayApp,
  apps: readonly AppDefinition[]
): void {
  app.all(mcpPath, async (c) => {
    const { scope } = c.var
    const body = await bodyOf(c.req.raw.clone())
    const messages = messagesOf(body)
    const needsForms = messages.some((one) =>
      catalogMethods.includes(one.method)
    )
    const forms = needsForms ? await formsFor(scope, apps) : []
    if (forms === null) {
      return unreadReply(messages)
    }
    const handler = createMcpHandler(() =>
      catalogMcpServer({ apps, forms, scope })
    )
    return handler.fetch(
      c.req.raw,
      body === undefined ? {} : { parsedBody: body }
    )
  })
}
