import {
  type AppDefinition,
  appDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/relight/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

function relightApp(): AppDefinition {
  return appDefinition.parse(app)
}

const startPath = buildPath(routes.startRun.path, { appId: "relight" })
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

describe("a Relight run through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [relightApp()] })
    open.push(harness)
    return harness
  }

  function start(gateway: Harness, body: unknown) {
    return gateway.call(
      startPath,
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  async function upload(gateway: Harness): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: photo,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function finish(gateway: Harness, body: unknown) {
    const response = await start(gateway, body)
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ appId: "relight", origin: "demo" })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  async function refused(gateway: Harness, body: unknown): Promise<string> {
    const response = await start(gateway, body)
    expect(response.status).toBe(400)
    return errorEnvelope.parse(await response.json()).error.code
  }

  it("lights a photo from the left in warm light and keeps one PNG with the inputs and the seed", async () => {
    const gateway = openGateway()
    const photoId = await upload(gateway)
    const done = await finish(gateway, {
      inputs: { image: [photoId], direction: "left", color: "warm", seed: 9 },
      aspectRatio: "3:2",
    })
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      image: [photoId],
      direction: "left",
      softness: "auto",
      color: "warm",
      brightness: 0,
      quality: "draft",
      model: "qwen-image-edit-2509-relight",
      seed: 9,
    })
    expect(done.seed).toBe(9)
    expect(done.count).toBe(1)
    expect(done.aspectRatio).toBe("3:2")
    expect(done.outputs).toHaveLength(1)
    const outputId = done.outputs[0] ?? ""
    const found = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await found.json()).asset).toMatchObject({
      kind: "image",
      mime: "image/png",
      sourceRunId: done.id,
    })
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
  })

  it("makes 4 outputs at Count 4 on 2509 at final with a description", async () => {
    const gateway = openGateway()
    const photoId = await upload(gateway)
    const done = await finish(gateway, {
      inputs: {
        image: [photoId],
        brightness: -2,
        prompt: "Light from a candle on the table",
        quality: "final",
        seed: 7,
      },
      count: 4,
    })
    expect(done.status).toBe("done")
    expect(done.seed).toBe(7)
    expect(done.count).toBe(4)
    expect(done.outputs).toHaveLength(4)
    expect(new Set(done.outputs).size).toBe(4)
  })

  it("refuses a run with no photo, two photos, a Count of 5 and a Brightness of 3", async () => {
    const gateway = openGateway()
    const photoId = await upload(gateway)
    const codes = [
      await refused(gateway, { inputs: { direction: "left" } }),
      await refused(gateway, { inputs: { image: [photoId, photoId] } }),
      await refused(gateway, { inputs: { image: [photoId] }, count: 5 }),
      await refused(gateway, { inputs: { image: [photoId], brightness: 3 } }),
    ]
    expect(codes).toEqual([
      "RUN_INPUT_INVALID",
      "RUN_INPUT_INVALID",
      "RUN_INPUT_INVALID",
      "RUN_INPUT_INVALID",
    ])
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a value no list holds, a brightness off its step and a description past 300 characters", async () => {
    const gateway = openGateway()
    const photoId = await upload(gateway)
    const bodies = [
      { inputs: { image: [photoId], direction: "below" } },
      { inputs: { image: [photoId], color: "green" } },
      { inputs: { image: [photoId], brightness: 0.5 } },
      { inputs: { image: [photoId], prompt: "a".repeat(301) } },
      { inputs: { image: [photoId], model: "another-model" } },
      { inputs: { image: [photoId], model: "qwen-image-edit-2511" } },
    ]
    for (const body of bodies) {
      expect(await refused(gateway, body)).toBe("RUN_INPUT_INVALID")
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })
})
