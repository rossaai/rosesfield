import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readApps } from "@rosesfield/catalog"
import { hostedRunsOf, viewsOf } from "@rosesfield/catalog/characters"
import {
  type CatalogModel,
  catalogRoutes,
  modelListResponse,
} from "@rosesfield/catalog/comfy"
import {
  type AppDefinition,
  assetResponse,
  buildPath,
  characterListResponse,
  characterPhotoLimit,
  characterResponse,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import {
  assetIdFormat,
  characterIdFormat,
  FixedClock,
  runIdFormat,
} from "@rosesfield/kernel"
import { Character, type CharacterRepository } from "@rosesfield/library"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/characters/app"
import { fakeRouter, schemaOf } from "../catalog/router-recordings"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes, start as now } from "../sample-apps"
import { localEnv } from "../server-env"

function charactersApp(): AppDefinition {
  const [listed] = readApps([{ folder: "characters", app }])
  if (listed === undefined) {
    throw new Error("The characters app did not parse")
  }
  return listed
}

describe("the characters app through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({
      portsFor: localPorts,
      apps: [charactersApp()],
    })
    open.push(harness)
    return harness
  }

  function start(gateway: Harness, body: unknown) {
    return gateway.call(
      buildPath(routes.startRun.path, { appId: "characters" }),
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  async function finished(gateway: Harness, response: Response) {
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ status: "queued", origin: "demo" })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  it("makes the default 2 portraits from traits and keeps them as image assets", async () => {
    const gateway = openGateway()
    const done = await finished(
      gateway,
      await start(gateway, {
        inputs: { gender: "man", age: "older", hairLength: "short" },
        aspectRatio: "3:4",
      })
    )
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(2)
    expect(done.inputs).toMatchObject({
      mode: "traits",
      gender: "man",
      model: "z-image-turbo",
      plainBackground: "on",
      count: "2",
    })
    expect(done.count).toBe(2)
    expect(done.seed).not.toBeNull()
    for (const assetId of done.outputs) {
      const found = await gateway.call(
        buildPath(routes.getAsset.path, { assetId })
      )
      expect(assetResponse.parse(await found.json()).asset).toMatchObject({
        kind: "image",
        mime: "image/png",
        sourceRunId: done.id,
        width: 768,
        height: 1024,
      })
    }
  })

  it("makes the count of portraits the count input names", async () => {
    const gateway = openGateway()
    const done = await finished(
      gateway,
      await start(gateway, {
        inputs: { count: "3", model: "qwen-image-2512" },
        aspectRatio: "9:16",
      })
    )
    expect(done).toMatchObject({ status: "done", count: 3 })
    expect(done.outputs).toHaveLength(3)
  })

  async function savedCharacter(gateway: Harness): Promise<string> {
    const uploaded = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: pngBytes,
    })
    const photo = assetResponse.parse(await uploaded.json()).asset.id
    const created = await gateway.call(
      routes.createCharacter.path,
      jsonInit({ name: "Ada", references: [photo], notes: "" })
    )
    return characterResponse.parse(await created.json()).character.id
  }

  it("keeps a character to 1 to 10 photos, the bound the screens read", async () => {
    const gateway = openGateway()
    const uploaded = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: pngBytes,
    })
    const photo = assetResponse.parse(await uploaded.json()).asset.id
    const others = Array.from({ length: characterPhotoLimit }, () =>
      crypto.randomUUID()
    )
    const create = (references: string[]) =>
      gateway.call(
        routes.createCharacter.path,
        jsonInit({ name: "Ada", references, notes: "" })
      )
    const over = await create([photo, ...others])
    expect(over.status).toBe(400)
    expect(errorEnvelope.parse(await over.json()).error.code).toBe(
      "REQUEST_INVALID"
    )
    const atBound = await create([photo, ...others.slice(1)])
    expect(errorEnvelope.parse(await atBound.json()).error.code).not.toBe(
      "REQUEST_INVALID"
    )
    const one = await create([photo])
    expect(one.status).toBe(201)
    expect(characterPhotoLimit).toBe(10)
  })

  it("reads, lists and edits a saved character that holds 16 photos", async () => {
    const held: { characters?: CharacterRepository } = {}
    const harness = harnessFor({
      portsFor: (clock, folder) => {
        const ports = localPorts(clock, folder)
        held.characters = ports.characters
        return ports
      },
      apps: [charactersApp()],
    })
    open.push(harness)
    const references = Array.from({ length: 16 }, () =>
      assetIdFormat.parse(crypto.randomUUID())
    )
    const saved = Character.create({
      id: characterIdFormat.parse(crypto.randomUUID()),
      name: "Ada",
      references,
      notes: "",
      now,
    })
    await held.characters?.add(saved)
    const listed = await harness.call(routes.listCharacters.path)
    expect(listed.status).toBe(200)
    const { characters: found } = characterListResponse.parse(
      await listed.json()
    )
    expect(found.map((one) => one.references)).toEqual([references])
    const path = buildPath(routes.getCharacter.path, { characterId: saved.id })
    const read = await harness.call(path)
    expect(read.status).toBe(200)
    expect(
      characterResponse.parse(await read.json()).character.references
    ).toHaveLength(16)
    const edited = await harness.call(path, {
      ...jsonInit({ notes: "Wears glasses" }),
      method: "PATCH",
    })
    expect(edited.status).toBe(200)
    expect(characterResponse.parse(await edited.json()).character).toMatchObject(
      { notes: "Wears glasses", references }
    )
  })

  it("makes 4 views of a saved character", async () => {
    const gateway = openGateway()
    const character = await savedCharacter(gateway)
    const done = await finished(
      gateway,
      await start(gateway, {
        inputs: {
          mode: "angles",
          character: [character],
          angleSet: "turnaround",
        },
      })
    )
    expect(done).toMatchObject({ status: "done", count: 4 })
    expect(done.outputs).toHaveLength(4)
    expect(done.inputs).toMatchObject({
      mode: "angles",
      count: "4",
      character: [character],
      model: "qwen-image-edit-2511",
      view: "front",
    })
    expect(done.inputs).not.toHaveProperty("gender")
  })

  it("refuses each run the modes and their bounds rule out", async () => {
    const gateway = openGateway()
    const character = [await savedCharacter(gateway)]
    for (const body of [
      { inputs: {}, count: 5 },
      { inputs: { count: "5" } },
      { inputs: { count: "3" }, count: 2 },
      { inputs: { age: "child" } },
      { inputs: { model: "nano-banana-pro" } },
      { inputs: { model: "flux-2-klein-4b" } },
      { inputs: { model: "qwen-image-edit-2511" } },
      { inputs: { mode: "angles", character, model: "z-image-turbo" } },
      { inputs: { mode: "angles", character, count: "2" } },
      { inputs: { mode: "angles", character }, count: 2 },
      { inputs: { mode: "angles" } },
      { inputs: { mode: "angles", character, gender: "man" } },
      { inputs: { angleSet: "quarters" } },
    ]) {
      const response = await start(gateway, body)
      expect(response.status, JSON.stringify(body)).toBe(400)
      expect(errorEnvelope.parse(await response.json()).error.code).toBe(
        "RUN_INPUT_INVALID"
      )
    }
  })

  it("accepts the same runs once each defect is fixed", async () => {
    const gateway = openGateway()
    const character = [await savedCharacter(gateway)]
    for (const body of [
      { inputs: { count: "4" }, count: 4 },
      { inputs: { count: "3" }, count: 3 },
      { inputs: { age: "older" } },
      { inputs: { model: "z-image-turbo" } },
      { inputs: { mode: "angles", character, count: "4" } },
      { inputs: { mode: "angles", character }, count: 4 },
      { inputs: { mode: "traits", gender: "man" } },
      { inputs: { mode: "angles", character, angleSet: "quarters" } },
    ]) {
      const response = await start(gateway, body)
      expect(response.status, JSON.stringify(body)).toBe(202)
    }
  })
})

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
