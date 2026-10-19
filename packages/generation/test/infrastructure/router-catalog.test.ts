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

function catalogAt(clock: FixedClock): RouterCatalog {
  return new RouterCatalog({ clock })
}

describe("RouterCatalog", () => {
  it("serves a second visitor from the cache with no request", async () => {
    const clock = new FixedClock({ now: start })
    const catalog = catalogAt(clock)
    const first = new ReplayFetch([
      catalogPage([pictureModel]),
      schemaRead(pictureModel, pictureSchema),
    ])
    await catalog.models(httpWith(first, "first-key"))
    const second = new ReplayFetch([])
    const models = await catalog.models(httpWith(second, "second-key"))
    expect(models.map((one) => one.facts.model)).toEqual([pictureModel])
    expect(second.sent).toEqual([])
  })

  it("revalidates each schema by ETag after an hour and lists a model Comfy added", async () => {
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
    clock.advance(RouterCatalog.maxAgeMs)
    const later = new ReplayFetch([
      catalogPage([pictureModel, clipModel]),
      schemaSame(pictureModel),
      schemaRead(clipModel, clipSchema),
    ])
    const models = await catalog.models(httpWith(later))
    expect(models.map((one) => one.facts.model)).toEqual([
      pictureModel,
      clipModel,
    ])
    const revalidated = later.sent.find((sent) =>
      sent.url.includes(pictureModel)
    )
    expect(revalidated?.headers.get("if-none-match")).toBe('"v1"')
    expect(later.unused()).toEqual([])
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

  it("reads the keyed schemas once a key connects after a public listing", async () => {
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
    const keyed = new ReplayFetch([
      catalogPage([pictureModel]),
      schemaRead(pictureModel, pictureSchema),
    ])
    const models = await catalog.models(httpWith(keyed))
    expect(models.map((one) => one.source)).toEqual(["keyed"])
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
})
