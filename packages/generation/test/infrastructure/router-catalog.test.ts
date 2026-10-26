import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { RouterCatalog } from "#infrastructure/router/router-catalog"
import { RouterHttp } from "#infrastructure/router/router-http"
import { start } from "../sample"
import {
  catalogPage,
  docsUrl,
  pictureModel,
  pictureSchema,
  refused,
  routerSchema,
  routerUrl,
  schemaRead,
  schemaSame,
} from "./fixtures/comfy-router"
import { ReplayFetch } from "./replay-fetch"

const oneHourMs = 3_600_000

const clipModel = "maker/clip-3"
const clipSchema = routerSchema({
  model: clipModel,
  takes: ["text"],
  makes: ["video"],
  properties: { prompt: { type: "string" } },
})

function httpWith(
  replay: ReplayFetch,
  apiKey: string | null = "key"
): RouterHttp {
  return new RouterHttp({
    apiKey,
    fetch: replay.fetch,
    timeoutMs: 1000,
    downloadTimeoutMs: 1000,
  })
}

function heldBack(
  replay: ReplayFetch,
  model: string
): { http: RouterHttp; release: () => void } {
  let release: () => void = () => undefined
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const http = new RouterHttp({
    apiKey: "key",
    fetch: async (input, init) => {
      if (input.toString().includes(model)) {
        await released
      }
      return replay.fetch(input, init)
    },
    timeoutMs: 1000,
    downloadTimeoutMs: 1000,
  })
  return { http, release }
}

function settled<T>(promise: Promise<T>): Promise<boolean> {
  const later = new Promise<false>((resolve) =>
    setTimeout(() => resolve(false), 20)
  )
  return Promise.race([promise.then(() => true), later])
}

function catalogAt(clock: FixedClock): RouterCatalog {
  return new RouterCatalog({ clock })
}

