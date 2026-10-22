import { AsyncLocalStorage } from "node:async_hooks"
import { errorEnvelopeOf } from "@rosesfield/contract"
import { ComfyAccount } from "@rosesfield/generation"
import { ProjectError } from "@rosesfield/kernel"
import { buildHandlers } from "#build-handlers"
import { ownerScope } from "#compose/request-scope"
import { ownerSettings } from "#compose/settings"
import { visitorScopeFor } from "#compose/visitor-ports"
import { checkEngineSettings } from "#engine/engine-target"
import { type AgentMount, createGateway } from "#gateway"
import type { GatewayApp } from "#gateway-env"
import { TokenTries } from "#lock/token-tries"
import { ownerAccount, visitorAccount } from "#session/account-routes"
import { KeyProbe } from "#session/key-probe"
import { publicAccountParts } from "#session/public-account"
import { SessionLimiter } from "#session/session-limiter"
import { SessionPurge } from "#session/session-purge"
import { SessionVisits } from "#session/session-visits"
import { sharePostersOf } from "#share/media-share-posters"
import { r2ShareFiles } from "#share/r2-share-files"
import { shareLimit } from "#share/share-limit"
import { SharePurge } from "#share/share-purge"
import type { ShareMount } from "#share/share-routes"
import { SqliteShareRepository } from "#share/sqlite-share-repository"
import { ownerSpend } from "#spend/owner-spend"
import { forwardToAgentHost, moveAgentHost } from "#worker/agent-forward"
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

const requests = new AsyncLocalStorage<ExecutionContext>()

function deferToRequest(work: Promise<void>): void {
  requests.getStore()?.waitUntil(work)
}

const pageUrl = "https://rosesfield.assets/"

function shareMount(
  env: WorkerBindings,
  parts: WorkerParts,
  needsKey: boolean
): ShareMount {
  const posters = sharePostersOf(env.MEDIA)
  return {
    shares: new SqliteShareRepository({ db: parts.db }),
    store: parts.store,
    clock: parts.clock,
    ...(posters === undefined ? {} : { posters }),
    files: r2ShareFiles(env.BUCKET),
    limit: shareLimit({
      db: parts.db,
      clock: parts.clock,
      clientOf: (c) => c.req.header("cf-connecting-ip") ?? null,
    }),
    needsKey,
    page: async () => {
      const response = await env.ASSETS.fetch(new Request(pageUrl))
      return response.ok ? response.text() : null
    },
  }
}

function composePublic(
  env: WorkerBindings,
  parts: WorkerParts,
  agent: AgentMount
): GatewayApp {
  const { access } = parts.vars
  if (access.mode !== "public") {
    throw new TypeError("composePublic needs public mode")
  }
  const account = publicAccountParts(new ComfyAccount(), parts.clock)
  const limiter = new SessionLimiter({
    db: parts.db,
    clock: parts.clock,
    requestsPerMinute: access.requestsPerMinute,
  })
  return createGateway({
    apps: parts.apps,
    guard: {
      mode: "public",
      secret: access.sessionSecret,
      retentionDays: access.retentionDays,
      take: (sessionId) => limiter.take(sessionId),
      accounts: account.accounts,
      early: account.early,
      visits: new SessionVisits({ db: parts.db, clock: parts.clock }),
      moveAgent: (from, to) => moveAgentHost(env.AGENTS, from, to),
    },
    scopeFor: (c) =>
      visitorScopeFor(c, { ...parts, place: "workers", agents: null }),
    agent,
    account: visitorAccount({
      readings: account.readings,
      retentionDays: access.retentionDays,
    }),
    shares: shareMount(env, parts, true),
    platform: [],
  })
}

function composeOwner(
  env: WorkerBindings,
  parts: WorkerParts,
  agent: AgentMount
): GatewayApp {
  const { vars } = parts
  if (vars.access.mode !== "owner") {
    throw new TypeError("composeOwner needs owner mode")
  }
  const { handlers } = buildHandlers(
    { ...ownerPorts(parts), watchMarks: RunWatcher.marksOf(env.WATCHERS) },
    () => new AlarmJobRunner({ watchers: env.WATCHERS })
  )
  const scope = ownerScope({
    handlers,
    agent: null,
    settings: ownerSettings(vars, "workers"),
  })
  const account = new ComfyAccount()
  const spend = ownerSpend({
    settings: vars.spend,
    db: parts.db,
    clock: parts.clock,
    handlers,
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
    account: ownerAccount({
      probe: new KeyProbe({ account }),
      key: vars.engine.target === "demo" ? null : vars.engine.apiKey,
      cap: spend?.cap ?? null,
    }),
    shares: shareMount(env, parts, false),
    ...(spend === null ? {} : { spendGuard: spend.guard }),
    platform: [],
  })
}

function composeWorkerGateway(env: WorkerBindings): GatewayApp {
  const parts = workerParts(env, deferToRequest)
  checkEngineSettings(parts.vars.engine)
  const agent: AgentMount = {
    mode: "forward",
    forward: forwardToAgentHost(env.AGENTS),
  }
  return parts.vars.access.mode === "public"
    ? composePublic(env, parts, agent)
    : composeOwner(env, parts, agent)
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
  await new SharePurge({
    shares: new SqliteShareRepository({ db: parts.db }),
    store: parts.store,
    clock: parts.clock,
  }).run()
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
    const app = gateway
    return requests.run(context, () => app.fetch(request, env, context))
  },
  scheduled(_controller, env, context) {
    context.waitUntil(purgeExpired(workerParts(env)))
  },
} satisfies ExportedHandler<WorkerBindings>
