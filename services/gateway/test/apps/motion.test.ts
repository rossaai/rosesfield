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
import { app } from "../../../../packages/catalog/src/motion/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes } from "../sample-apps"

function motionApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "motion", app }])
  if (parsed === undefined) {
    throw new Error("The motion app did not parse")
  }
  return parsed
}

const mp4Bytes = Uint8Array.of(
  0,
  0,
  0,
  24,
  102,
  116,
  121,
  112,
  105,
  115,
  111,
  109
)

describe("the motion app through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [motionApp()] })
    open.push(harness)
    return harness
  }

  async function upload(
    gateway: Harness,
    mime: string,
    body: Uint8Array
  ): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": mime },
      body: new Uint8Array(body),
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  function start(gateway: Harness, body: unknown) {
    return gateway.call(
      buildPath(routes.startRun.path, { appId: "motion" }),
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  it("runs a photo and a clip on LTX 2.3 control to one MP4 output in the ratio the run asked for", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, "image/png", pngBytes)
    const clip = await upload(gateway, "video/mp4", mp4Bytes)
    const response = await start(gateway, {
      inputs: {
        model: "ltx-2-3-control",
        photo: [photo],
        clip: [clip],
        scene: "A rooftop at noon",
      },
      aspectRatio: "9:16",
    })
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      count: 1,
      aspectRatio: "9:16",
    })
    expect(run.seed).toEqual(expect.any(Number))
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      example: "own",
      photo: [photo],
      clip: [clip],
      model: "ltx-2-3-control",
      sound: "off",
      scene: "A rooftop at noon",
      resolution: "720p",
    })
    expect(done.outputs).toHaveLength(1)
    const found = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: done.outputs[0] ?? "" })
    )
    const output = assetResponse.parse(await found.json()).asset
    expect(output).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      sourceRunId: run.id,
    })
    expect((output.height ?? 0) / (output.width ?? 1)).toBeCloseTo(16 / 9, 1)
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: output.id })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(4, 8))).toBe("ftyp")
  })

  it("keeps the sound choice, the resolution and a fixed seed on the run", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, "image/png", pngBytes)
    const clip = await upload(gateway, "video/mp4", mp4Bytes)
    const response = await start(gateway, {
      inputs: {
        model: "ltx-2-3-control",
        photo: [photo],
        clip: [clip],
        sound: "on",
        resolution: "480p",
        seed: 4242,
      },
    })
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run.seed).toBe(4242)
    expect(run.inputs).toMatchObject({ sound: "on", resolution: "480p" })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done).toMatchObject({ status: "done", seed: 4242, count: 1 })
    expect(done.outputs).toHaveLength(1)
  })

  it("runs a photo and a depth guide on the guide graph and keeps the model on the run", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, "image/png", pngBytes)
    const guide = await upload(gateway, "video/mp4", mp4Bytes)
    const response = await start(gateway, {
      inputs: {
        photo: [photo],
        clip: [guide],
        model: "ltx-2-3-guide",
        resolution: "480p",
      },
      aspectRatio: "9:16",
    })
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      clip: [guide],
      model: "ltx-2-3-guide",
      resolution: "480p",
    })
    expect(done.outputs).toHaveLength(1)
  })

  it("refuses a run without a clip, at 1080p on LTX 2.3 control, with two outputs, or your own video on LTX 2.5 in one run, before it starts", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, "image/png", pngBytes)
    const clip = await upload(gateway, "video/mp4", mp4Bytes)
    const ltx23 = { model: "ltx-2-3-control", photo: [photo], clip: [clip] }
    const bodies = [
      { inputs: { model: "ltx-2-3-control", photo: [photo] } },
      { inputs: { ...ltx23, resolution: "1080p" } },
      { inputs: ltx23, count: 2 },
      { inputs: { photo: [photo], clip: [clip] } },
    ]
    for (const body of bodies) {
      const response = await start(gateway, body)
      expect(response.status).toBe(400)
      const error = errorEnvelope.parse(await response.json()).error
      expect(error.code).toBe("RUN_INPUT_INVALID")
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })
})
