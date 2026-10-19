import type { AgentToolHandlers } from "@rosesfield/agent"
import { agentTools } from "@rosesfield/agent"
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
import { z } from "zod"
import { app, effectsApp } from "../../../../packages/catalog/src/effects/app"
import { recipeOf } from "../../../../packages/catalog/src/effects/effect-recipes"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const preview = {
  file: "grow-wings.mp4",
  runId: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  seed: 7,
  resolution: "720p" as const,
  aspectRatio: "9:16",
  workflowHash:
    "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
}

function parsed(input: unknown): AppDefinition {
  const [one] = readApps([{ folder: "effects", app: input as typeof app }])
  if (one === undefined) {
    throw new Error("The effects app did not parse")
  }
  return one
}

function openApp(): AppDefinition {
  return parsed(
    effectsApp([{ ...recipeOf("grow-wings"), passed: true, preview }])
  )
}

function pngOf(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13)
  view.setUint32(16, width)
  view.setUint32(20, height)
  bytes.set([8, 6], 24)
  return bytes
}

const rpcReply = z.object({
  result: z.record(z.string(), z.unknown()).optional(),
})

describe("the effects app through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(effects: AppDefinition = openApp()): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [effects] })
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
    const started = await start(gateway, {
      inputs: { effect: "grow-wings", image: [photo], prompt: "a red scarf" },
      aspectRatio: "9:16",
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      aspectRatio: "9:16",
      inputs: {
        effect: "grow-wings",
        image: [photo],
        prompt: "a red scarf",
        resolution: "720p",
      },
    })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    const done = runResponse.parse(await read.json()).run
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
      effect: "grow-wings",
      image: [photo],
      sound: "off",
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a run with no photo, and starts nothing", async () => {
    const error = await refused(openGateway(), { effect: "grow-wings" })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a photo under 480 pixels on its short side, and starts nothing", async () => {
    const gateway = openGateway()
    const small = await upload(gateway, pngOf(640, 479))
    const error = await refused(gateway, {
      effect: "grow-wings",
      image: [small],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a photo stored as a format Effects does not take, and starts nothing", async () => {
    const gateway = openGateway()
    const gif = await upload(gateway, pngOf(1080, 1920), "image/gif")
    const error = await refused(gateway, {
      effect: "grow-wings",
      image: [gif],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses the same small photo through /mcp, and starts nothing", async () => {
    const gateway = openGateway()
    const small = await upload(gateway, pngOf(640, 479))
    const result = await mcp(gateway, "tools/call", {
      name: "effects",
      arguments: { inputs: { effect: "grow-wings", image: [small] } },
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
