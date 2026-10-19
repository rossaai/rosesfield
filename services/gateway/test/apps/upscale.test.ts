import { readApps } from "@rosesfield/catalog"
import {
  type AppDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/upscale/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const startPath = buildPath(routes.startRun.path, { appId: "upscale" })
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const clip = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73)
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

function upscaleApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "upscale", app }])
  if (parsed === undefined) {
    throw new Error("The upscale app did not parse")
  }
  return parsed
}

describe("an Upscale run through the gateway on the demo engine", () => {
  let gateway: Harness

  beforeEach(() => {
    gateway = harnessFor({
      portsFor: localPorts,
      apps: [upscaleApp()],
    })
  })

  afterEach(() => gateway.close())

  function post(body: unknown, key: string) {
    return jsonInit(body, { "idempotency-key": key })
  }

  async function upload(bytes: Uint8Array, mime: string): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": mime },
      body: bytes,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function startAndFinish(body: unknown, key: string) {
    const response = await gateway.call(startPath, post(body, key))
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ appId: "upscale", origin: "demo", count: 1 })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  it("makes one PNG from an image at 2x and keeps the inputs and the seed", async () => {
    const image = await upload(photo, "image/png")
    const done = await startAndFinish(
      { inputs: { mode: "image", image: [image] }, aspectRatio: "3:2" },
      "upscale-image-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      mode: "image",
      image: [image],
      scale: "2x",
      model: "seedvr2-3b",
    })
    expect(done.seed).toEqual(expect.any(Number))
    expect(done.aspectRatio).toBe("3:2")
    expect(done.outputs).toHaveLength(1)
    const outputId = done.outputs[0] ?? ""
    const asset = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "image",
      mime: "image/png",
      width: 1024,
      height: 682,
    })
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    expect(content.headers.get("content-type")).toBe("image/png")
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
  })

  it("ends a video run at 4x on the Real-ESRGAN model with one output", async () => {
    const video = await upload(clip, "video/mp4")
    const done = await startAndFinish(
      {
        inputs: {
          mode: "video",
          video: [video],
          scale: "4x",
          model: "real-esrgan-4x",
          seed: 7,
        },
        aspectRatio: "16:9",
      },
      "upscale-video-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      mode: "video",
      video: [video],
      scale: "4x",
      model: "real-esrgan-4x",
    })
    expect(done.seed).toBe(7)
    expect(done.outputs).toHaveLength(1)
  })

  it("refuses a scale the app does not list and starts nothing", async () => {
    const image = await upload(photo, "image/png")
    const response = await gateway.call(
      startPath,
      post(
        { inputs: { mode: "image", image: [image], scale: "8x" } },
        "upscale-scale-1"
      )
    )
    expect(response.status).toBe(400)
    const body = errorEnvelope.parse(await response.json())
    expect(body.error.code).toBe("RUN_INPUT_INVALID")
  })

  async function refused(body: unknown, key: string): Promise<string[]> {
    const response = await gateway.call(startPath, post(body, key))
    expect(response.status).toBe(400)
    const { error } = errorEnvelope.parse(await response.json())
    expect(error.code).toBe("RUN_INPUT_INVALID")
    const listed = await gateway.call(`${routes.listRuns.path}?appId=upscale`)
    return runPageResponse.parse(await listed.json()).runs.map((run) => run.id)
  }

  it("refuses an image run with no image and starts nothing", async () => {
    const runs = await refused({ inputs: { mode: "image" } }, "upscale-none-1")
    expect(runs).toEqual([])
  })

  it("refuses a video run that carries an image in place of a video", async () => {
    const image = await upload(photo, "image/png")
    const runs = await refused(
      { inputs: { mode: "video", image: [image] } },
      "upscale-wrong-1"
    )
    expect(runs).toEqual([])
  })

  it("refuses an image run that also carries a video", async () => {
    const image = await upload(photo, "image/png")
    const video = await upload(clip, "video/mp4")
    const runs = await refused(
      { inputs: { mode: "image", image: [image], video: [video] } },
      "upscale-both-1"
    )
    expect(runs).toEqual([])
  })

  it("refuses a second image in one run", async () => {
    const first = await upload(photo, "image/png")
    const second = await upload(photo, "image/png")
    const response = await gateway.call(
      startPath,
      post(
        { inputs: { mode: "image", image: [first, second] } },
        "upscale-two-1"
      )
    )
    expect(response.status).toBe(400)
  })
})
