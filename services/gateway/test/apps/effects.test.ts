import type { AgentToolHandlers } from "@rosesfield/agent"
import { agentTools } from "@rosesfield/agent"
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
import { runIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"
import {
  app,
  effectsApp,
  runLimitSeconds,
} from "../../../../packages/catalog/src/effects/app"
import { passedRecipe } from "../../../../packages/catalog/test/effects/passed-recipe"
import { type Harness, harnessFor, jsonInit, type PortsFor } from "../harness"
import { localPorts } from "../local-ports"
import {
  jobId,
  livePorts,
  pngOf,
  replayedComfy,
  uploadedId,
} from "./effects-comfy"

const videoModel =
  "ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors"

function parsed(input: unknown): AppDefinition {
  const [one] = readApps([{ folder: "effects", app: input as typeof app }])
  if (one === undefined) {
    throw new Error("The effects app did not parse")
  }
  return one
}

function openApp(): AppDefinition {
  return parsed(
    effectsApp([passedRecipe("push-into-eye"), passedRecipe("many-copies")])
  )
}

const rpcReply = z.object({
  result: z.record(z.string(), z.unknown()).optional(),
})

describe("the effects app through the gateway", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(
    effects: AppDefinition = openApp(),
    portsFor: PortsFor = localPorts
  ): Harness {
    const harness = harnessFor({ portsFor, apps: [effects] })
    open.push(harness)
    return harness
  }

  async function upload(
    gateway: Harness,
    bytes: Uint8Array,
    mime = "image/png"
  ): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": mime },
      body: bytes,
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

  async function started(gateway: Harness, body: unknown) {
    const response = await start(gateway, body)
    expect(response.status).toBe(202)
    return runResponse.parse(await response.json()).run
  }

  async function readRun(gateway: Harness, runId: string) {
    const read = await gateway.call(buildPath(routes.getRun.path, { runId }))
    return runResponse.parse(await read.json()).run
  }

  async function refused(
    gateway: Harness,
    inputs: Record<string, unknown>
  ): Promise<{ code: string }> {
    const response = await start(gateway, { inputs, aspectRatio: "1:1" })
    expect({ inputs, status: response.status }).toEqual({
      inputs,
      status: 400,
    })
    expect(gateway.jobs.enqueued).toEqual([])
    return errorEnvelope.parse(await response.json()).error
  }

  async function mcp(gateway: Harness, method: string, params: object) {
    const response = await gateway.call(
      "/mcp",
      jsonInit(
        { jsonrpc: "2.0", id: 1, method, params },
        {
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-06-18",
        }
      )
    )
    const text = await response.text()
    const data = text
      .split("\n")
      .find((line) => line.startsWith("data: "))
      ?.slice("data: ".length)
    return rpcReply.parse(JSON.parse(data ?? text)).result ?? {}
  }

  it("runs a photo to one MP4 in the library at the ratio the run asked for", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      inputs: {
        effect: "push-into-eye",
        image: [photo],
        prompt: "a red scarf",
      },
      aspectRatio: "9:16",
    })
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      aspectRatio: "9:16",
      inputs: {
        effect: "push-into-eye",
        image: [photo],
        prompt: "a red scarf",
        resolution: "720p",
      },
    })
    await gateway.drive(run.id)
    const done = await readRun(gateway, run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(1)
    const found = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: done.outputs[0] ?? "" })
    )
    expect(assetResponse.parse(await found.json()).asset).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      sourceRunId: run.id,
    })
  })

  it("lands a Comfy run in the library and History with its effect, model, seed and credits", async () => {
    const comfy = replayedComfy("succeeded")
    const gateway = openGateway(openApp(), livePorts(comfy))
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      inputs: { effect: "push-into-eye", image: [photo] },
      aspectRatio: "9:16",
    })
    await gateway.drive(run.id)
    const [graph] = comfy.graphs
    expect(comfy.graphs).toHaveLength(1)
    expect(graph).toMatchObject({
      "395": { inputs: { image: { info: { id: uploadedId } } } },
      "605": { inputs: { image: ["395", 0] } },
      "351": { inputs: { input: ["616", 0] } },
      "349": { inputs: { image: ["350", 0], strength: 1 } },
      "339": { inputs: { noise_seed: run.seed } },
      "615": { inputs: { seed: run.seed } },
      "626": { inputs: { seed: run.seed } },
    })
    const history = await gateway.call(routes.listRuns.path)
    const { runs } = runPageResponse.parse(await history.json())
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({
      id: run.id,
      status: "done",
      origin: "live",
      inputs: { effect: "push-into-eye" },
      seed: run.seed,
      engine: { models: expect.arrayContaining([videoModel]) },
      cost: { amount: 1.055 / 211, currency: "USD" },
    })
    expect(runs[0]?.engine.models[0]).toBe(videoModel)
    const found = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: runs[0]?.outputs[0] ?? "" })
    )
    expect(assetResponse.parse(await found.json()).asset).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      sourceRunId: run.id,
    })
  })

  it("ends a run its engine has not finished in 180 seconds, and submits it once", async () => {
    const comfy = replayedComfy("running")
    const gateway = openGateway(openApp(), livePorts(comfy))
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      inputs: { effect: "push-into-eye", image: [photo] },
      aspectRatio: "9:16",
    })
    const runId = runIdFormat.parse(run.id)
    await gateway.handlers.advanceRun.execute({ runId })
    expect(comfy.graphs).toHaveLength(1)
    gateway.clock.advance((runLimitSeconds - 1) * 1000)
    await gateway.handlers.advanceRun.execute({ runId })
    expect((await readRun(gateway, run.id)).status).toBe("running")
    gateway.clock.advance(2000)
    await gateway.drive(run.id)
    const ended = await readRun(gateway, run.id)
    expect(ended.status).toBe("failed")
    expect(ended.failure?.code).toBe("RUN_TIMED_OUT")
    expect(comfy.graphs).toHaveLength(1)
    expect(comfy.sent).toContain(`POST /api/v2/jobs/${jobId}/cancel`)
  })

  it("runs the same effect on another photo, and another effect on the same photo, from a result", async () => {
    const gateway = openGateway()
    const first = await upload(gateway, pngOf(1080, 1920))
    const second = await upload(gateway, pngOf(1200, 1600))
    const run = await started(gateway, {
      inputs: { effect: "push-into-eye", image: [first] },
      aspectRatio: "9:16",
    })
    await gateway.drive(run.id)
    const result = await readRun(gateway, run.id)
    expect(result.status).toBe("done")
    const samePhoto = await started(gateway, {
      inputs: { ...result.inputs, effect: "many-copies" },
      aspectRatio: result.aspectRatio,
    })
    expect(samePhoto.inputs).toMatchObject({
      effect: "many-copies",
      image: [first],
    })
    const sameEffect = await started(gateway, {
      inputs: { ...result.inputs, image: [second] },
      aspectRatio: result.aspectRatio,
    })
    expect(sameEffect.inputs).toMatchObject({
      effect: "push-into-eye",
      image: [second],
    })
    await gateway.drive(samePhoto.id)
    await gateway.drive(sameEffect.id)
    expect((await readRun(gateway, samePhoto.id)).status).toBe("done")
    expect((await readRun(gateway, sameEffect.id)).status).toBe("done")
  })

  it("refuses an effect that has not passed, and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const error = await refused(gateway, {
      effect: "melt-away",
      image: [photo],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a sound, which Effects does not take, and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const error = await refused(gateway, {
      effect: "push-into-eye",
      image: [photo],
      sound: "off",
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a run with no photo, and starts nothing", async () => {
    const error = await refused(openGateway(), { effect: "push-into-eye" })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a photo under 480 pixels on its short side, and starts nothing", async () => {
    const gateway = openGateway()
    const small = await upload(gateway, pngOf(640, 479))
    const error = await refused(gateway, {
      effect: "push-into-eye",
      image: [small],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a photo stored as a format Effects does not take, and starts nothing", async () => {
    const gateway = openGateway()
    const gif = await upload(gateway, pngOf(1080, 1920), "image/gif")
    const error = await refused(gateway, {
      effect: "push-into-eye",
      image: [gif],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses the same small photo through /mcp, and starts nothing", async () => {
    const gateway = openGateway()
    const small = await upload(gateway, pngOf(640, 479))
    const result = await mcp(gateway, "tools/call", {
      name: "effects",
      arguments: { inputs: { effect: "push-into-eye", image: [small] } },
    })
    expect(result).toMatchObject({ isError: true })
    expect(JSON.stringify(result)).toContain("RUN_INPUT_INVALID")
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses every run and lists no tool for /mcp or the agent while no effect has passed", async () => {
    const closed = parsed(app)
    const gateway = openGateway(closed)
    const photo = await upload(gateway, pngOf(1080, 1920))
    const response = await start(gateway, { inputs: { image: [photo] } })
    expect(response.status).toBe(409)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "APP_CLOSED"
    )
    expect(gateway.jobs.enqueued).toEqual([])
    const listed = await mcp(gateway, "tools/list", {})
    expect(JSON.stringify(listed)).not.toContain('"name":"effects"')
    const tools = agentTools({
      apps: [closed, openApp()],
      handlers: () => ({}) as AgentToolHandlers,
    })
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["effects"])
    )
    expect(
      agentTools({
        apps: [closed],
        handlers: () => ({}) as AgentToolHandlers,
      }).map((tool) => tool.name)
    ).not.toContain("effects")
  })
})
