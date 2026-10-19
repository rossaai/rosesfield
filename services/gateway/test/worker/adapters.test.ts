import {
  DemoGenerationEngine,
  Run,
  RunConflictError,
} from "@rosesfield/generation"
import { appIdFormat, runIdFormat } from "@rosesfield/kernel"
import { drizzle } from "drizzle-orm/d1"
import { afterAll, describe, expect, it } from "vitest"
import { R2AssetStore } from "#infrastructure/r2-asset-store"
import { SqliteAssetRepository } from "#infrastructure/sqlite-asset-repository"
import { SqliteCharacterRepository } from "#infrastructure/sqlite-character-repository"
import { SqliteRunRepository } from "#infrastructure/sqlite-run-repository"
import { SessionScope } from "#session/session-scope"
import type { PortsFor } from "../harness"
import { describeRoutes } from "../route-suite"
import { audioApp, imageApp, start } from "../sample-apps"
import { startProxy } from "./platform-proxy"

const proxy = await startProxy()

afterAll(() => proxy.dispose())

const workerAdapters: PortsFor = (clock) => {
  const db = drizzle(proxy.env.DB)
  return {
    apps: [imageApp(), audioApp()],
    runs: new SqliteRunRepository({ db, scope: null }),
    assets: new SqliteAssetRepository({ db, scope: null }),
    characters: new SqliteCharacterRepository({ db, scope: null }),
    store: new R2AssetStore({ bucket: proxy.env.BUCKET }),
    engines: [new DemoGenerationEngine({ clock })],
    clock,
  }
}

const sessionAdapters: PortsFor = (clock) => {
  const db = drizzle(proxy.env.DB)
  const scope = new SessionScope({ db, sessionId: crypto.randomUUID() })
  return {
    ...workerAdapters(clock, ""),
    runs: new SqliteRunRepository({ db, scope }),
    assets: new SqliteAssetRepository({ db, scope }),
    characters: new SqliteCharacterRepository({ db, scope }),
  }
}

describeRoutes("D1 and R2 through wrangler's platform proxy", workerAdapters, {
  reset: proxy.reset,
})

describeRoutes("one session's records in D1", sessionAdapters, {
  reset: proxy.reset,
})

describe("the SQLite run repository over D1", () => {
  const runWith = (id: string) =>
    Run.queue({
      id: runIdFormat.parse(id),
      appId: appIdFormat.parse("sample-image"),
      request: { inputs: { prompt: "a door" }, count: 1, aspectRatio: null },
      seed: null,
      adapter: "demo",
      origin: "demo",
      idempotencyKey: "same-key",
      now: start,
    })

  it("turns a second run with the same idempotency key into a conflict", async () => {
    await proxy.reset()
    const runs = new SqliteRunRepository({
      db: drizzle(proxy.env.DB),
      scope: null,
    })
    await runs.add(runWith("0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f"))
    await expect(
      runs.add(runWith("6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d"))
    ).rejects.toBeInstanceOf(RunConflictError)
  })

  it("refuses to save a run that changed since it was read", async () => {
    await proxy.reset()
    const runs = new SqliteRunRepository({
      db: drizzle(proxy.env.DB),
      scope: null,
    })
    const stored = await runs.add(
      runWith("0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f")
    )
    const first = await runs.get(stored.id)
    const second = await runs.get(stored.id)
    first?.observe({ index: 0, state: "running", progress: 0.5 })
    second?.observe({ index: 0, state: "running", progress: 0.2 })
    await runs.save(first!)
    await expect(runs.save(second!)).rejects.toBeInstanceOf(RunConflictError)
    expect((await runs.get(stored.id))?.toRecord().progress).toBe(0.5)
  })
})
