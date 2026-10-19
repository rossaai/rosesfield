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
import { app } from "../../../../packages/catalog/src/effects/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes } from "../sample-apps"

function effectsApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "effects", app }])
  if (parsed === undefined) {
    throw new Error("The effects app did not parse")
  }
  return parsed
}

describe("the effects app through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [effectsApp()] })
    open.push(harness)
    return harness
  }

  async function uploadPhoto(gateway: Harness): Promise<string> {
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
      buildPath(routes.startRun.path, { appId: "effects" }),
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  it("runs a photo to one MP4 in the library at the ratio the run asked for", async () => {
    const gateway = openGateway()
    const photo = await uploadPhoto(gateway)
    const started = await start(gateway, {
      inputs: {
        effect: "frost-over",
        image: [photo],
        prompt: "a red scarf",
        length: 3,
      },
      aspectRatio: "9:16",
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      aspectRatio: "9:16",
      inputs: {
        effect: "frost-over",
        image: [photo],
        prompt: "a red scarf",
        length: 3,
        resolution: "720p",
        sound: "off",
      },
    })
    expect(run.seed).toEqual(expect.any(Number))
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(1)
    const outputId = done.outputs[0] ?? ""
    const found = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await found.json()).asset).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      sourceRunId: run.id,
      width: 360,
      height: 640,
    })
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(4, 8))).toBe("ftyp")
  })

  it("runs an effect with no sound line and records no sound for it", async () => {
    const gateway = openGateway()
    const photo = await uploadPhoto(gateway)
    const started = await start(gateway, {
      inputs: { effect: "living-photo", image: [photo], resolution: "480p" },
      aspectRatio: "1:1",
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run.inputs).toEqual({
      effect: "living-photo",
      image: [photo],
      length: 5,
      resolution: "480p",
    })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    expect(runResponse.parse(await read.json()).run.status).toBe("done")
  })

  it("refuses sound for an effect with no sound line and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await uploadPhoto(gateway)
    const response = await start(gateway, {
      inputs: { effect: "living-photo", image: [photo], sound: "off" },
      aspectRatio: "1:1",
    })
    expect(response.status).toBe(400)
    const { error } = errorEnvelope.parse(await response.json())
    expect(error.code).toBe("RUN_INPUT_INVALID")
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a run with no photo and starts nothing", async () => {
    const gateway = openGateway()
    const response = await start(gateway, { inputs: { effect: "frost-over" } })
    expect(response.status).toBe(400)
    const { error } = errorEnvelope.parse(await response.json())
    expect(error.code).toBe("RUN_INPUT_INVALID")
    expect(gateway.jobs.enqueued).toEqual([])
  })
})
