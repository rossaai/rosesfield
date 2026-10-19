import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { PiAgentHarness } from "@rosesfield/agent"
import type { AppDefinition } from "@rosesfield/contract"
import {
  DrizzlePriceBook,
  DrizzleRunRepository,
  type Fetch,
  migrateRunTable,
  TimerJobRunner,
} from "@rosesfield/generation"
import { type Clock, SystemClock } from "@rosesfield/kernel"
import {
  DrizzleAssetRepository,
  DrizzleCharacterRepository,
  FilesystemAssetStore,
  migrateLibraryTables,
} from "@rosesfield/library"
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite"
import type { MiddlewareHandler } from "hono"
import { getConnInfo, serveStatic } from "hono/bun"
import { localAgent } from "#agent/local-agent"
import { SessionAgents } from "#agent/session-agents"
import { type Built, buildHandlers, type Handlers } from "#build-handlers"
import { sharedCreditMeter } from "#catalog/shared-credit-meter"
import { type EngineOptions, pickEngines } from "#compose/pick-engines"
import { ownerScope } from "#compose/request-scope"
import { ownerSettings } from "#compose/settings"
import { visitorScopeFor } from "#compose/visitor-ports"
import type { OwnerLock, PublicAccess, ServerEnv } from "#env"
import { createGateway, type GatewayContext, type GatewayGuard } from "#gateway"
import type { GatewayApp, RequestScope } from "#gateway-env"
import { TokenTries } from "#lock/token-tries"
import { migrateSessionTables } from "#session/bun-sqlite-session-migration"
import { SessionLimiter } from "#session/session-limiter"
import { type PurgeCount, SessionPurge } from "#session/session-purge"

export type LocalGateway = {
  app: GatewayApp
  handlers: Handlers
  jobs: TimerJobRunner
  purge: () => Promise<PurgeCount & { conversations: number }>
  close: () => Promise<void>
}

type LocalGatewayOptions = {
  env: ServerEnv
  apps: readonly AppDefinition[]
  clock?: Clock
  platformRoot?: string | null
  fetch?: Fetch
  warmCatalog?: boolean
}

type Parts = {
  env: ServerEnv
  apps: readonly AppDefinition[]
  clock: Clock
  db: BunSQLiteDatabase
  store: FilesystemAssetStore
  engineOptions: EngineOptions
}

const platformDist = fileURLToPath(
  new URL("../../../../apps/platform/dist", import.meta.url)
)

function clientOf(c: GatewayContext): string | null {
  try {
    return getConnInfo(c).remote.address ?? null
  } catch {
    return null
  }
}

export function composeLocalGateway(
  options: LocalGatewayOptions
): LocalGateway {
  const { env } = options
  const clock = options.clock ?? new SystemClock()
  mkdirSync(env.dataDir, { recursive: true })
  const db = drizzle(join(env.dataDir, "rosesfield.db"))
  migrateRunTable(db)
  migrateLibraryTables(db)
  migrateSessionTables(db)
  const parts: Parts = {
    env,
    apps: options.apps,
    clock,
    db,
    store: new FilesystemAssetStore({ root: join(env.dataDir, "assets") }),
    engineOptions: {
      clock,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.warmCatalog === true ? { warmCatalog: true } : {}),
    },
  }
  const root =
    options.platformRoot === undefined ? platformDist : options.platformRoot
  const platform = root === null ? [] : platformFiles(root)
  return env.access.mode === "public"
    ? composePublic(parts, env.access, platform)
    : composeOwner(parts, env.access.lock, platform)
}

function ownerHandlers(parts: Parts): Built<TimerJobRunner> {
  const { db } = parts
  const runs = new DrizzleRunRepository({ db })
  return buildHandlers(
    {
      apps: parts.apps,
      runs,
      assets: new DrizzleAssetRepository({ db }),
      characters: new DrizzleCharacterRepository({ db }),
      store: parts.store,
      engines: pickEngines(parts.env.engine, {
        ...parts.engineOptions,
        meter: sharedCreditMeter(parts.clock),
      }),
      clock: parts.clock,
      prices: new DrizzlePriceBook({ db }),
    },
    (advance) => new TimerJobRunner({ advance, runs })
  )
}

function composeOwner(
  parts: Parts,
  lock: OwnerLock,
  platform: MiddlewareHandler[]
): LocalGateway {
  const { env } = parts
  const { handlers, jobs } = ownerHandlers(parts)
  const agent: PiAgentHarness | null = localAgent({
    model: env.agent,
    dataDir: env.dataDir,
    clock: parts.clock,
    apps: parts.apps,
    handlers,
  })
  const scope = ownerScope({ handlers, agent, settings: ownerSettings(env) })
  const guard: GatewayGuard = {
    mode: "owner",
    lock,
    tries: new TokenTries({ clock: parts.clock }),
    clientOf,
  }
  const app = createGateway({
    apps: parts.apps,
    guard,
    scopeFor: async () => scope,
    agent: { mode: "routes" },
    platform,
  })
  return {
    app,
    handlers,
    jobs,
    purge: async () => ({
      runs: 0,
      assets: 0,
      characters: 0,
      conversations: 0,
    }),
    close: async () => {
      jobs.stop()
      await agent?.close()
    },
  }
}

function composePublic(
  parts: Parts,
  access: PublicAccess,
  platform: MiddlewareHandler[]
): LocalGateway {
  const { env, db, clock } = parts
  const { handlers, jobs } = ownerHandlers(parts)
  const agents =
    env.agent === null
      ? null
      : new SessionAgents({
          folder: join(env.dataDir, "agent-sessions"),
          model: env.agent,
          apps: parts.apps,
          clock,
        })
  const limiter = new SessionLimiter({
    db,
    clock,
    requestsPerMinute: access.requestsPerMinute,
  })
  const sessionPurge = new SessionPurge({
    db,
    store: parts.store,
    clock,
    retentionDays: access.retentionDays,
  })
  const scopeFor = (c: GatewayContext): Promise<RequestScope> =>
    visitorScopeFor(c, {
      vars: env,
      apps: parts.apps,
      db,
      store: parts.store,
      clock,
      engineOptions: parts.engineOptions,
      agents,
    })
  const app = createGateway({
    apps: parts.apps,
    guard: {
      mode: "public",
      secret: access.sessionSecret,
      retentionDays: access.retentionDays,
      take: (sessionId) => limiter.take(sessionId),
    },
    scopeFor,
    agent: { mode: "routes" },
    platform,
  })
  return {
    app,
    handlers,
    jobs,
    purge: async () => ({
      ...(await sessionPurge.run()),
      conversations: agents?.purge(sessionPurge.cutoff()) ?? 0,
    }),
    close: async () => {
      jobs.stop()
      await agents?.closeAll()
    },
  }
}

function platformFiles(root: string): MiddlewareHandler[] {
  return [serveStatic({ root }), serveStatic({ root, path: "index.html" })]
}
