import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  appDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/image/app"
import { localEnv } from "../server-env"

const startPath = buildPath(routes.startRun.path, { appId: "image" })
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const localHost = { host: "127.0.0.1:8787" }

type Call = {
  method?: string
  headers?: Record<string, string>
  body?: string | Uint8Array
}

function readPngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function postJson(body: unknown, headers: Record<string, string> = {}): Call {
  return {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }
}

describe("an Image run through the local gateway on the demo engine", () => {
  const clock = new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") })
  let folder = ""
  let gateway: LocalGateway

  afterEach(() => {
    gateway.jobs.stop()
    rmSync(folder, { recursive: true, force: true })
  })

  function open(): void {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-image-"))
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [appDefinition.parse(app)],
      clock,
      platformRoot: null,
    })
  }

  async function call(path: string, init: Call = {}): Promise<Response> {
    return gateway.app.request(path, {
      ...init,
      headers: { ...localHost, ...init.headers },
    })
  }

  async function drive(runId: string): Promise<void> {
    gateway.jobs.stop()
    for (let step = 0; step < 20; step += 1) {
      const { nextWakeMs } = await gateway.handlers.advanceRun.execute({
        runId: runIdFormat.parse(runId),
      })
      if (nextWakeMs === null) {
        return
      }
      clock.advance(nextWakeMs)
    }
    throw new Error(`Run ${runId} did not end in 20 steps`)
  }

  async function upload(): Promise<string> {
    const response = await call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: Uint8Array.of(...pngSignature, 0, 0, 0, 13),
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  it("makes 4 images in the 16:9 format and keeps them in the library", async () => {
    open()
    const response = await call(
      startPath,
      postJson(
        {
          inputs: { prompt: "a lighthouse at dawn" },
          count: 4,
          aspectRatio: "16:9",
        },
        { "idempotency-key": "image-run-1" }
      )
    )
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({
      appId: "image",
      status: "queued",
      origin: "demo",
      count: 4,
      aspectRatio: "16:9",
    })
    expect(run.seed).toEqual(expect.any(Number))
    await drive(run.id)

    const read = await call(buildPath(routes.getRun.path, { runId: run.id }))
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(4)
    expect(done.inputs).toEqual({
      prompt: "a lighthouse at dawn",
      model: "flux-2-klein-4b",
      resolution: "1k",
    })
    expect(done.seed).toBe(run.seed)
    for (const outputId of done.outputs) {
      const content = await call(
        buildPath(routes.readAssetContent.path, { assetId: outputId })
      )
      expect(content.headers.get("content-type")).toBe("image/png")
      const bytes = new Uint8Array(await content.arrayBuffer())
      expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
      const size = readPngSize(bytes)
      expect(Math.abs(size.width / size.height - 16 / 9)).toBeLessThan(
        (16 / 9) * 0.02
      )
    }
  })

  it("runs Z-Image Turbo at 2K and records the model and the resolution", async () => {
    open()
    const response = await call(
      startPath,
      postJson(
        {
          inputs: {
            prompt: "a field of roses",
            model: "z-image-turbo",
            resolution: "2k",
          },
          count: 2,
          aspectRatio: "3:4",
        },
        { "idempotency-key": "image-run-2" }
      )
    )
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    await drive(run.id)
    const read = await call(buildPath(routes.getRun.path, { runId: run.id }))
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(2)
    expect(done.inputs).toEqual({
      prompt: "a field of roses",
      model: "z-image-turbo",
      resolution: "2k",
    })
  })

  it("refuses 2K on a model that runs 1K only, before a run starts", async () => {
    open()
    const response = await call(
      startPath,
      postJson({
        inputs: {
          prompt: "a quiet harbour",
          model: "flux-2-klein-4b",
          resolution: "2k",
        },
      })
    )
    expect(response.status).toBe(400)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
    const runs = await call(routes.listRuns.path)
    expect(runs.status).toBe(200)
    expect(JSON.stringify(await runs.json())).not.toContain("a quiet harbour")
  })

  it("refuses a reference before a run starts, because no bound model takes one", async () => {
    open()
    const reference = await upload()
    const response = await call(
      startPath,
      postJson({ inputs: { prompt: "a door", references: [reference] } })
    )
    expect(response.status).toBe(400)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
    const runs = await call(routes.listRuns.path)
    expect(runs.status).toBe(200)
    expect(JSON.stringify(await runs.json())).not.toContain("a door")
  })
})
