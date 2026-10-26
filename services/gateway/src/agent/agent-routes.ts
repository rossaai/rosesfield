import {
  type AgentModelChoice,
  type AgentModels,
  agentModelRoutes,
  chatRatesOf,
  conversationRoutes,
  routerChat,
} from "@rosesfield/agent"
import { errorEnvelopeOf } from "@rosesfield/contract"
import { streamSSE } from "hono/streaming"
import type { GatewayApp, RequestScope } from "#gateway-env"
import {
  jsonBodyMaxBytes,
  limitBody,
  parseWith,
  type ResponseOf,
  readJson,
  readOptionalJson,
} from "#routes/read-request"

export function agentRoutes(app: GatewayApp): void {
  conversationListRoutes(app)
  conversationItemRoutes(app)
  proposalRoutes(app)
  modelRoutes(app)
}

async function agentModelsOf(
  scope: RequestScope,
  chosen: Promise<AgentModelChoice>
): Promise<AgentModels> {
  const [choice, { models, refusal }] = await Promise.all([
    chosen,
    scope.handlers.listModels.execute({}),
  ])
  if (refusal !== null) {
    return { models: [], model: null, refusal: errorEnvelopeOf(refusal).error }
  }
  const hasChat = models.some(
    (model) => model.id === routerChat.route && model.takesTools
  )
  if (!hasChat) {
    return { models: [], model: null, refusal: null }
  }
  return { ...choice, refusal: null, rates: chatRatesOf(choice.models) }
}

function modelRoutes(app: GatewayApp): void {
  const { listAgentModels, chooseAgentModel } = agentModelRoutes
  app.get(listAgentModels.path, async (c) => {
    const { scope } = c.var
    const listed = await agentModelsOf(scope, scope.agent.listModels.execute())
    return c.json(
      listed satisfies ResponseOf<typeof listAgentModels>,
      listAgentModels.status
    )
  })
  app.patch(chooseAgentModel.path, limitBody(jsonBodyMaxBytes), async (c) => {
    const body = parseWith(chooseAgentModel.body, await readJson(c), "body")
    const { scope } = c.var
    const listed = await agentModelsOf(
      scope,
      scope.agent.chooseModel.execute({ model: body.model })
    )
    return c.json(
      listed satisfies ResponseOf<typeof chooseAgentModel>,
      chooseAgentModel.status
    )
  })
}

function conversationListRoutes(app: GatewayApp): void {
  const { startConversation, listConversations } = conversationRoutes
  app.post(startConversation.path, limitBody(jsonBodyMaxBytes), async (c) => {
    const body = parseWith(
      startConversation.body,
      (await readOptionalJson(c)) ?? {},
      "body"
    )
    const started = await c.var.scope.agent.startConversation.execute({
      runApproval: body.runApproval ?? null,
    })
    return c.json(
      started satisfies ResponseOf<typeof startConversation>,
      startConversation.status
    )
  })
  app.get(listConversations.path, async (c) => {
    const listed = await c.var.scope.agent.listConversations.execute()
    return c.json(
      listed satisfies ResponseOf<typeof listConversations>,
      listConversations.status
    )
  })
}

function conversationItemRoutes(app: GatewayApp): void {
  const routes = conversationRoutes
  app.get(routes.readConversation.path, async (c) => {
    const read = await c.var.scope.agent.readConversation.execute({
      conversationId: c.req.param("conversationId"),
    })
    return c.json(
      read satisfies ResponseOf<typeof routes.readConversation>,
      routes.readConversation.status
    )
  })
  app.patch(
    routes.updateConversation.path,
    limitBody(jsonBodyMaxBytes),
    async (c) => {
      const changes = parseWith(
        routes.updateConversation.body,
        await readJson(c),
        "body"
      )
      const updated = await c.var.scope.agent.updateConversation.execute({
        conversationId: c.req.param("conversationId"),
        changes,
      })
      return c.json(
        updated satisfies ResponseOf<typeof routes.updateConversation>,
        routes.updateConversation.status
      )
    }
  )
  app.delete(routes.deleteConversation.path, async (c) => {
    await c.var.scope.agent.deleteConversation.execute({
      conversationId: c.req.param("conversationId"),
    })
    return c.body(null, routes.deleteConversation.status)
  })
  app.post(routes.sendMessage.path, limitBody(jsonBodyMaxBytes), async (c) => {
    const body = parseWith(routes.sendMessage.body, await readJson(c), "body")
    const { answer } = await c.var.scope.agent.sendMessage.execute({
      conversationId: c.req.param("conversationId"),
      text: body.text,
    })
    const release = c.var.scope.hold()
    return streamSSE(c, async (stream) => {
      stream.onAbort(() => answer.stop())
      try {
        for await (const event of answer) {
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          })
        }
      } finally {
        release()
      }
    })
  })
}

function proposalRoutes(app: GatewayApp): void {
  const { acceptProposal, skipProposal } = conversationRoutes
  app.post(acceptProposal.path, async (c) => {
    const accepted = await c.var.scope.agent.acceptProposal.execute({
      conversationId: c.req.param("conversationId"),
      proposalId: c.req.param("proposalId"),
    })
    return c.json(
      accepted satisfies ResponseOf<typeof acceptProposal>,
      acceptProposal.status
    )
  })
  app.post(skipProposal.path, async (c) => {
    const skipped = await c.var.scope.agent.skipProposal.execute({
      conversationId: c.req.param("conversationId"),
      proposalId: c.req.param("proposalId"),
    })
    return c.json(
      skipped satisfies ResponseOf<typeof skipProposal>,
      skipProposal.status
    )
  })
}
