import type { AppDefinition } from "@rosesfield/contract"
import { DrizzlePriceBook } from "@rosesfield/generation"
import { type Clock, SystemClock } from "@rosesfield/kernel"
import { drizzle } from "drizzle-orm/d1"
import type { HandlerPorts } from "#build-handlers"
import { servedApps } from "#catalog/served-apps"
import { sharedCreditMeter } from "#catalog/shared-credit-meter"
import { type EngineOptions, pickEngines } from "#compose/pick-engines"
import { readWorkerEnv, type WorkerVars } from "#env"
import { R2AssetStore } from "#infrastructure/r2-asset-store"
import { SqliteAssetRepository } from "#infrastructure/sqlite-asset-repository"
import { SqliteCharacterRepository } from "#infrastructure/sqlite-character-repository"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import { SqliteRunRepository } from "#infrastructure/sqlite-run-repository"

export type WorkerBindings = {
  DB: D1Database
  BUCKET: R2Bucket
  ASSETS: Fetcher
  WATCHERS: DurableObjectNamespace
  AGENTS: DurableObjectNamespace
  MEDIA?: MediaBinding
  MODE?: string
  COMFY_API_KEY?: string
  COMFY_BASE_URL?: string
  RUNPOD_API_KEY?: string
  RUNPOD_ENDPOINT_ID?: string
  OWNER_TOKEN?: string
  SESSION_SECRET?: string
  RETENTION_DAYS?: string
  SESSION_REQUESTS_PER_MINUTE?: string
  SPEND_CAP_CREDITS?: string
}

export type WorkerParts = {
  vars: WorkerVars
  apps: readonly AppDefinition[]
  db: SqliteDatabase
  store: R2AssetStore
  clock: Clock
  engineOptions: EngineOptions
}

export function workerParts(env: WorkerBindings): WorkerParts {
  const clock = new SystemClock()
  const vars = readWorkerEnv(env)
  return {
    vars,
    apps: servedApps(vars, "workers"),
    db: drizzle(env.DB),
    store: new R2AssetStore({ bucket: env.BUCKET }),
    clock,
    engineOptions: {
      clock,
      meter: sharedCreditMeter(clock),
      fetch: (input, init) => fetch(input, init),
    },
  }
}

export function ownerPorts(parts: WorkerParts): HandlerPorts {
  const { db } = parts
  return {
    apps: parts.apps,
    runs: new SqliteRunRepository({ db, scope: null }),
    assets: new SqliteAssetRepository({ db, scope: null }),
    characters: new SqliteCharacterRepository({ db, scope: null }),
    store: parts.store,
    engines: pickEngines(parts.vars.engine, parts.engineOptions),
    clock: parts.clock,
    prices: new DrizzlePriceBook({ db }),
  }
}
