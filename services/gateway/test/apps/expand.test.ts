import {
  appDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/expand/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const startPath = buildPath(routes.startRun.path, { appId: "expand" })
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

describe("an Expand run through the gateway on the demo engine", () => {
  let gateway: Harness

  beforeEach(() => {
    gateway = harnessFor({
      portsFor: localPorts,
      apps: [appDefinition.parse(app)],
    })
  })

  afterEach(() => gateway.close())

  function post(body: unknown, key: string) {
    return jsonInit(body, { "idempotency-key": key })
  }

  async function upload(): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: photo,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function startAndFinish(body: unknown, key: string) {
    const response = await gateway.call(startPath, post(body, key))
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ appId: "expand", origin: "demo" })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  async function contentOf(assetId: string): Promise<Uint8Array> {
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId })
    )
    expect(content.headers.get("content-type")).toBe("image/png")
    return new Uint8Array(await content.arrayBuffer())
  }

  it("makes two PNGs at 16:9 in To a format and keeps the inputs and the seed", async () => {
    const photoId = await upload()
    const done = await startAndFinish(
      {
        inputs: { mode: "format", photo: [photoId], aspect: "16-9", seed: 11 },
        aspectRatio: "16:9",
        count: 2,
      },
      "expand-format-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      model: "qwen-image-inpaint",
      mode: "format",
      photo: [photoId],
      aspect: "16-9",
      seed: 11,
    })
    expect(done.seed).toBe(11)
    expect(done.count).toBe(2)
    expect(done.aspectRatio).toBe("16:9")
    expect(done.outputs).toHaveLength(2)
    for (const outputId of done.outputs) {
      const asset = await gateway.call(
        buildPath(routes.getAsset.path, { assetId: outputId })
      )
      expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
        kind: "image",
        mime: "image/png",
        width: 1024,
        height: 576,
      })
      const bytes = await contentOf(outputId)
      expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
    }
  })

  it("keeps the default format on a To a format run that names none", async () => {
    const photoId = await upload()
    const done = await startAndFinish(
      { inputs: { mode: "format", photo: [photoId] } },
      "expand-format-2"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      model: "qwen-image-inpaint",
      mode: "format",
      photo: [photoId],
      aspect: "16-9",
    })
  })

  it("ends a By side run with its four shares and its scene on the record", async () => {
    const photoId = await upload()
    const done = await startAndFinish(
      {
        inputs: {
          mode: "sides",
          photo: [photoId],
          left: 50,
          scene: "A field under a low sky",
        },
        aspectRatio: "2:1",
      },
      "expand-sides-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      model: "qwen-image-inpaint",
      mode: "sides",
      photo: [photoId],
      top: 0,
      right: 0,
      bottom: 0,
      left: 50,
      scene: "A field under a low sky",
    })
    expect(done.seed).toEqual(expect.any(Number))
    expect(done.outputs).toHaveLength(1)
  })

  it("refuses a run with no photo and starts nothing", async () => {
    const response = await gateway.call(
      startPath,
      post({ inputs: { mode: "format" } }, "expand-empty-1")
    )
    expect(response.status).toBe(400)
    const body = errorEnvelope.parse(await response.json())
    expect(body.error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a side past 100 and a scene past 500 characters", async () => {
    const photoId = await upload()
    const past = await gateway.call(
      startPath,
      post(
        { inputs: { mode: "sides", photo: [photoId], top: 105 } },
        "expand-far-1"
      )
    )
    expect(past.status).toBe(400)
    const long = await gateway.call(
      startPath,
      post(
        {
          inputs: { mode: "format", photo: [photoId], scene: "a".repeat(501) },
        },
        "expand-long-1"
      )
    )
    expect(long.status).toBe(400)
  })

  it.each([
    ["a side in To a format", "side", { mode: "format", left: 50 }],
    [
      "a format in By side",
      "format",
      { mode: "sides", aspect: "16-9", left: 50 },
    ],
    ["a format outside the five", "wide", { mode: "format", aspect: "21-9" }],
  ])("refuses %s and starts nothing", async (_name, key, inputs) => {
    const photoId = await upload()
    const response = await gateway.call(
      startPath,
      post({ inputs: { ...inputs, photo: [photoId] } }, `expand-refuse-${key}`)
    )
    expect(response.status).toBe(400)
    const body = errorEnvelope.parse(await response.json())
    expect(body.error.code).toBe("RUN_INPUT_INVALID")
    const list = await gateway.call(routes.listRuns.path)
    expect(await list.json()).toMatchObject({ runs: [] })
  })
})
