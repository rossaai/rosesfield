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
import { app } from "../../../../packages/catalog/src/angles/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes } from "../sample-apps"

const pngSignature = [137, 80, 78, 71]

function anglesApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "angles", app }])
  if (parsed === undefined) {
    throw new Error("The angles app did not parse")
  }
  return parsed
}

describe("an Angles run through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [anglesApp()] })
    open.push(harness)
    return harness
  }

  async function upload(gateway: Harness): Promise<string> {
    const answer = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(pngBytes),
    })
    expect(answer.status).toBe(201)
    return assetResponse.parse(await answer.json()).asset.id
  }

  function startRun(gateway: Harness, body: unknown): Promise<Response> {
    return gateway.call(
      buildPath(routes.startRun.path, { appId: "angles" }),
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  async function finished(gateway: Harness, runId: string) {
    await gateway.drive(runId)
    const read = await gateway.call(buildPath(routes.getRun.path, { runId }))
    return runResponse.parse(await read.json()).run
  }

  it("makes a set of 4 views with the defaults and keeps them with their seed", async () => {
    const gateway = openGateway()
    const imageId = await upload(gateway)
    const started = await startRun(gateway, {
      inputs: { image: [imageId] },
      aspectRatio: "3:4",
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      count: 4,
      aspectRatio: "3:4",
    })
    expect(run.inputs).toEqual({
      mode: "set",
      image: [imageId],
      angleSet: "turnaround",
      distance: "medium",
    })
    const done = await finished(gateway, run.id)
    expect(done.status).toBe("done")
    expect(done.seed).toBe(run.seed)
    expect(done.outputs).toHaveLength(4)
    const outputId = done.outputs[0] ?? ""
    const asset = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "image",
      mime: "image/png",
      sourceRunId: run.id,
    })
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(0, 4)]).toEqual(pngSignature)
  })

  it("makes one view with a fixed seed when the caller sends no count", async () => {
    const gateway = openGateway()
    const imageId = await upload(gateway)
    const started = await startRun(gateway, {
      inputs: {
        mode: "single",
        image: [imageId],
        side: "back",
        height: "low",
        distance: "close",
        seed: 77,
      },
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run.seed).toBe(77)
    expect(run.count).toBe(1)
    expect(run.inputs).toEqual({
      mode: "single",
      image: [imageId],
      side: "back",
      height: "low",
      distance: "close",
      seed: 77,
    })
    const done = await finished(gateway, run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(1)
  })

  it("refuses a count the mode does not make and starts no run, the control", async () => {
    const gateway = openGateway()
    const imageId = await upload(gateway)
    const bodies = [
      { inputs: { mode: "set", image: [imageId] }, count: 1 },
      { inputs: { mode: "single", image: [imageId] }, count: 4 },
    ]
    for (const body of bodies) {
      const refused = await startRun(gateway, body)
      expect(refused.status).toBe(400)
      expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
        "RUN_INPUT_INVALID"
      )
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a view input of the other mode and starts no run, the control", async () => {
    const gateway = openGateway()
    const imageId = await upload(gateway)
    const bodies = [
      { inputs: { mode: "single", image: [imageId], angleSet: "heights" } },
      { inputs: { mode: "set", image: [imageId], side: "back" } },
      { inputs: { image: [imageId], height: "low" } },
      { inputs: { image: [imageId], model: "qwen-image-edit-2511" } },
    ]
    for (const body of bodies) {
      const refused = await startRun(gateway, body)
      expect(refused.status).toBe(400)
      expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
        "RUN_INPUT_INVALID"
      )
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a run with no image and starts none", async () => {
    const gateway = openGateway()
    const refused = await startRun(gateway, { inputs: { mode: "set" } })
    expect(refused.status).toBe(400)
    expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a side outside the 8 sides", async () => {
    const gateway = openGateway()
    const imageId = await upload(gateway)
    const refused = await startRun(gateway, {
      inputs: { mode: "single", image: [imageId], side: "top" },
    })
    expect(refused.status).toBe(400)
  })
})
