import {
  type AgentModel,
  agentTools,
  openPiModels,
  PiAgentHarness,
} from "@rosesfield/agent"
import { openDurableObjectStorage } from "@rosesfield/agent/cloudflare"
import { Hono } from "hono"
import { AgentAccess, type AgentRequest } from "#agent/agent-access"
import { agentRoutes } from "#agent/agent-routes"
import { buildHandlers } from "#build-handlers"
import { ownerScope } from "#compose/request-scope"
import { ownerSettings } from "#compose/settings"
import { visitorScopeFor } from "#compose/visitor-ports"
import { type GatewayContext, scopeMiddleware } from "#gateway"
import type { GatewayApp, GatewayEnv, RequestScope } from "#gateway-env"
import { errorResponse, routeNotFound } from "#routes/error-response"
import { isSessionId } from "#session/session-cookie"
import { SessionPurge } from "#session/session-purge"
import { AlarmJobRunner } from "#worker/alarm-job-runner"
import {
  ownerPorts,
  type WorkerBindings,
  type WorkerParts,
  workerParts,
} from "#worker/worker-ports"

type Composed = {
  app: GatewayApp
  agent: PiAgentHarness | null
  parts: WorkerParts
}

export class AgentHost implements DurableObject {
  static readonly ownerName = "owner"
  static readonly sessionHeader = "x-rosesfield-session"

  private readonly state: DurableObjectState
  private readonly env: WorkerBindings
  private readonly access = new AgentAccess()
  private composed: Composed | null = null

  constructor(state: DurableObjectState, env: WorkerBindings) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    this.composed ??= this.compose()
    const { access } = this.composed.parts.vars
    if (access.mode === "public") {
      const retentionMs = access.retentionDays * SessionPurge.dayMs
      await this.state.storage.setAlarm(Date.now() + retentionMs)
    }
    return this.composed.app.fetch(request)
  }

  async alarm(): Promise<void> {
    if (this.access.isHeld()) {
      await this.state.storage.setAlarm(Date.now() + SessionPurge.dayMs)
      return
    }
    const composed = this.composed
    this.composed = null
    await composed?.agent?.close()
    await this.state.storage.deleteAll()
  }

  private compose(): Composed {
    const parts = workerParts(this.env)
    const model = parts.vars.agent
    const agent = model === null ? null : this.agentFor(parts, model)
    const app = new Hono<GatewayEnv>()
    app.onError(errorResponse)
    app.notFound(routeNotFound)
    app.use("*", async (c, next) => {
      const session = c.req.header(AgentHost.sessionHeader)
      c.set("session", isSessionId(session) ? session : null)
      await next()
    })
    app.use("*", scopeMiddleware(this.scopeFor(parts, agent)))
    agentRoutes(app)
    app.all("*", routeNotFound)
    return { app, agent, parts }
  }

  private agentFor(parts: WorkerParts, model: AgentModel): PiAgentHarness {
    const access = this.access
    return new PiAgentHarness({
      models: () => openPiModels(model, { keyOf: () => access.modelKey() }),
      storage: () => openDurableObjectStorage(this.state.storage),
      tools: agentTools({
        apps: parts.apps,
        handlers: () => access.handlers(),
      }),
      clock: parts.clock,
    })
  }

  private scopeFor(
    parts: WorkerParts,
    agent: PiAgentHarness | null
  ): (c: GatewayContext) => Promise<RequestScope> {
    if (parts.vars.access.mode === "public") {
      const agents =
        agent === null
          ? null
          : {
              agentOf: () => agent,
              hold: (_sessionId: string, request: AgentRequest) =>
                this.access.enter(request),
            }
      return (c) => visitorScopeFor(c, { ...parts, agents })
    }
    const { handlers } = buildHandlers(
      ownerPorts(parts),
      () => new AlarmJobRunner({ watchers: this.env.WATCHERS })
    )
    this.access.enter({ handlers, modelKey: null })
    const scope = ownerScope({
      handlers,
      agent,
      settings: ownerSettings(parts.vars),
    })
    return async () => scope
  }
}
