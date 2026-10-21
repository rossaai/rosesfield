import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { hostedRunsOf, viewsOf } from "@rosesfield/catalog/characters"
import {
  type CatalogModel,
  catalogRoutes,
  modelListResponse,
} from "@rosesfield/catalog/comfy"
import {
  assetResponse,
  buildPath,
  characterResponse,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { assetIdFormat, FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { fakeRouter, schemaOf } from "../catalog/router-recordings"
import { pngBytes } from "../sample-apps"
import { localEnv } from "../server-env"
import { charactersApp } from "./characters-app"

const fluxImage = "bfl/flux-3-image"

const recordedCatalog = [
  schemaOf({
    model: fluxImage,
    takes: ["text", "image"],
    makes: ["image"],
    properties: {
      prompt: { type: "string" },
      images: {
        description: "Up to ten images, each a URL or a base64 string.",
        anyOf: [
          { type: "string" },
          { type: "array", items: { type: "string" }, maxItems: 10 },
        ],
      },
    },
    required: ["prompt"],
  }),
]

describe("a hosted angle set of Characters, on the demo engine", () => {
  let folder = ""
  let clock: FixedClock
  let gateway: LocalGateway

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-characters-hosted-"))
    clock = new FixedClock({ now: new Date("2026-10-21T09:00:00.000Z") })
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [charactersApp()],
      clock,
      platformRoot: null,
      fetch: fakeRouter({ schemas: recordedCatalog }).fetch,
    })
    gateway.jobs.stop()
  })

  afterEach(() => {
    gateway.jobs.stop()
    rmSync(folder, { recursive: true, force: true })
  })

  function call(path: string, init: RequestInit = {}) {
    return gateway.app.request(path, {
      ...init,
      headers: { host: "127.0.0.1:8787", ...init.headers },
    })
  }

  async function flux(): Promise<CatalogModel> {
    const listed = await call(
      buildPath(catalogRoutes.listModels.path, { appId: "characters" })
    )
    const model = modelListResponse
      .parse(await listed.json())
      .models.find((one) => one.id === fluxImage)
    if (model === undefined || model.form === null) {
      throw new Error("the recorded catalog lacks the form of FLUX 3 Image")
    }
    return model
  }

  async function photo(): Promise<string> {
    const uploaded = await call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: pngBytes,
    })
    return assetResponse.parse(await uploaded.json()).asset.id
  }

  function startView(body: unknown, key: string) {
    return call(buildPath(routes.startRun.path, { appId: "characters" }), {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(body),
    })
  }

  async function character(photoId: string): Promise<string> {
    const created = await call(routes.createCharacter.path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada", references: [photoId], notes: "" }),
    })
    expect(created.status).toBe(201)
    return characterResponse.parse(await created.json()).character.id
  }

  async function views(): Promise<{
    made: ReturnType<typeof hostedRunsOf>
    characterId: string
  }> {
    const model = await flux()
    const photoId = await photo()
    const characterId = await character(photoId)
    const made = hostedRunsOf(
      model.form ?? [],
      {
        mode: "angles",
        model: model.id,
        character: [characterId],
        angleSet: "turnaround",
      },
      { photos: [assetIdFormat.parse(photoId)], count: 4 }
    )
    return { made, characterId }
  }

  it("starts each view with the angles mode, the character, the angle set and its own view kept in its run, and ends each view with one image", async () => {
    const { made, characterId } = await views()
    expect(made).toHaveLength(4)
    for (const [index, view] of made.entries()) {
      const started = await startView(view, `angles-press-view-${index + 1}`)
      expect(started.status).toBe(202)
      const { run } = runResponse.parse(await started.json())
      expect(run.inputs).toMatchObject({
        mode: "angles",
        model: fluxImage,
        character: [characterId],
        angleSet: "turnaround",
        view: viewsOf("turnaround")[index],
      })
      for (let step = 0; step < 20; step += 1) {
        const { nextWakeMs } = await gateway.handlers.advanceRun.execute({
          runId: runIdFormat.parse(run.id),
        })
        if (nextWakeMs === null) {
          break
        }
        clock.advance(nextWakeMs)
      }
      const read = await call(buildPath(routes.getRun.path, { runId: run.id }))
      const done = runResponse.parse(await read.json()).run
      expect(done.status).toBe("done")
      expect(done.outputs).toHaveLength(1)
    }
  })

  it("control: refuses a view whose mode Characters does not have", async () => {
    const {
      made: [view],
    } = await views()
    if (view === undefined) {
      throw new Error("the angle set made no view")
    }
    const refused = await startView(
      { ...view, inputs: { ...view.inputs, mode: "erase" } },
      "angles-erase-view-1"
    )
    expect(refused.status).toBe(400)
  })

  it("control: refuses a view Characters does not name", async () => {
    const {
      made: [view],
    } = await views()
    if (view === undefined) {
      throw new Error("the angle set made no view")
    }
    const refused = await startView(
      { ...view, inputs: { ...view.inputs, view: "sideways" } },
      "angles-sideways-view-1"
    )
    expect(refused.status).toBe(400)
  })

  it("control: refuses a view whose angle set Characters does not have", async () => {
    const {
      made: [view],
    } = await views()
    if (view === undefined) {
      throw new Error("the angle set made no view")
    }
    const refused = await startView(
      { ...view, inputs: { ...view.inputs, angleSet: "spiral" } },
      "angles-spiral-view-1"
    )
    expect(refused.status).toBe(400)
  })
})
