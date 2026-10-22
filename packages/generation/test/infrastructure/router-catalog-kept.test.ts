import { FixedClock } from "@rosesfield/kernel"
import { eq } from "drizzle-orm"
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite"
import { describe, expect, it } from "vitest"
import { migrateRunTable } from "#infrastructure/bun-sqlite-run-migration"
import {
  routerListingTable,
  routerSchemaTable,
} from "#infrastructure/router/drizzle-router-catalog-store"
import { RouterCatalog } from "#infrastructure/router/router-catalog"
import { RouterHttp } from "#infrastructure/router/router-http"
import { start } from "../sample"
import {
  catalogPage,
  pictureModel,
  pictureSchema,
  refused,
  routerSchema,
  schemaRead,
  schemaSame,
} from "./fixtures/comfy-router"
import { ReplayFetch } from "./replay-fetch"

const oneHourMs = 3_600_000
const oneMinuteMs = 60_000

const clipModel = "maker/clip-3"
const clipSchema = routerSchema({
  model: clipModel,
  takes: ["text"],
  makes: ["video"],
  properties: { prompt: { type: "string" } },
})

function keptDb(): BunSQLiteDatabase {
  const db = drizzle(":memory:")
  migrateRunTable(db)
  return db
}

function httpWith(replay: ReplayFetch, apiKey = "key"): RouterHttp {
  return new RouterHttp({
    apiKey,
    fetch: replay.fetch,
    timeoutMs: 1000,
    downloadTimeoutMs: 1000,
  })
}

type Cold = {
  catalog: RouterCatalog
  deferred: Promise<void>[]
}

function coldCatalog(db: BunSQLiteDatabase, clock: FixedClock): Cold {
  const deferred: Promise<void>[] = []
  const catalog = new RouterCatalog({
    clock,
    db,
    defer: (work) => {
      deferred.push(work)
    },
  })
  return { catalog, deferred }
}

async function keepPicture(
  db: BunSQLiteDatabase,
  clock: FixedClock,
  apiKey = "key"
): Promise<void> {
  const { catalog, deferred } = coldCatalog(db, clock)
  await catalog.models(
    httpWith(
      new ReplayFetch([
        catalogPage([pictureModel]),
        schemaRead(pictureModel, pictureSchema),
      ]),
      apiKey
    )
  )
  await Promise.all(deferred)
}

function idsOf(models: { facts: { model: string } }[]): string[] {
  return models.map((one) => one.facts.model)
}

