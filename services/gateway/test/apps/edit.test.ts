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
import { app } from "../../../../packages/catalog/src/edit/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

function editApp(): AppDefinition {
  return appDefinition.parse(app)
}

const startPath = buildPath(routes.startRun.path, { appId: "edit" })
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

function pngOf(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33)
  bytes.set(pngSignature)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13)
  view.setUint32(16, width)
  view.setUint32(20, height)
  bytes.set([8, 6], 24)
  return bytes
}

describe("an Edit run through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [editApp()] })
    open.push(harness)
    return harness
  }

  function start(gateway: Harness, body: unknown) {
    return gateway.call(
      startPath,
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  async function upload(
    gateway: Harness,
    bytes: Uint8Array,
    mime = "image/png"
  ): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": mime },
      body: bytes,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function refused(gateway: Harness, body: unknown): Promise<string> {
    const response = await start(gateway, body)
    expect(response.status).toBe(400)
    return errorEnvelope.parse(await response.json()).error.code
  }

  it("changes a photo by your words at the smallest size and keeps one PNG with the inputs", async () => {
    const gateway = openGateway()
    const photoId = await upload(gateway, pngOf(900, 1200))
    const response = await start(gateway, {
      inputs: {
        image: [photoId],
        prompt: "make the jacket red",
        resolution: "small",
        seed: 9,
      },
      aspectRatio: "3:4",
    })
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ appId: "edit", origin: "demo" })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      image: [photoId],
      prompt: "make the jacket red",
      model: "qwen-image-edit-2511",
      resolution: "small",
      seed: 9,
    })
    expect(done.outputs).toHaveLength(1)
    const outputId = done.outputs[0] ?? ""
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
  })

  it("refuses a run with no words, a photo under 480 pixels, a GIF and a Count of 5, and starts nothing", async () => {
    const gateway = openGateway()
    const photoId = await upload(gateway, pngOf(900, 1200))
    const small = await upload(gateway, pngOf(640, 479))
    const gif = await upload(gateway, pngOf(900, 1200), "image/gif")
    const prompt = "make the jacket red"
    const codes = [
      await refused(gateway, { inputs: { image: [photoId] } }),
      await refused(gateway, { inputs: { image: [small], prompt } }),
      await refused(gateway, { inputs: { image: [gif], prompt } }),
      await refused(gateway, {
        inputs: { image: [photoId], prompt },
        count: 5,
      }),
    ]
    expect(codes).toEqual([
      "RUN_INPUT_INVALID",
      "RUN_INPUT_INVALID",
      "RUN_INPUT_INVALID",
      "RUN_INPUT_INVALID",
    ])
    expect(gateway.jobs.enqueued).toEqual([])
  })
})
