import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { adsHostedInputsOf, adsPromptOf } from "@rosesfield/catalog/ads"
import {
  type CatalogModel,
  catalogRoutes,
  modelListResponse,
} from "@rosesfield/catalog/comfy"
import {
  appDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  type Run,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/ads/app"
import {
  fakeRouter,
  type RouterCall,
  schemaOf,
} from "../catalog/router-recordings"
import { localEnv } from "../server-env"

const host = { host: "127.0.0.1:8787" }
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const text = { type: "string" }
const flux = "bfl/flux-3-image"

const recordedCatalog = [
  schemaOf({
    model: flux,
    takes: ["text", "image"],
    makes: ["image"],
    properties: {
      prompt: text,
      images: {
        description: "Up to ten images, each a URL or a base64 string.",
        anyOf: [text, { type: "array", items: text, maxItems: 10 }],
      },
      resolution: { type: "string", default: "1k" },
    },
    required: ["prompt"],
  }),
  schemaOf({
    model: "maker/words-to-picture",
    takes: ["text"],
    makes: ["image"],
    properties: { prompt: text },
    required: ["prompt"],
  }),
]

describe("Ads on a hosted model of the catalog, on the demo engine", () => {
  let folder = ""
  let clock: FixedClock
  let gateway: LocalGateway
  let calls: RouterCall[] = []

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-ads-hosted-"))
    clock = new FixedClock({ now: new Date("2026-10-21T09:00:00.000Z") })
    const router = fakeRouter({ schemas: recordedCatalog })
    calls = router.calls
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [appDefinition.parse(app)],
      clock,
      platformRoot: null,
      fetch: router.fetch,
    })
    gateway.jobs.stop()
  })

  afterEach(() => {
    gateway.jobs.stop()
    rmSync(folder, { recursive: true, force: true })
  })

  async function call(path: string, init: RequestInit = {}) {
    return gateway.app.request(path, {
      ...init,
      headers: { ...host, ...init.headers },
    })
  }

  async function modelsOf(): Promise<readonly CatalogModel[]> {
    const listed = await call(
      buildPath(catalogRoutes.listModels.path, { appId: "ads" })
    )
    expect(listed.status).toBe(200)
    return modelListResponse.parse(await listed.json()).models
  }

  async function upload(): Promise<string> {
    const response = await call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: photo,
    })
    return assetResponse.parse(await response.json()).asset.id
  }

  async function fluxForm(): Promise<NonNullable<CatalogModel["form"]>> {
    const model = (await modelsOf()).find((one) => one.id === flux)
    if (model === undefined || model.form === null) {
      throw new Error("the recorded catalog lacks the form of FLUX 3 Image")
    }
    return model.form
  }

  function start(inputs: Record<string, unknown>, key: string) {
    return call(buildPath(routes.startRun.path, { appId: "ads" }), {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({ inputs }),
    })
  }

  async function drive(runId: string): Promise<Run> {
    for (let step = 0; step < 20; step += 1) {
      const { nextWakeMs } = await gateway.handlers.advanceRun.execute({
        runId: runIdFormat.parse(runId),
      })
      if (nextWakeMs === null) {
        const read = await call(buildPath(routes.getRun.path, { runId }))
        return runResponse.parse(await read.json()).run
      }
      clock.advance(nextWakeMs)
    }
    throw new Error(`Run ${runId} did not end in 20 steps`)
  }

  it("lists the Qwen Image Edit 2511 graph first, then each hosted model that edits an image, and none that only writes one", async () => {
    const models = await modelsOf()
    expect(models.map((model) => model.id)).toEqual([
      "qwen-image-edit-2511",
      flux,
    ])
    expect(models.map((model) => model.task)).toEqual([
      "image-edit",
      "image-edit",
    ])
  })

  it("runs an ad on FLUX 3 Image with the prompt Ads builds, and keeps its words and photo with the run", async () => {
    const image = await upload()
    const own = {
      kind: "ad",
      headline: "Fresh cold brew",
      line: "Made in small batches",
      style: "minimal",
      product: [image],
    }
    const filled = adsHostedInputsOf({
      inputs: own,
      fields: await fluxForm(),
      characterPhoto: null,
      aspectRatio: null,
      count: 1,
    })
    expect(filled).toEqual({ prompt: adsPromptOf(own), images: [image] })
    const started = await start({ model: flux, ...filled, ...own }, "ads-flux")
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run).toMatchObject({ origin: "demo", count: 1 })
    expect(run.inputs).toMatchObject({ model: flux, ...filled, ...own })
    const done = await drive(run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(1)
    expect(calls.filter((one) => one.method !== "GET")).toEqual([])
  })

  it("control: refuses a headline of 61 characters on FLUX 3 Image with RUN_INPUT_INVALID and starts no run", async () => {
    const image = await upload()
    const own = { kind: "ad", headline: "a".repeat(61), product: [image] }
    const filled = adsHostedInputsOf({
      inputs: own,
      fields: await fluxForm(),
      characterPhoto: null,
      aspectRatio: null,
      count: 1,
    })
    const refused = await start({ model: flux, ...filled, ...own }, "ads-long")
    expect(refused.status).toBe(400)
    const { error } = errorEnvelope.parse(await refused.json())
    expect(error.code).toBe("RUN_INPUT_INVALID")
    const listed = await call(`${routes.listRuns.path}?appId=ads`)
    expect(await listed.json()).toMatchObject({ runs: [] })
  })
})
