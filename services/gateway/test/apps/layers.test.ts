import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type AppDefinition,
  appDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  type InputDefinition,
  type Run,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/layers/app"
import { localEnv } from "../server-env"

const host = { host: "127.0.0.1:8787" }
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

const definition = appDefinition.parse(app)

function withoutRules(input: InputDefinition): InputDefinition {
  switch (input.type) {
    case "seed":
      return input
    case "choice": {
      const { when: _, bounds: _bounds, ...rest } = input
      const options = rest.options.map(({ count: _count, ...option }) => option)
      return { ...rest, options }
    }
    case "number":
    case "toggle": {
      const { when: _, bounds: _bounds, ...rest } = input
      return rest
    }
    default: {
      const { when: _, ...rest } = input
      return { ...rest, presence: "optional" }
    }
  }
}

const loose: AppDefinition = appDefinition.parse({
  ...definition,
  inputs: definition.inputs.map(withoutRules),
})

type Harness = {
  call: (path: string, init?: RequestInit) => Promise<Response>
  upload: () => Promise<string>
  startRun: (body: unknown, key: string) => Promise<Response>
  drive: (runId: string) => Promise<Run>
  runCount: () => Promise<number>
}

function useGateway(served: AppDefinition): Harness {
  let folder = ""
  let clock: FixedClock
  let gateway: LocalGateway

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-layers-"))
    clock = new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") })
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [served],
      clock,
      platformRoot: null,
    })
    gateway.jobs.stop()
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

  return {
    call,
    upload: async () => {
      const response = await call(routes.uploadAsset.path, {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: photo,
      })
      expect(response.status).toBe(201)
      return assetResponse.parse(await response.json()).asset.id
    },
    startRun: (body, key) =>
      call(buildPath(routes.startRun.path, { appId: "layers" }), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": key,
        },
        body: JSON.stringify(body),
      }),
    drive: async (runId) => {
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
    },
    runCount: async () => {
      const response = await call(`${routes.listRuns.path}?appId=layers`)
      return runPageResponse.parse(await response.json()).runs.length
    },
  }
}

describe("a Layers run through the gateway on the demo engine", () => {
  const gateway = useGateway(definition)

  async function startAndFinish(body: unknown, key: string): Promise<Run> {
    const response = await gateway.startRun(body, key)
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ appId: "layers", origin: "demo" })
    return gateway.drive(run.id)
  }

  async function expectPng(assetId: string, runId: string): Promise<void> {
    const asset = await gateway.call(
      buildPath(routes.getAsset.path, { assetId })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "image",
      mime: "image/png",
      sourceRunId: runId,
    })
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId })
    )
    expect(content.headers.get("content-type")).toBe("image/png")
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
  }

  async function refusedWith(body: unknown, key: string): Promise<string> {
    const response = await gateway.startRun(body, key)
    expect(response.status, JSON.stringify(body)).toBe(400)
    return errorEnvelope.parse(await response.json()).error.code
  }

  it("splits an image into 4 layers at Draft and keeps each one in the library", async () => {
    const source = await gateway.upload()
    const done = await startAndFinish(
      { inputs: { source: [source] }, count: 4, aspectRatio: "4:3" },
      "layers-split-1"
    )
    expect(done.status).toBe("done")
    expect(done).toMatchObject({ count: 4, aspectRatio: "4:3" })
    expect(done.inputs).toEqual({
      mode: "split",
      count: "4",
      source: [source],
      quality: "draft",
    })
    expect(done.seed).toEqual(expect.any(Number))
    expect(done.outputs).toHaveLength(4)
    expect(new Set(done.outputs).size).toBe(4)
    await Promise.all(done.outputs.map((id) => expectPng(id, done.id)))
  })

  it("splits into 2 layers and into 8 when the layer count says so", async () => {
    const source = await gateway.upload()
    for (const layers of [2, 8]) {
      const done = await startAndFinish(
        { inputs: { source: [source], count: String(layers) } },
        `layers-split-${layers}`
      )
      expect(done.count).toBe(layers)
      expect(done.outputs).toHaveLength(layers)
    }
  })

  it("relights one layer and returns one output with the relight inputs only", async () => {
    const layer = await gateway.upload()
    const done = await startAndFinish(
      { inputs: { mode: "relight", layer: [layer], light: "top" } },
      "layers-relight-1"
    )
    expect(done.status).toBe("done")
    expect(done.count).toBe(1)
    expect(done.inputs).toEqual({
      mode: "relight",
      count: "1",
      layer: [layer],
      light: "top",
      tone: "auto",
      quality: "draft",
    })
    expect(done.outputs).toHaveLength(1)
    await expectPng(done.outputs[0] ?? "", done.id)
  })

  it("fills a painted area of one layer and returns one output", async () => {
    const layer = await gateway.upload()
    const mask = await gateway.upload()
    const done = await startAndFinish(
      {
        inputs: { mode: "fill", layer: [layer], mask: [mask] },
        count: 1,
      },
      "layers-fill-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({ mode: "fill", mask: [mask] })
    expect(done.outputs).toHaveLength(1)
  })

  it("refuses 9 layers, an edit of 5, and each input missing or out of its mode, and starts nothing", async () => {
    const image = await gateway.upload()
    const bodies = [
      { inputs: { source: [image] }, count: 9 },
      { inputs: { source: [image], count: "1" } },
      { inputs: { mode: "edit", layer: [image], change: "a hat" }, count: 5 },
      { inputs: { mode: "edit", change: "a hat" } },
      { inputs: { mode: "edit", layer: [image] } },
      { inputs: { mode: "fill", layer: [image] } },
      { inputs: { mode: "relight", layer: [image], change: "a hat" } },
      { inputs: { source: [image], light: "top" } },
    ]
    for (const [index, body] of bodies.entries()) {
      expect(await refusedWith(body, `layers-refused-${index}`)).toBe(
        "RUN_INPUT_INVALID"
      )
    }
    expect(await gateway.runCount()).toBe(0)
  })
})

describe("control: a gateway serving Layers without its mode rules", () => {
  const gateway = useGateway(loose)

  it("starts an edit of 5 outputs and an edit with no layer", async () => {
    const image = await gateway.upload()
    const five = await gateway.startRun(
      { inputs: { mode: "edit", layer: [image], change: "a hat" }, count: 5 },
      "layers-control-1"
    )
    expect(five.status).toBe(202)
    const empty = await gateway.startRun(
      { inputs: { mode: "edit", change: "a hat" } },
      "layers-control-2"
    )
    expect(empty.status).toBe(202)
  })
})
