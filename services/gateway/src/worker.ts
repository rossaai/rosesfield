import { errorEnvelopeOf } from "@rosesfield/contract"
import { ProjectError } from "@rosesfield/kernel"
import { buildHandlers } from "#build-handlers"
import { ownerScope } from "#compose/request-scope"
import { ownerSettings } from "#compose/settings"
import { visitorScopeFor } from "#compose/visitor-ports"
import { checkEngineSettings } from "#engine/engine-target"
import { type AgentMount, createGateway } from "#gateway"
import type { GatewayApp } from "#gateway-env"
import { TokenTries } from "#lock/token-tries"
import { SessionLimiter } from "#session/session-limiter"
import { SessionPurge } from "#session/session-purge"
import { forwardToAgentHost } from "#worker/agent-forward"
import { AgentHost } from "#worker/agent-host"
import { AlarmJobRunner } from "#worker/alarm-job-runner"
import { RunWatcher } from "#worker/run-watcher"
import {
  ownerPorts,
  type WorkerBindings,
  type WorkerParts,
  workerParts,
} from "#worker/worker-ports"

export { AgentHost, RunWatcher }

let gateway: GatewayApp | null = null

function composeWorkerGateway(env: WorkerBindings): GatewayApp {
  const parts = workerParts(env)
  const { vars } = parts
  checkEngineSettings(vars.engine)
  const agent: AgentMount = {
    mode: "forward",
    forward: forwardToAgentHost(env.AGENTS),
  }
  if (vars.access.mode === "public") {
    const limiter = new SessionLimiter({
      db: parts.db,
      clock: parts.clock,
      requestsPerMinute: vars.access.requestsPerMinute,
    })
    return createGateway({
      apps: parts.apps,
      guard: {
        mode: "public",
        secret: vars.access.sessionSecret,
        retentionDays: vars.access.retentionDays,
        take: (sessionId) => limiter.take(sessionId),
      },
      scopeFor: (c) => visitorScopeFor(c, { ...parts, agents: null }),
      agent,
      platform: [],
    })
  }
  const { handlers } = buildHandlers(
    ownerPorts(parts),
    () => new AlarmJobRunner({ watchers: env.WATCHERS })
  )
  const scope = ownerScope({
    handlers,
    agent: null,
    settings: ownerSettings(vars),
  })
  return createGateway({
    apps: parts.apps,
    guard: {
      mode: "owner",
      lock: vars.access.lock,
      tries: new TokenTries({ clock: parts.clock }),
      clientOf: (c) => c.req.header("cf-connecting-ip") ?? null,
    },
    scopeFor: async () => scope,
    agent,
    platform: [],
  })
}

function settingsFailure(error: unknown): Response {
  console.error(error instanceof Error ? error.message : error)
  if (error instanceof ProjectError) {
    return Response.json(errorEnvelopeOf(error), { status: error.status })
  }
  throw error
}

async function purgeExpired(parts: WorkerParts): Promise<void> {
  const { access } = parts.vars
  if (access.mode !== "public") {
    return
  }
  await new SessionPurge({
    db: parts.db,
    store: parts.store,
    clock: parts.clock,
    retentionDays: access.retentionDays,
  }).run()
}

// biome-ignore lint/style/noDefaultExport: the Workers runtime reads the module's default export
export default {
  fetch(request, env, context) {
    try {
      gateway ??= composeWorkerGateway(env)
    } catch (error) {
      return settingsFailure(error)
    }
    return gateway.fetch(request, env, context)
  },
  scheduled(_controller, env, context) {
    context.waitUntil(purgeExpired(workerParts(env)))
  },
} satisfies ExportedHandler<WorkerBindings>