describe("RouterCatalog with a kept copy", () => {
  it("keeps one row per key tag with its model ids and one row per model with its schema and ETag", async () => {
    const db = keptDb()
    const clock = new FixedClock({ now: start })
    await keepPicture(db, clock)
    const listings = await db.select().from(routerListingTable)
    expect(listings).toHaveLength(1)
    expect(listings[0]).toMatchObject({
      models: JSON.stringify([pictureModel]),
      checkedAt: start.getTime(),
      readAt: start.getTime(),
    })
    const schemas = await db.select().from(routerSchemaTable)
    expect(schemas).toHaveLength(1)
    expect(schemas[0]).toMatchObject({
      model: pictureModel,
      etag: '"v1"',
      source: "keyed",
      checkedAt: start.getTime(),
    })
    expect(JSON.parse(schemas[0]?.document ?? "null")).toEqual(pictureSchema)
  })

  it("opens a key on a cold catalog from the kept copy and sends no request", async () => {
    const db = keptDb()
    const clock = new FixedClock({ now: start })
    await keepPicture(db, clock)
    const cold = coldCatalog(db, clock)
    const none = new ReplayFetch([])
    const models = await cold.catalog.models(httpWith(none))
    expect(idsOf(models)).toEqual([pictureModel])
    expect(models[0]?.form.fields.length).toBeGreaterThan(0)
    await cold.catalog.idle()
    await Promise.all(cold.deferred)
    expect(none.sent).toEqual([])
  })

  it("serves a kept copy older than an hour at once and replaces it in the background with the kept ETag", async () => {
    const db = keptDb()
    const clock = new FixedClock({ now: start })
    await keepPicture(db, clock)
    clock.advance(oneHourMs)
    const cold = coldCatalog(db, clock)
    const later = new ReplayFetch([
      catalogPage([pictureModel, clipModel]),
      schemaSame(pictureModel),
      schemaRead(clipModel, clipSchema),
    ])
    const served = await cold.catalog.models(httpWith(later))
    expect(idsOf(served)).toEqual([pictureModel])
    expect(cold.deferred.length).toBeGreaterThan(0)
    await Promise.all(cold.deferred)
    expect(later.unused()).toEqual([])
    const revalidated = later.sent.find((sent) =>
      sent.url.includes(pictureModel)
    )
    expect(revalidated?.headers.get("if-none-match")).toBe('"v1"')
    const next = coldCatalog(db, clock)
    const none = new ReplayFetch([])
    expect(idsOf(await next.catalog.models(httpWith(none)))).toEqual([
      pictureModel,
      clipModel,
    ])
    await next.catalog.idle()
    expect(none.sent).toEqual([])
  })

  it("waits for the load of a key with no kept copy", async () => {
    const db = keptDb()
    const clock = new FixedClock({ now: start })
    const cold = coldCatalog(db, clock)
    const models = await cold.catalog.models(
      httpWith(
        new ReplayFetch([
          catalogPage([pictureModel]),
          schemaRead(pictureModel, pictureSchema),
        ])
      )
    )
    expect(idsOf(models)).toEqual([pictureModel])
  })

  it("forgets the kept listing when the Router refuses its reload, so the next open names the refusal", async () => {
    const db = keptDb()
    const clock = new FixedClock({ now: start })
    await keepPicture(db, clock)
    clock.advance(oneHourMs)
    const cold = coldCatalog(db, clock)
    const refusal = refused(
      "GET",
      "/v2/models?limit=100",
      403,
      "not_enabled",
      "Comfy Router is not enabled for this account yet."
    )
    const served = await cold.catalog.models(
      httpWith(new ReplayFetch([refusal]))
    )
    expect(idsOf(served)).toEqual([pictureModel])
    await cold.catalog.idle()
    expect(await db.select().from(routerListingTable)).toEqual([])
    await expect(
      cold.catalog.models(httpWith(new ReplayFetch([refusal])))
    ).rejects.toMatchObject({ code: "ENGINE_NOT_ENABLED" })
  })

  it("marks the kept listing read at most once an hour, and deletes each listing no request read before the cutoff", async () => {
    const db = keptDb()
    const clock = new FixedClock({ now: start })
    await keepPicture(db, clock, "read-key")
    await keepPicture(db, clock, "idle-key")
    const readTag = await httpWith(new ReplayFetch([]), "read-key").keyTag()
    clock.advance(oneHourMs / 2)
    const cold = coldCatalog(db, clock)
    await cold.catalog.models(httpWith(new ReplayFetch([]), "read-key"))
    await Promise.all(cold.deferred)
    clock.advance(oneHourMs / 4)
    await cold.catalog.models(httpWith(new ReplayFetch([]), "read-key"))
    await Promise.all(cold.deferred)
    const [read] = await db
      .select({ readAt: routerListingTable.readAt })
      .from(routerListingTable)
      .where(eq(routerListingTable.keyTag, readTag))
    expect(read?.readAt).toBe(start.getTime() + oneHourMs / 2)
    const forgotten = await RouterCatalog.forgetUnread(
      db,
      start.getTime() + oneMinuteMs
    )
    expect(forgotten).toBe(1)
    const left = await db
      .select({ keyTag: routerListingTable.keyTag })
      .from(routerListingTable)
    expect(left).toEqual([{ keyTag: readTag }])
  })
})
