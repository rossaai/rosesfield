import { mkdirSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { PiAgentHarness } from "@rosesfield/agent"
import type { AppDefinition } from "@rosesfield/contract"
import {
  ComfyAccount,
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
import { ownerAccount, visitorAccount } from "#session/account-routes"
import { migrateSessionTables } from "#session/bun-sqlite-session-migration"
import { KeyProbe } from "#session/key-probe"
import {
  type PublicAccountParts,
  publicAccountParts,
} from "#session/public-account"
import { SessionLimiter } from "#session/session-limiter"
import { type PurgeCount, SessionPurge } from "#session/session-purge"
import { SessionVisits } from "#session/session-visits"
import { filesystemShareFiles } from "#share/filesystem-share-files"
import { shareLimit } from "#share/share-limit"
import { SharePurge } from "#share/share-purge"
import type { ShareMount } from "#share/share-routes"
import { SqliteShareRepository } from "#share/sqlite-share-repository"
import { ownerSpend } from "#spend/owner-spend"

export type LocalGateway = {
  app: GatewayApp
  handlers: Handlers
  jobs: TimerJobRunner
  purge: () => Promise<PurgeCount & { conversations: number; shares: number }>
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
  account: ComfyAccount
  publicAccount: PublicAccountParts
  shares: ShareMount
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
  const root =
    options.platformRoot === undefined ? platformDist : options.platformRoot
  const store = new FilesystemAssetStore({ root: join(env.dataDir, "assets") })
  const fetchPart = options.fetch === undefined ? {} : { fetch: options.fetch }
  const account = new ComfyAccount(fetchPart)
  const parts: Parts = {
    env,
    apps: options.apps,
    clock,
    db,
    store,
    engineOptions: {
      clock,
      meter: sharedCreditMeter(clock),
      ...fetchPart,
      ...(options.warmCatalog === true ? { warmCatalog: true } : {}),
    },
    account,
    publicAccount: publicAccountParts(account, clock),
    shares: {
      shares: new SqliteShareRepository({ db }),
      store,
      clock,
      page: root === null ? null : () => pageOf(root),
      files: filesystemShareFiles(join(env.dataDir, "assets")),
      limit: shareLimit({ db, clock, clientOf }),
      needsKey: env.access.mode === "public",
    },
  }
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
      engines: pickEngines(parts.env.engine, parts.engineOptions),
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
  const key = env.engine.target === "demo" ? null : env.engine.apiKey
  const spend = ownerSpend({
    settings: env.spend,
    db: parts.db,
    clock: parts.clock,
    handlers,
  })
  const app = createGateway({
    apps: parts.apps,
    guard,
    scopeFor: async () => scope,
    agent: { mode: "routes" },
    account: ownerAccount({
      probe: new KeyProbe({ account: parts.account }),
      key,
      cap: spend?.cap ?? null,
    }),
    shares: parts.shares,
    ...(spend === null ? {} : { spendGuard: spend.guard }),
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
      shares: await sharePurgeOf(parts).run(),
    }),
    close: async () => {
      jobs.stop()
      await agent?.close()
    },
  }
}

function publicGuard(parts: Parts, access: PublicAccess): GatewayGuard {
  const { db, clock } = parts
  const limiter = new SessionLimiter({
    db,
    clock,
    requestsPerMinute: access.requestsPerMinute,
  })
  return {
    mode: "public",
    secret: access.sessionSecret,
    retentionDays: access.retentionDays,
    take: (sessionId) => limiter.take(sessionId),
    accounts: parts.publicAccount.accounts,
    early: parts.publicAccount.early,
    visits: new SessionVisits({ db, clock }),
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
    guard: publicGuard(parts, access),
    scopeFor,
    agent: { mode: "routes" },
    account: visitorAccount({
      readings: parts.publicAccount.readings,
      retentionDays: access.retentionDays,
    }),
    shares: parts.shares,
    platform,
  })
  return {
    app,
    handlers,
    jobs,
    purge: async () => ({
      ...(await sessionPurge.run()),
      conversations: agents?.purge(sessionPurge.cutoff()) ?? 0,
      shares: await sharePurgeOf(parts).run(),
    }),
    close: async () => {
      jobs.stop()
      await agents?.closeAll()
    },
  }
}

function sharePurgeOf(parts: Parts): SharePurge {
  return new SharePurge({
    shares: parts.shares.shares,
    store: parts.store,
    clock: parts.clock,
  })
}

async function pageOf(root: string): Promise<string | null> {
  try {
    return await readFile(join(root, "index.html"), "utf8")
  } catch {
    return null
  }
}

function platformFiles(root: string): MiddlewareHandler[] {
  return [serveStatic({ root }), serveStatic({ root, path: "index.html" })]
}
