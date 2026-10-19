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
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/headshots/app"
import { localEnv } from "../server-env"

const host = { host: "127.0.0.1:8787" }
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const pngSignature = [137, 80, 78, 71]

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

describe("a Headshots run through the gateway on the demo engine", () => {
  let folder: string
  let clock: FixedClock
  let gateway: LocalGateway

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-headshots-"))
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

  async function upload(): Promise<string> {
    const answer = await call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: photo,
    })
    expect(answer.status).toBe(201)
    return assetResponse.parse(await answer.json()).asset.id
  }

  async function startRun(body: unknown): Promise<Response> {
    return call(buildPath(routes.startRun.path, { appId: "headshots" }), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  async function finished(runId: string) {
    gateway.jobs.stop()
    for (let step = 0; step < 20; step += 1) {
      const { nextWakeMs } = await gateway.handlers.advanceRun.execute({
        runId: runIdFormat.parse(runId),
      })
      if (nextWakeMs === null) {
        const read = await call(buildPath(routes.getRun.path, { runId }))
        return runResponse.parse(await read.json()).run
      }
      clock.advance(nextWakeMs)
    }
    throw new Error(`Run ${runId} did not end in 20 steps`)
  }

  async function contentOf(assetId: string): Promise<Uint8Array> {
    const content = await call(
      buildPath(routes.readAssetContent.path, { assetId })
    )
    return new Uint8Array(await content.arrayBuffer())
  }

  it("makes 2 square headshots with the defaults and keeps them with their seed", async () => {
    const imageId = await upload()
    const started = await startRun({ inputs: { image: [imageId] } })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      count: 2,
      aspectRatio: "1:1",
      inputs: {
        image: [imageId],
        background: "grey",
        clothes: "keep",
        framing: "standard",
        keepGlasses: "on",
      },
    })
    const done = await finished(run.id)
    expect(done.status).toBe("done")
    expect(done.seed).toBe(run.seed)
    expect(done.outputs).toHaveLength(2)
    const outputId = done.outputs[0] ?? ""
    const asset = await call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "image",
      mime: "image/png",
      sourceRunId: run.id,
    })
    const bytes = await contentOf(outputId)
    expect([...bytes.slice(0, 4)]).toEqual(pngSignature)
    expect(pngSize(bytes)).toEqual({ width: 1024, height: 1024 })
  })

  it("makes 4 headshots in 3:4 with a fixed seed", async () => {
    const imageId = await upload()
    const started = await startRun({
      inputs: {
        image: [imageId],
        background: "office",
        clothes: "jacket",
        framing: "close",
        keepGlasses: "off",
        seed: 77,
      },
      count: 4,
      aspectRatio: "3:4",
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run.seed).toBe(77)
    const done = await finished(run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(4)
    const size = pngSize(await contentOf(done.outputs[3] ?? ""))
    expect(size.width / size.height).toBeCloseTo(3 / 4, 2)
  })

  it("refuses a run with no photo and starts none, the control", async () => {
    const refused = await startRun({ inputs: { background: "white" } })
    expect(refused.status).toBe(400)
    expect(errorEnvelope.parse(await refused.json()).error.code).toBe(
      "RUN_INPUT_INVALID"
    )
    const list = await call(routes.listRuns.path)
    expect(await list.json()).toMatchObject({ runs: [] })
  })

  it("refuses each run the contract refuses and stores none", async () => {
    const imageId = await upload()
    const otherId = await upload()
    const bodies = [
      { inputs: { image: [imageId] }, count: 5 },
      { inputs: { image: [imageId] }, count: 0 },
      { inputs: { image: [imageId] }, aspectRatio: "16:9" },
      { inputs: { image: [imageId], background: "beach" } },
      { inputs: { image: [imageId], clothes: "suit" } },
      { inputs: { image: [imageId], framing: "full" } },
      { inputs: { image: [imageId], keepGlasses: "yes" } },
      { inputs: { image: [imageId], model: "nano-banana-pro" } },
      { inputs: { image: [imageId, otherId] } },
    ]
    const refusals = await Promise.all(bodies.map((body) => startRun(body)))
    expect(refusals.map((answer) => answer.status)).toEqual(
      bodies.map(() => 400)
    )
    const codes = await Promise.all(
      refusals.map(
        async (answer) => errorEnvelope.parse(await answer.json()).error.code
      )
    )
    expect(new Set(codes)).toEqual(new Set(["RUN_INPUT_INVALID"]))
    const list = await call(routes.listRuns.path)
    expect(await list.json()).toMatchObject({ runs: [] })
  })

  it("starts a count of 5 on a planted definition that allows it, the control", async () => {
    gateway.jobs.stop()
    const parsed = appDefinition.parse(app)
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [
        appDefinition.parse({
          ...parsed,
          output: { ...parsed.output, count: { default: 2, max: 5 } },
        }),
      ],
      clock,
      platformRoot: null,
    })
    const imageId = await upload()
    const started = await startRun({ inputs: { image: [imageId] }, count: 5 })
    expect(started.status).toBe(202)
  })
})
