import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { OpenPiModelsOptions, PiAgentHarness } from "@rosesfield/agent"
import type { MediaTool } from "@rosesfield/catalog/remake"
import { BunMediaTool } from "@rosesfield/catalog/remake/bun"
import type { AppDefinition } from "@rosesfield/contract"
import {
  ComfyAccount,
  DemoGenerationEngine,
  DrizzlePriceBook,
  DrizzleRunRepository,
  type Fetch,
  type GenerationEngine,
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
import { getConnInfo } from "hono/bun"
import { localAgent } from "#agent/local-agent"
import { SessionAgents } from "#agent/session-agents"
import { type Built, buildHandlers, type Handlers } from "#build-handlers"
import { sharedCreditMeter } from "#catalog/shared-credit-meter"
import { sharedRouterCatalog } from "#catalog/shared-router-catalog"
import { PastedKeys } from "#compose/pasted-keys"
import {
  type EngineOptions,
  pastedKeyEngines,
  pickEngines,
} from "#compose/pick-engines"
import { pageOf, platformFiles } from "#compose/platform-files"
import { ownerScope } from "#compose/request-scope"
import { canPasteKey, ownerSettings } from "#compose/settings"
import { visitorScopeFor } from "#compose/visitor-ports"
import type { OwnerLock, PublicAccess, ServerEnv } from "#env"
import { createGateway, type GatewayContext, type GatewayGuard } from "#gateway"
import type { GatewayApp, RequestScope } from "#gateway-env"
import { AdapterRunRepository } from "#infrastructure/adapter-run-repository"
import { TokenTries } from "#lock/token-tries"
import {
  type AccountReader,
  type CapReader,
  ownerAccount,
  visitorAccount,
} from "#session/account-routes"
import { migrateSessionTables } from "#session/bun-sqlite-session-migration"
import { KeyProbe } from "#session/key-probe"
import {
  type PublicAccountParts,
  publicAccountParts,
} from "#session/public-account"
import { SessionLimiter } from "#session/session-limiter"
import { type PurgeCount, SessionPurge } from "#session/session-purge"
import { SessionVisits } from "#session/session-visits"
import { readVisitorKeys } from "#session/visitor-keys"
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
  media?: MediaTool
}

