import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { catalogRoutes, modelListResponse } from "@rosesfield/catalog/comfy"
import { buildPath } from "@rosesfield/contract"
import {
  type Fetch,
  migrateRunTable,
  RouterCatalog,
} from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { afterEach, describe, expect, it } from "vitest"
import { sharedRouterCatalog } from "#catalog/shared-router-catalog"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { start } from "../sample-apps"
import { comfyCloud, localEnv } from "../server-env"
import { catalogApps, closeGateways, gatewayWith } from "./catalog-gateway"
import { clipModel, fakeRouter, pictureModel } from "./router-recordings"

const host = { host: "127.0.0.1:8787" }
const oneHourMs = 3_600_000
const coldBoundMs = 100
const folders: string[] = []
let open: LocalGateway | null = null

afterEach(async () => {
  closeGateways()
  await open?.close()
  open = null
  for (const made of folders.splice(0)) {
    rmSync(made, { recursive: true, force: true })
  }
})

function folder(): string {
  const made = mkdtempSync(join(tmpdir(), "rosesfield-catalog-"))
  folders.push(made)
  return made
}

function refusingRouter(): { fetch: Fetch; calls: string[] } {
  const calls: string[] = []
  const fetch: Fetch = async (input) => {
    calls.push(input instanceof Request ? input.url : input.toString())
    return new Response(null, { status: 503 })
  }
  return { fetch, calls }
}

async function keptIn(dataDir: string): Promise<void> {
  const db = drizzle(join(dataDir, "rosesfield.db"))
  migrateRunTable(db)
  const deferred: Promise<void>[] = []
  const held: { catalog: RouterCatalog | null } = { catalog: null }
  const router = fakeRouter({ schemas: [pictureModel, clipModel] })
  const warm = gatewayWith(router.fetch, (clock) => {
    held.catalog ??= new RouterCatalog({
      clock,
      db,
      defer: (work) => {
        deferred.push(work)
      },
    })
    return held.catalog
  })
  const response = await warm.call(
    buildPath(catalogRoutes.listModels.path, { appId: "clips" })
  )
  expect(response.status).toBe(200)
  await held.catalog?.idle()
  await Promise.all(deferred)
  db.$client.close()
}

describe("the model list of the composed bun gateway", () => {
  it("answers from the copy kept in its own database within its bound and asks the Router nothing", async () => {
    const dataDir = folder()
    await keptIn(dataDir)
    const router = refusingRouter()
    open = composeLocalGateway({
      env: localEnv(dataDir, comfyCloud("comfyui-owner")),
      apps: catalogApps,
      clock: new FixedClock({ now: start }),
      platformRoot: null,
      fetch: router.fetch,
    })
    const began = performance.now()
    const response = await open.app.request(
      buildPath(catalogRoutes.listModels.path, { appId: "clips" }),
      { headers: host }
    )
    const elapsedMs = performance.now() - began
    expect(response.status).toBe(200)
    const listed = modelListResponse.parse(await response.json())
    expect(listed.models.map((one) => one.id)).toContain("maker/clip-3")
    expect(elapsedMs).toBeLessThan(coldBoundMs)
    expect(router.calls.filter((url) => url.includes("/v2/models"))).toEqual(
      []
    )
  })
})

describe("the shared router catalog", () => {
  it("holds one catalog per database and one with no database", () => {
    const clock = new FixedClock({ now: start })
    const one = drizzle(":memory:")
    const other = drizzle(":memory:")
    expect(sharedRouterCatalog(clock, { db: one })).toBe(
      sharedRouterCatalog(clock, { db: one })
    )
    expect(sharedRouterCatalog(clock, { db: one })).not.toBe(
      sharedRouterCatalog(clock, { db: other })
    )
    expect(sharedRouterCatalog(clock)).not.toBe(
      sharedRouterCatalog(clock, { db: one })
    )
  })

  it("hands the reload of a stale copy to the runtime's defer, even when an earlier caller passed none", async () => {
    const dataDir = folder()
    await keptIn(dataDir)
    const db = drizzle(join(dataDir, "rosesfield.db"))
    const deferred: Promise<void>[] = []
    const router = fakeRouter({ schemas: [pictureModel, clipModel] })
    const clock = new FixedClock({ now: start })
    sharedRouterCatalog(clock, { db })
    const gateway = gatewayWith(router.fetch, () =>
      sharedRouterCatalog(clock, {
        db,
        defer: (work) => {
          deferred.push(work)
        },
      })
    )
    clock.advance(oneHourMs)
    const response = await gateway.call(
      buildPath(catalogRoutes.listModels.path, { appId: "clips" })
    )
    expect(response.status).toBe(200)
    const listed = modelListResponse.parse(await response.json())
    expect(listed.models.map((one) => one.id)).toContain("maker/clip-3")
    expect(deferred.length).toBeGreaterThan(0)
    await Promise.all(deferred)
  })
})
