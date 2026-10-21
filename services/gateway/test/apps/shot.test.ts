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
import type { Fetch } from "@rosesfield/generation"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/shot/app"
import { comfyCloud, localEnv } from "../server-env"

const host = { host: "127.0.0.1:8787" }
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const mp4Brand = [0x66, 0x74, 0x79, 0x70]

type Submitted = {
  idempotencyKey: string | null
  seed: unknown
  movement: unknown
  color: unknown
}

function valueAt(value: unknown, path: readonly string[]): unknown {
  let current = value
  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return undefined
    }
    current = Object.getOwnPropertyDescriptor(current, key)?.value
  }
  return current
}

function replayedComfy(): { fetch: Fetch; jobs: Submitted[] } {
  const jobs: Submitted[] = []
  const fetch: Fetch = async (input, init) => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(String(input), init)
    const path = new URL(request.url).pathname
    if (request.method === "POST" && path === "/api/v2/assets") {
      return Response.json(
        { id: crypto.randomUUID(), content_type: "image/png" },
        { status: 201 }
      )
    }
    if (request.method === "POST" && path === "/api/v2/jobs") {
      const body: unknown = await request.json()
      jobs.push({
        idempotencyKey: request.headers.get("idempotency-key"),
        seed: valueAt(body, ["workflow", "339", "inputs", "noise_seed"]),
        movement: valueAt(body, ["workflow", "952", "inputs", "string_b"]),
        color: valueAt(body, ["workflow", "957", "inputs", "string_b"]),
      })
      return Response.json(
        { id: crypto.randomUUID(), status: "queued", outputs: [] },
        { status: 201 }
      )
    }
    throw new Error(`No recording for ${request.method} ${path}`)
  }
  return { fetch, jobs }
}

describe("a Shot run through the gateway on the demo engine", () => {
  let folder: string
  let clock: FixedClock
  let gateway: LocalGateway

  async function compose(options: { comfy?: Fetch } = {}): Promise<void> {
    gateway.jobs.stop()
    await gateway.close()
    const env =
      options.comfy === undefined
        ? localEnv(folder)
        : localEnv(folder, comfyCloud("comfyui-test"))
    gateway = composeLocalGateway({
      env,
      apps: [appDefinition.parse(app)],
      clock,
      platformRoot: null,
      ...(options.comfy === undefined ? {} : { fetch: options.comfy }),
    })
  }

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-shot-"))
    clock = new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") })
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [appDefinition.parse(app)],
      clock,
      platformRoot: null,
    })
  })

  afterEach(() => {
    gateway.jobs.stop()
    rmSync(folder, { recursive: true, force: true })
  })

  async function call(path: string, init: RequestInit = {}) {
    return gateway.app.request(path, {
      ...init,
      headers: { ...host, ...init.headers },
    })
  }

  async function startRun(body: unknown): Promise<Response> {
    return call(buildPath(routes.startRun.path, { appId: "shot" }), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
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

  async function finished(runId: string) {
    await drive(runId)
    const read = await call(buildPath(routes.getRun.path, { runId }))
    return runResponse.parse(await read.json()).run
  }

  it("starts a run with the defaults and keeps one video with its seed", async () => {
    const started = await startRun({
      inputs: { prompt: "A woman crosses a rainy street at night" },
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      count: 1,
      aspectRatio: "16:9",
      inputs: {
        model: "ltx-2-5",
        movement: "auto",
        length: 5,
        resolution: "480p",
        sound: "on",
        startFrame: [],
      },
    })
    expect(run.seed).not.toBeNull()
    const done = await finished(run.id)
    expect(done.status).toBe("done")
    expect(done.seed).toBe(run.seed)
    expect(done.outputs).toHaveLength(1)
    const outputId = done.outputs[0] ?? ""
    const asset = await call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      sourceRunId: run.id,
    })
    const content = await call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(4, 8)]).toEqual(mp4Brand)
  })

  async function uploadFrame(): Promise<string> {
    const upload = await call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: photo,
    })
    expect(upload.status).toBe(201)
    return assetResponse.parse(await upload.json()).asset.id
  }

  async function expectRefused(body: unknown): Promise<void> {
    const refused = await startRun(body)
    expect(refused.status).toBe(400)
    expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
  }

  it("runs LTX 2.5 with a start frame and keeps four videos for a count of 4", async () => {
    const frameId = await uploadFrame()
    const started = await startRun({
      inputs: {
        prompt: "A boat leaves the harbor",
        movement: "push-in",
        color: "black-and-white",
        startFrame: [frameId],
        seed: 77,
      },
      count: 4,
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run.seed).toBe(77)
    expect(run.inputs).toMatchObject({ model: "ltx-2-5", movement: "push-in" })
    const done = await finished(run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(4)
  })

  it("refuses the Wan camera model and what Video's graphs cannot take, and starts no run", async () => {
    const frameId = await uploadFrame()
    const scene = "A boat leaves the harbor"
    await expectRefused({
      inputs: {
        prompt: scene,
        model: "wan-2-2-fun-camera",
        startFrame: [frameId],
      },
    })
    await expectRefused({ inputs: { prompt: scene, resolution: "1080p" } })
    await expectRefused({ inputs: { prompt: scene, length: 8 } })
    await expectRefused({ inputs: { prompt: scene, movement: "orbit" } })
    const list = await call(routes.listRuns.path)
    expect(await list.json()).toMatchObject({ runs: [] })
  })

  it("submits one job per output on a replayed Comfy engine, each with its own seed and the shot words", async () => {
    const comfy = replayedComfy()
    await compose({ comfy: comfy.fetch })
    const frameId = await uploadFrame()
    const started = await startRun({
      inputs: {
        prompt: "A boat leaves the harbor",
        movement: "push-in",
        color: "black-and-white",
        startFrame: [frameId],
        seed: 77,
      },
      count: 4,
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    gateway.jobs.stop()
    await gateway.handlers.advanceRun.execute({
      runId: runIdFormat.parse(run.id),
    })
    expect(comfy.jobs.map((job) => job.seed)).toEqual([77, 78, 79, 80])
    expect(new Set(comfy.jobs.map((job) => job.idempotencyKey)).size).toBe(4)
    expect(comfy.jobs[0]).toMatchObject({
      movement: " The camera moves slowly toward the subject.",
      color: " Black and white, with no color.",
    })
  })

  it("refuses an empty scene, the control", async () => {
    const refused = await startRun({ inputs: { prompt: "   " } })
    expect(refused.status).toBe(400)
    expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
  })
})