type Parts = {
  env: ServerEnv
  apps: readonly AppDefinition[]
  clock: Clock
  db: BunSQLiteDatabase
  store: FilesystemAssetStore
  engineOptions: EngineOptions
  prices: DrizzlePriceBook
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
  const prices = new DrizzlePriceBook({ db })
  const parts: Parts = {
    env,
    apps: options.apps,
    clock,
    db,
    store,
    prices,
    engineOptions: {
      clock,
      catalog: sharedRouterCatalog(clock, { db }),
      meter: sharedCreditMeter(clock),
      media: options.media ?? new BunMediaTool(),
      store,
      prices,
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

function modelOptionsOf(parts: Parts): OpenPiModelsOptions {
  const { fetch } = parts.engineOptions
  return fetch === undefined ? {} : { fetch }
}

function ownerHandlers(
  parts: Parts,
  engines: readonly GenerationEngine[],
  resumes: ((adapter: string) => boolean) | null
): Built<TimerJobRunner> {
  const { db } = parts
  const runs = new DrizzleRunRepository({ db })
  const resumed =
    resumes === null ? runs : new AdapterRunRepository({ runs, resumes })
  return buildHandlers(
    {
      apps: parts.apps,
      runs,
      assets: new DrizzleAssetRepository({ db }),
      characters: new DrizzleCharacterRepository({ db }),
      store: parts.store,
      engines,
      clock: parts.clock,
      prices: parts.prices,
    },
    (advance) => new TimerJobRunner({ advance, runs: resumed })
  )
}

type OwnerKeys = {
  built: Built<TimerJobRunner>
  pasted: PastedKeys | null
}

function ownerKeys(parts: Parts): OwnerKeys {
  const engines = pickEngines(parts.env.engine, parts.engineOptions)
  if (!canPasteKey(parts.env)) {
    return { built: ownerHandlers(parts, engines, null), pasted: null }
  }
  const isDemo = (adapter: string): boolean =>
    engines.some(
      (engine) =>
        engine.key === adapter && engine instanceof DemoGenerationEngine
    )
  const pasted = new PastedKeys({
    vars: parts.env,
    build: (key) =>
      ownerHandlers(
        parts,
        pastedKeyEngines(PastedKeys.engine, key, parts.engineOptions),
        (adapter) => !isDemo(adapter)
      ),
  })
  return { built: ownerHandlers(parts, engines, isDemo), pasted }
}

function ownerAccountOf(
  parts: Parts,
  pasted: PastedKeys | null,
  cap: CapReader | null
): AccountReader {
  const probe = new KeyProbe({ account: parts.account })
  const { engine } = parts.env
  const key = engine.target === "demo" ? null : engine.apiKey
  return (c) =>
    ownerAccount({
      probe,
      key: pasted === null ? key : readVisitorKeys(c).engine,
      cap,
    })(c)
}

function composeOwner(
  parts: Parts,
  lock: OwnerLock,
  platform: MiddlewareHandler[]
): LocalGateway {
  const { env } = parts
  const { built, pasted } = ownerKeys(parts)
  const { handlers, jobs } = built
  const agent: PiAgentHarness | null = localAgent({
    model: env.agent,
    dataDir: env.dataDir,
    clock: parts.clock,
    apps: parts.apps,
    handlers,
    modelOptions: modelOptionsOf(parts),
  })
  const scope = ownerScope({
    handlers,
    agent,
    settings: ownerSettings(env, "bun"),
  })
  const guard: GatewayGuard = {
    mode: "owner",
    lock,
    tries: new TokenTries({ clock: parts.clock }),
    clientOf,
  }
  const spend = ownerSpend({
    settings: env.spend,
    db: parts.db,
    clock: parts.clock,
    handlers,
  })
  const app = createGateway({
    apps: parts.apps,
    guard,
    scopeFor: pasted === null ? async () => scope : pasted.scopeFor(scope),
    agent: { mode: "routes" },
    account: ownerAccountOf(parts, pasted, spend?.cap ?? null),
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
      pasted?.stop()
      await agent?.close()
    },
  }
}

function publicGuard(
  parts: Parts,
  access: PublicAccess,
  agents: SessionAgents | null
): GatewayGuard {
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
    moveAgent: async (from, to) => {
      await agents?.move(from, to)
    },
  }
}

function sessionAgentsOf(parts: Parts): SessionAgents | null {
  const { env } = parts
  return env.agent === null
    ? null
    : new SessionAgents({
        folder: join(env.dataDir, "agent-sessions"),
        model: env.agent,
        apps: parts.apps,
        clock: parts.clock,
        modelOptions: modelOptionsOf(parts),
      })
}

function composePublic(
  parts: Parts,
  access: PublicAccess,
  platform: MiddlewareHandler[]
): LocalGateway {
  const { env, db, clock } = parts
  const { handlers, jobs } = ownerHandlers(
    parts,
    pickEngines(env.engine, parts.engineOptions),
    null
  )
  const agents = sessionAgentsOf(parts)
  const sessionPurge = new SessionPurge({
    db,
    store: parts.store,
    clock,
    retentionDays: access.retentionDays,
  })
  const scopeFor = (c: GatewayContext): Promise<RequestScope> =>
    visitorScopeFor(c, {
      vars: env,
      place: "bun",
      apps: parts.apps,
      db,
      store: parts.store,
      clock,
      engineOptions: parts.engineOptions,
      agents,
      defer: () => undefined,
    })
  const app = createGateway({
    apps: parts.apps,
    guard: publicGuard(parts, access, agents),
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
