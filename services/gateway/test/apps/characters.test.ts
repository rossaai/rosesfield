import { readApps } from "@rosesfield/catalog"
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
import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import { Character, type CharacterRepository } from "@rosesfield/library"
import { afterEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/characters/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes, start as now } from "../sample-apps"

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