describe("RouterCatalog", () => {
  it("serves a second key the cached schemas after one listing read of its own", async () => {
    const clock = new FixedClock({ now: start })
    const catalog = catalogAt(clock)
    const first = new ReplayFetch([
      catalogPage([pictureModel]),
      schemaRead(pictureModel, pictureSchema),
    ])
    await catalog.models(httpWith(first, "first-key"))
    const second = new ReplayFetch([catalogPage([pictureModel])])
    const models = await catalog.models(httpWith(second, "second-key"))
    expect(models.map((one) => one.facts.model)).toEqual([pictureModel])
    expect(second.sent.map((sent) => sent.url)).toEqual([
      `${routerUrl}/v2/models?limit=100`,
    ])
    const again = new ReplayFetch([])
    await catalog.models(httpWith(again, "second-key"))
    expect(again.sent).toEqual([])
  })

  it("serves its copy at once after an hour, revalidates each schema by ETag behind it and then lists a model Comfy added", async () => {
    const clock = new FixedClock({ now: start })
    const catalog = catalogAt(clock)
    await catalog.models(
      httpWith(
        new ReplayFetch([
          catalogPage([pictureModel]),
          schemaRead(pictureModel, pictureSchema),
        ])
      )
    )
    clock.advance(oneHourMs)
    const later = new ReplayFetch([
      catalogPage([pictureModel, clipModel]),
      schemaSame(pictureModel),
      schemaRead(clipModel, clipSchema),
    ])
    const served = await catalog.models(httpWith(later))
    expect(served.map((one) => one.facts.model)).toEqual([pictureModel])
    await catalog.idle()
    expect(later.unused()).toEqual([])
    const models = await catalog.models(httpWith(later))
    expect(models.map((one) => one.facts.model)).toEqual([
      pictureModel,
      clipModel,
    ])
    const revalidated = later.sent.find((sent) =>
      sent.url.includes(pictureModel)
    )
    expect(revalidated?.headers.get("if-none-match")).toBe('"v1"')
    const sentBefore = later.sent.length
    await catalog.idle()
    expect(later.sent.length).toBe(sentBefore)
  })

  it("lists the public schemas before any key connects", async () => {
    const replay = new ReplayFetch([
      {
        method: "GET",
        url: `${docsUrl}/llms.txt`,
        status: 200,
        bytes: new TextEncoder().encode(
          `- [Picture](${docsUrl}/router-schemas/${pictureModel}.json)\n`
        ),
      },
      {
        method: "GET",
        url: `${docsUrl}/router-schemas/${pictureModel}.json`,
        status: 200,
        json: pictureSchema,
      },
    ])
    const catalog = catalogAt(new FixedClock({ now: start }))
    const models = await catalog.models(httpWith(replay, null))
    expect(models.map((one) => [one.facts.model, one.source])).toEqual([
      [pictureModel, "public"],
    ])
    expect(replay.sent.some((sent) => sent.url.startsWith(routerUrl))).toBe(
      false
    )
  })

  it("reads a model's schema with the key when a keyed visitor opens it after a public listing", async () => {
    const clock = new FixedClock({ now: start })
    const catalog = catalogAt(clock)
    await catalog.models(
      httpWith(
        new ReplayFetch([
          {
            method: "GET",
            url: `${docsUrl}/llms.txt`,
            status: 200,
            bytes: new TextEncoder().encode(
              `/router-schemas/${pictureModel}.json`
            ),
          },
          {
            method: "GET",
            url: `${docsUrl}/router-schemas/${pictureModel}.json`,
            status: 200,
            json: pictureSchema,
          },
        ]),
        null
      )
    )
    const listed = await catalog.models(
      httpWith(new ReplayFetch([catalogPage([pictureModel])]))
    )
    expect(listed.map((one) => one.source)).toEqual(["public"])
    const keyed = new ReplayFetch([schemaRead(pictureModel, pictureSchema)])
    const entry = await catalog.entry(httpWith(keyed), pictureModel)
    expect(entry?.source).toBe("keyed")
    expect(keyed.unused()).toEqual([])
  })

  it("passes on a catalog the Router refuses for the key", async () => {
    const catalog = catalogAt(new FixedClock({ now: start }))
    const replay = new ReplayFetch([
      refused(
        "GET",
        "/v2/models?limit=100",
        403,
        "not_enabled",
        "Comfy Router is not enabled for this account yet."
      ),
    ])
    await expect(catalog.models(httpWith(replay))).rejects.toMatchObject({
      code: "ENGINE_NOT_ENABLED",
    })
  })

  it("refuses a key Comfy has not enabled while the cache is warm", async () => {
    const catalog = catalogAt(new FixedClock({ now: start }))
    await catalog.models(
      httpWith(
        new ReplayFetch([
          catalogPage([pictureModel]),
          schemaRead(pictureModel, pictureSchema),
        ]),
        "enabled-key"
      )
    )
    const refusedKey = new ReplayFetch([
      refused(
        "GET",
        "/v2/models?limit=100",
        403,
        "not_enabled",
        "Comfy Router is not enabled for this account yet."
      ),
    ])
    await expect(
      catalog.models(httpWith(refusedKey, "other-key"))
    ).rejects.toMatchObject({ code: "ENGINE_NOT_ENABLED" })
    await expect(
      catalog.entry(httpWith(new ReplayFetch([]), "enabled-key"), pictureModel)
    ).resolves.toMatchObject({ source: "keyed" })
  })

  it("gives each visitor only the answer to its own key while two loads run", async () => {
    const catalog = catalogAt(new FixedClock({ now: start }))
    const refusing = httpWith(
      new ReplayFetch([
        refused(
          "GET",
          "/v2/models?limit=100",
          403,
          "not_enabled",
          "Comfy Router is not enabled for this account yet."
        ),
      ]),
      "refused-key"
    )
    const enabled = httpWith(
      new ReplayFetch([
        catalogPage([pictureModel]),
        schemaRead(pictureModel, pictureSchema),
      ]),
      "enabled-key"
    )
    const [first, second] = await Promise.allSettled([
      catalog.models(refusing),
      catalog.models(enabled),
    ])
    expect(first).toMatchObject({
      status: "rejected",
      reason: { code: "ENGINE_NOT_ENABLED" },
    })
    expect(second.status).toBe("fulfilled")
  })

  it("asks for estimates again an hour after Comfy refused them for a key", () => {
    const clock = new FixedClock({ now: start })
    const catalog = catalogAt(clock)
    catalog.markEstimatesOff("tag")
    expect(catalog.hasEstimates("tag")).toBe(false)
    expect(catalog.hasEstimates("other")).toBe(true)
    clock.advance(oneHourMs)
    expect(catalog.hasEstimates("tag")).toBe(true)
  })

  it("leaves out the aliases that run a model on another provider", async () => {
    const alias = routerSchema({
      model: "other/picture-2",
      takes: ["text"],
      makes: ["image"],
      aliasOf: pictureModel,
      properties: {},
    })
    const catalog = catalogAt(new FixedClock({ now: start }))
    const models = await catalog.models(
      httpWith(
        new ReplayFetch([
          catalogPage([pictureModel, "other/picture-2"]),
          schemaRead(pictureModel, pictureSchema),
          schemaRead("other/picture-2", alias),
        ])
      )
    )
    expect(models.map((one) => one.facts.model)).toEqual([pictureModel])
  })

  it("waits for every listed schema before it serves a list read while the first load runs", async () => {
    const catalog = catalogAt(new FixedClock({ now: start }))
    const replay = new ReplayFetch([
      catalogPage([pictureModel, clipModel]),
      schemaRead(pictureModel, pictureSchema),
      schemaRead(clipModel, clipSchema),
    ])
    const { http, release } = heldBack(replay, clipModel)
    const first = catalog.models(http)
    await settled(first)
    const during = catalog.models(http)
    expect(await settled(during)).toBe(false)
    release()
    const lists = await Promise.all([first, during])
    for (const list of lists) {
      expect(list.map((one) => one.facts.model)).toEqual([
        pictureModel,
        clipModel,
      ])
    }
  })

  it("serves a list read after the first load at once and whole", async () => {
    const catalog = catalogAt(new FixedClock({ now: start }))
    const replay = new ReplayFetch([
      catalogPage([pictureModel, clipModel]),
      schemaRead(pictureModel, pictureSchema),
      schemaRead(clipModel, clipSchema),
    ])
    const { http, release } = heldBack(replay, clipModel)
    const first = catalog.models(http)
    release()
    await first
    const after = catalog.models(http)
    expect(await settled(after)).toBe(true)
    expect((await after).map((one) => one.facts.model)).toEqual([
      pictureModel,
      clipModel,
    ])
  })
})
