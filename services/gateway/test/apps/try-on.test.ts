import { readApps } from "@rosesfield/catalog"
import {
  type AppDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/try-on/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes } from "../sample-apps"

function tryOnApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "try-on", app }])
  if (parsed === undefined) {
    throw new Error("The try-on app did not parse")
  }
  return parsed
}

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

describe("a Try-on run through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [tryOnApp()] })
    open.push(harness)
    return harness
  }

  async function upload(gateway: Harness): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(pngBytes),
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  function start(gateway: Harness, body: unknown) {
    return gateway.call(
      buildPath(routes.startRun.path, { appId: "try-on" }),
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  it("makes one PNG from a person and a clothes photo and keeps the inputs and the seed", async () => {
    const gateway = openGateway()
    const person = await upload(gateway)
    const clothes = await upload(gateway)
    const response = await start(gateway, {
      inputs: { person: [person], clothes: [clothes], part: "top" },
      aspectRatio: "3:4",
    })
    expect(response.status).toBe(202)
    const started = runResponse.parse(await response.json()).run
    expect(started).toMatchObject({
      appId: "try-on",
      origin: "demo",
      count: 1,
      aspectRatio: "3:4",
    })
    await gateway.drive(started.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: started.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      person: [person],
      clothes: [clothes],
      part: "top",
      model: "qwen-image-edit-2511",
    })
    expect(done.seed).toEqual(expect.any(Number))
    expect(done.outputs).toHaveLength(1)
    const outputId = done.outputs[0] ?? ""
    const asset = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "image",
      mime: "image/png",
      width: 768,
      height: 1024,
    })
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
  })

  it("refuses a run without a Clothes photo and starts nothing", async () => {
    const gateway = openGateway()
    const person = await upload(gateway)
    const response = await start(gateway, { inputs: { person: [person] } })
    expect(response.status).toBe(400)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
    expect(gateway.jobs.enqueued).toEqual([])
    const runs = await gateway.call(`${routes.listRuns.path}?appId=try-on`)
    expect(runs.status).toBe(200)
    expect(JSON.stringify(await runs.json())).not.toContain('"appId":"try-on"')
  })

  it("refuses a part the app does not list and a second Clothes photo", async () => {
    const gateway = openGateway()
    const person = await upload(gateway)
    const clothes = await upload(gateway)
    const shoes = await start(gateway, {
      inputs: { person: [person], clothes: [clothes], part: "shoes" },
    })
    expect(shoes.status).toBe(400)
    const two = await start(gateway, {
      inputs: { person: [person], clothes: [clothes, person] },
    })
    expect(two.status).toBe(400)
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("runs the Qwen try-on graph with a fixed seed and stores the model and the seed", async () => {
    const gateway = openGateway()
    const person = await upload(gateway)
    const clothes = await upload(gateway)
    const response = await start(gateway, {
      inputs: {
        person: [person],
        clothes: [clothes],
        model: "qwen-image-edit-2511",
        seed: 7,
      },
    })
    expect(response.status).toBe(202)
    const started = runResponse.parse(await response.json()).run
    await gateway.drive(started.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: started.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      model: "qwen-image-edit-2511",
      part: "all",
    })
    expect(done.seed).toBe(7)
    expect(done.outputs).toHaveLength(1)
  })

  it("refuses a run without a Person photo and a model the app does not list", async () => {
    const gateway = openGateway()
    const person = await upload(gateway)
    const clothes = await upload(gateway)
    const noPerson = await start(gateway, { inputs: { clothes: [clothes] } })
    expect(noPerson.status).toBe(400)
    expect(errorEnvelope.parse(await noPerson.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
    for (const model of [
      "flux2-klein-9b-tryon",
      "qwen-image-edit-2511-lightning",
      "flux2-klein-4b",
    ]) {
      const unlisted = await start(gateway, {
        inputs: { person: [person], clothes: [clothes], model },
      })
      expect(unlisted.status, model).toBe(400)
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })
})
