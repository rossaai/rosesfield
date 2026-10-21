import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type CatalogModel,
  catalogRoutes,
  modelListResponse,
} from "@rosesfield/catalog/comfy"
import {
  appDefinition,
  assetResponse,
  buildPath,
  type Run,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/layers/app"
import {
  fakeRouter,
  type RouterCall,
  schemaOf,
} from "../catalog/router-recordings"
import { localEnv } from "../server-env"

const host = { host: "127.0.0.1:8787" }
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)

const text = { type: "string" }

const seedreamPro = "byteplus/seedream-5-0-pro-260628"

function media(description: string): Record<string, unknown> {
  return { type: "string", description }
}

const recordedCatalog = [
  schemaOf({
    model: "bfl/flux-3-image",
    takes: ["text", "image"],
    makes: ["image"],
    properties: {
      prompt: text,
      images: {
        description: "Up to ten images, each a URL or a base64 string.",
        anyOf: [text, { type: "array", items: text, maxItems: 10 }],
      },
      resolution: { type: "string", default: "1k" },
      grounding: { type: "boolean", default: true },
    },
    required: ["prompt"],
  }),
  schemaOf({
    model: "bfl/flux-pro-1.0-fill",
    takes: ["image", "text"],
    makes: ["image"],
    properties: {
      image: media("A Base64-encoded string representing the image."),
      mask: {
        anyOf: [text],
        description: "A Base64-encoded string representing a mask.",
      },
      prompt: { anyOf: [text], default: "" },
      steps: {
        anyOf: [{ type: "integer", minimum: 15, maximum: 50 }],
        default: 50,
      },
    },
    required: ["image"],
  }),
  schemaOf({
    model: "bria/image-edit-relight",
    takes: ["image", "text"],
    makes: ["image"],
    properties: {
      image: media("A Base64-encoded string or URL of the image to edit."),
      light_type: text,
      light_direction: text,
    },
    required: ["image", "light_type"],
  }),
  schemaOf({
    model: seedreamPro,
    takes: ["text", "image"],
    makes: ["image"],
    properties: {
      image: {
        description:
          "The image or images to edit, as an accessible URL or a data-URI-prefixed Base64 payload.",
        oneOf: [
          text,
          { items: text, maxItems: 10, minItems: 1, type: "array" },
        ],
      },
      layer_decomposition: {
        default: false,
        description: "Controls whether layer separation is enabled.",
        type: "boolean",
      },
      prompt: text,
      size: text,
    },
    required: [],
  }),
]

const picks = [
  { mode: "split", model: seedreamPro },
  { mode: "edit", model: "bfl/flux-3-image" },
  { mode: "relight", model: "bria/image-edit-relight" },
  { mode: "fill", model: "bfl/flux-pro-1.0-fill" },
]

function bodyFor(model: CatalogModel, mode: string, image: string) {
  const inputs: Record<string, unknown> = { model: model.id, mode }
  for (const field of model.form ?? []) {
    if (field.kind === "media") {
      inputs[field.name] = [image]
    } else if (field.path === "layer_decomposition" && mode === "split") {
      inputs[field.name] = "on"
    } else if (field.kind === "choice" && field.required) {
      inputs[field.name] = field.options[0]
    } else if (field.required) {
      inputs[field.name] = "a red hat"
    }
  }
  return { inputs }
}

describe("a hosted model picked in each Layers mode, on the demo engine", () => {
  let folder = ""
  let clock: FixedClock
  let gateway: LocalGateway
  let calls: RouterCall[] = []

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-layers-hosted-"))
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
      buildPath(catalogRoutes.listModels.path, { appId: "layers" })
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

  it("lists each recorded model under the task of its mode", async () => {
    const tasks = Object.fromEntries(
      (await modelsOf())
        .filter((model) => model.kind === "hosted")
        .map((model) => [model.id, model.task])
    )
    expect(tasks).toEqual({
      [seedreamPro]: "layer-separation",
      "bfl/flux-3-image": "image-edit",
      "bria/image-edit-relight": "relight",
      "bfl/flux-pro-1.0-fill": "inpaint",
    })
  })

  it("marks the fields each recorded schema requires, and no other, as required", async () => {
    const required = Object.fromEntries(
      (await modelsOf())
        .filter((model) => model.kind === "hosted")
        .map((model) => [
          model.id,
          (model.form ?? [])
            .filter((field) => field.required)
            .map((field) => field.path),
        ])
    )
    expect(required).toEqual({
      [seedreamPro]: [],
      "bfl/flux-3-image": ["prompt"],
      "bria/image-edit-relight": ["image", "light_type"],
      "bfl/flux-pro-1.0-fill": ["image"],
    })
  })

  it("starts each one, keeps its mode in the run and ends with one image, with no call to the model", async () => {
    const models = await modelsOf()
    const image = await upload()
    for (const pick of picks) {
      const model = models.find((one) => one.id === pick.model)
      if (model === undefined || model.form === null) {
        throw new Error(`the recorded catalog lacks the form of ${pick.model}`)
      }
      const started = await call(
        buildPath(routes.startRun.path, { appId: "layers" }),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": `layers-hosted-${pick.mode}`,
          },
          body: JSON.stringify(bodyFor(model, pick.mode, image)),
        }
      )
      expect(started.status, pick.model).toBe(202)
      const { run } = runResponse.parse(await started.json())
      expect(run).toMatchObject({ origin: "demo", count: 1 })
      expect(run.inputs).toMatchObject({ model: pick.model, mode: pick.mode })
      if (pick.mode === "split") {
        expect(run.inputs.layerDecomposition).toBe("on")
      }
      const done = await drive(run.id)
      expect(done.status).toBe("done")
      expect(done.outputs).toHaveLength(1)
    }
    expect(calls.filter((one) => one.method !== "GET")).toEqual([])
  })

  it("control: refuses a hosted pick in a mode Layers does not have", async () => {
    const models = await modelsOf()
    const model = models.find((one) => one.id === "bfl/flux-3-image")
    if (model === undefined) {
      throw new Error("the recorded catalog lacks FLUX 3 Image")
    }
    const refused = await call(
      buildPath(routes.startRun.path, { appId: "layers" }),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bodyFor(model, "erase", await upload())),
      }
    )
    expect(refused.status).toBe(400)
  })
})
