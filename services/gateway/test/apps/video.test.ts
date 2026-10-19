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
import { app } from "../../../../packages/catalog/src/video/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes } from "../sample-apps"

const startPath = buildPath(routes.startRun.path, { appId: "video" })
const clipBytes = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73)

function videoApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "video", app }])
  if (parsed === undefined) {
    throw new Error("The video app did not parse")
  }
  return parsed
}

describe("the video app through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [videoApp()] })
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
      startPath,
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  async function finished(gateway: Harness, response: Response) {
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  async function assetOf(gateway: Harness, assetId: string) {
    const found = await gateway.call(
      buildPath(routes.getAsset.path, { assetId })
    )
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    return {
      asset: assetResponse.parse(await found.json()).asset,
      brand: new TextDecoder().decode(bytes.slice(4, 8)),
    }
  }

  it("makes an MP4 on the LTX 2.5 graph from a start frame at the format the run asked for", async () => {
    const gateway = openGateway()
    const frame = await upload(gateway, "image/png", pngBytes)
    const run = await finished(
      gateway,
      await start(gateway, {
        inputs: {
          prompt: "a paper boat drifts across a pond",
          model: "ltx-2-5",
          startFrame: [frame],
          cameraMove: "push-in",
          length: 3,
        },
        aspectRatio: "9:16",
      })
    )
    expect(run).toMatchObject({
      status: "done",
      origin: "demo",
      count: 1,
      aspectRatio: "9:16",
      inputs: {
        startFrame: [frame],
        model: "ltx-2-5",
        cameraMove: "push-in",
        length: 3,
        resolution: "480p",
        sound: "on",
      },
    })
    expect(run.seed).toEqual(expect.any(Number))
    expect(run.outputs).toHaveLength(1)
    for (const outputId of run.outputs) {
      const { asset, brand } = await assetOf(gateway, outputId)
      expect(asset).toMatchObject({
        kind: "video",
        mime: "video/mp4",
        sourceRunId: run.id,
      })
      expect(asset.height ?? 0).toBeGreaterThan(asset.width ?? Infinity)
      expect(brand).toBe("ftyp")
    }
  })

  it.each([
    { name: "a Wan model", inputs: { model: "wan-2-2" } },
    { name: "a clip", inputs: { model: "ltx-2-5", clip: "clip" } },
    { name: "a count of 2", inputs: { model: "ltx-2-5" }, count: 2 },
  ])("refuses $name and starts nothing", async ({ inputs, count }) => {
    const gateway = openGateway()
    const clip = await upload(gateway, "video/mp4", clipBytes)
    const response = await start(gateway, {
      inputs: {
        prompt: "a red kite",
        ...inputs,
        ...("clip" in inputs ? { clip: [clip] } : {}),
      },
      ...(count === undefined ? {} : { count }),
    })
    expect(response.status).toBe(400)
    const { error } = errorEnvelope.parse(await response.json())
    expect(error.code).toBe("RUN_INPUT_INVALID")
    expect(gateway.jobs.enqueued).toEqual([])
  })
})
