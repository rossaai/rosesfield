import { findApp } from "@rosesfield/catalog"
import {
  type AppDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

function voiceApp(): AppDefinition {
  const app = findApp("voice")
  if (app === null) {
    throw new Error("The catalog lists no voice app. Run bun run catalog:sync")
  }
  return app
}

const script =
  "The library opens at nine. Bring your card, and return the books you borrowed last month."
const wave = Uint8Array.of(82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69)

describe("the voice app through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [voiceApp()] })
    open.push(harness)
    return harness
  }

  function start(gateway: Harness, body: unknown, key = crypto.randomUUID()) {
    return gateway.call(
      buildPath(routes.startRun.path, { appId: "voice" }),
      jsonInit(body, { "Idempotency-Key": key })
    )
  }

  async function upload(gateway: Harness): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "audio/wav" },
      body: wave,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function finish(gateway: Harness, runId: string) {
    await gateway.drive(runId)
    const read = await gateway.call(buildPath(routes.getRun.path, { runId }))
    return runResponse.parse(await read.json()).run
  }

  it("speaks a script in Spanish at Count 3 and keeps 3 WAV outputs with the inputs", async () => {
    const gateway = openGateway()
    const response = await start(gateway, {
      inputs: { script, language: "es", expression: 0.8, seed: 41 },
      count: 3,
    })
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ status: "queued", origin: "demo", count: 3 })
    const done = await finish(gateway, run.id)
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      mode: "model",
      script,
      language: "es",
      expression: 0.8,
      seed: 41,
    })
    expect(done.seed).toBe(41)
    expect(done.outputs).toHaveLength(3)
    const assets = await Promise.all(
      done.outputs.map(async (assetId) => {
        const found = await gateway.call(
          buildPath(routes.getAsset.path, { assetId })
        )
        return assetResponse.parse(await found.json()).asset
      })
    )
    for (const asset of assets) {
      expect(asset).toMatchObject({
        kind: "audio",
        mime: "audio/wav",
        sourceRunId: run.id,
      })
      expect(asset.durationSeconds).toBeGreaterThan(0)
    }
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, {
        assetId: done.outputs[0] ?? "",
      })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe("WAVE")
  })

  it("speaks a script in the voice of a recording and keeps the recording with the run", async () => {
    const gateway = openGateway()
    const recordingId = await upload(gateway)
    const response = await start(gateway, {
      inputs: { mode: "recording", script, recording: [recordingId] },
      count: 2,
    })
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    const done = await finish(gateway, run.id)
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      mode: "recording",
      script,
      recording: [recordingId],
    })
    expect(done.outputs).toHaveLength(2)
  })

  it("refuses an empty script and a Count of 5 before a run starts", async () => {
    const gateway = openGateway()
    const empty = await start(gateway, { inputs: { script: "  " } })
    const tooMany = await start(gateway, { inputs: { script }, count: 5 })
    for (const response of [empty, tooMany]) {
      expect(response.status).toBe(400)
      const body = errorEnvelope.parse(await response.json())
      expect(body.error.code).toBe("RUN_INPUT_INVALID")
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a recording outside Use a recording and Use a recording without one", async () => {
    const gateway = openGateway()
    const recordingId = await upload(gateway)
    const missing = await start(gateway, {
      inputs: { mode: "recording", script },
    })
    const extra = await start(gateway, {
      inputs: { mode: "model", script, recording: [recordingId] },
    })
    for (const response of [missing, extra]) {
      expect(response.status).toBe(400)
      const body = errorEnvelope.parse(await response.json())
      expect(body.error.code).toBe("RUN_INPUT_INVALID")
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a language the list does not hold and a mode the app does not offer", async () => {
    const gateway = openGateway()
    const language = await start(gateway, {
      inputs: { script, language: "xx" },
    })
    const mode = await start(gateway, { inputs: { mode: "describe", script } })
    expect(language.status).toBe(400)
    expect(mode.status).toBe(400)
    expect(gateway.jobs.enqueued).toEqual([])
  })
})
