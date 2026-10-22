import { catalogRoutes, modelListResponse } from "@rosesfield/catalog/comfy"
import { buildPath } from "@rosesfield/contract"
import {
  type Fetch,
  migrateRunTable,
  RouterCatalog,
} from "@rosesfield/generation"
import type { FixedClock } from "@rosesfield/kernel"
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite"
import { afterEach, describe, expect, it } from "vitest"
import type { Harness } from "../harness"
import { closeGateways, gatewayWith } from "./catalog-gateway"
import { clipModel, fakeRouter, pictureModel } from "./router-recordings"

afterEach(closeGateways)

const oneHourMs = 3_600_000
const coldBoundMs = 100

type Kept = {
  catalog: RouterCatalog | null
  deferred: Promise<void>[]
}

function keptCatalog(db: BunSQLiteDatabase, kept: Kept) {
  return (clock: FixedClock): RouterCatalog => {
    kept.catalog ??= new RouterCatalog({
      clock,
      db,
      defer: (work) => {
        kept.deferred.push(work)
      },
    })
    return kept.catalog
  }
}

function hangingRouter(): { fetch: Fetch; calls: string[] } {
  const calls: string[] = []
  const fetch: Fetch = (input) => {
    calls.push(input instanceof Request ? input.url : input.toString())
    return new Promise<Response>(() => undefined)
  }
  return { fetch, calls }
}

async function timedModels(gateway: Harness, appId: string) {
  const began = performance.now()
  const response = await gateway.call(
    buildPath(catalogRoutes.listModels.path, { appId })
  )
  const elapsedMs = performance.now() - began
  expect(response.status).toBe(200)
  const listed = modelListResponse.parse(await response.json())
  return { listed, elapsedMs }
}

async function warmedDb(): Promise<BunSQLiteDatabase> {
  const db = drizzle(":memory:")
  migrateRunTable(db)
  const warm: Kept = { catalog: null, deferred: [] }
  const router = fakeRouter({ schemas: [pictureModel, clipModel] })
  const gateway = gatewayWith(router.fetch, keptCatalog(db, warm))
  const { listed } = await timedModels(gateway, "clips")
  expect(listed.models.map((one) => one.id)).toContain("maker/clip-3")
  await warm.catalog?.idle()
  await Promise.all(warm.deferred)
  return db
}

describe("the model list of an app on a cold isolate", () => {
  it("answers from the kept copy within its bound and asks the Router nothing", async () => {
    const db = await warmedDb()
    const router = hangingRouter()
    const cold: Kept = { catalog: null, deferred: [] }
    const gateway = gatewayWith(router.fetch, keptCatalog(db, cold))
    const { listed, elapsedMs } = await timedModels(gateway, "clips")
    expect(listed.models.map((one) => one.id)).toContain("maker/clip-3")
    expect(listed.refusal).toBeNull()
    expect(elapsedMs).toBeLessThan(coldBoundMs)
    expect(router.calls).toEqual([])
  })

  it("answers from a kept copy older than an hour within its bound while the reload runs behind it", async () => {
    const db = await warmedDb()
    const router = hangingRouter()
    const cold: Kept = { catalog: null, deferred: [] }
    const gateway = gatewayWith(router.fetch, keptCatalog(db, cold))
    gateway.clock.advance(oneHourMs)
    const { listed, elapsedMs } = await timedModels(gateway, "clips")
    expect(listed.models.map((one) => one.id)).toContain("maker/clip-3")
    expect(elapsedMs).toBeLessThan(coldBoundMs)
    expect(cold.deferred.length).toBeGreaterThan(0)
  })
})
