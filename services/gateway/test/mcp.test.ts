import type { ModelForm } from "@rosesfield/catalog/comfy"
import {
  appDefinition,
  assetResponse,
  characterListResponse,
  type EngineBinding,
  routes,
  runResponse,
} from "@rosesfield/contract"
import {
  DemoGenerationEngine,
  EngineUnavailableError,
  type HostedModel,
  taskBinding,
} from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { gatewayCopy } from "#copy.en"
import { type Harness, harnessFor, jsonInit } from "./harness"
import { localPorts } from "./local-ports"
import { audioApp, pngBytes, start } from "./sample-apps"

const legacyVersion = "2025-06-18"

const rpcReply = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.object({ code: z.number(), message: z.string() }).optional(),
})

const toolList = z.object({
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      inputSchema: z.object({
        type: z.literal("object"),
        properties: z.record(z.string(), z.unknown()),
      }),
      outputSchema: z.object({ type: z.literal("object") }).optional(),
    })
  ),
})

const toolCall = z.object({
  content: z.array(z.object({ type: z.literal("text"), text: z.string() })),
  structuredContent: z.unknown().optional(),
  isError: z.boolean().optional(),
})

let gateway: Harness

afterEach(() => gateway.close())

async function rpc(method: string, params: Record<string, unknown>) {
  const response = await gateway.call(
    "/mcp",
    jsonInit(
      { jsonrpc: "2.0", id: 1, method, params },
      {
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": legacyVersion,
      }
    )
  )
  expect(response.status).toBe(200)
  const text = await response.text()
  const data = text
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length)
  return rpcReply.parse(JSON.parse(data ?? text))
}

const pictureForm: ModelForm = {
  model: "maker/picture-2",
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
  ],
}

const pictures = appDefinition.parse({
  id: "pictures",
  nameKey: "name",
  category: "image",
  inputs: [
    {
      type: "prompt",
      name: "prompt",
      labelKey: "inputs.prompt",
      presence: "required",
      maxLength: 2000,
    },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: { options: ["1:1"], default: "1:1" },
  },
  engine: taskBinding({
    tasks: ["text-to-image"],
    input: "model",
    default: pictureForm.model,
    fallback: { adapter: "demo", config: {} },
  }),
  limits: { timeoutSeconds: 600, maxRetries: 2 },
})

class CountedCatalog extends DemoGenerationEngine {
  lists = 0
  readonly forms: string[] = []
  isRefused = false

  override listModels(): Promise<readonly HostedModel[]> {
    this.lists += 1
    return Promise.resolve([])
  }

  override async formOf(binding: EngineBinding): Promise<ModelForm | null> {
    this.forms.push(JSON.stringify(binding.config))
    if (this.isRefused) {
      throw new EngineUnavailableError({ cause: "the catalog is down" })
    }
    return pictureForm
  }
}

function countedGateway(): CountedCatalog {
  const engine = new CountedCatalog({ clock: new FixedClock({ now: start }) })
  gateway = harnessFor({
    portsFor: (clock, folder) => ({
      ...localPorts(clock, folder),
      apps: [audioApp(), pictures],
      engines: [engine],
    }),
  })
  return engine
}

describe("the /mcp route", () => {
  it("reads only the forms of the apps' default models, and only for tools/list and tools/call", async () => {
    const engine = countedGateway()
    await rpc("initialize", {
      protocolVersion: legacyVersion,
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    expect(engine.forms).toHaveLength(0)
    const listed = toolList.parse((await rpc("tools/list", {})).result)
    const picture = listed.tools.find((tool) => tool.name === "pictures")
    expect(JSON.stringify(picture?.inputSchema)).not.toContain('"length"')
    expect(engine.forms).toHaveLength(1)
    expect(engine.forms[0]).toContain(pictureForm.model)
    expect(engine.lists).toBe(0)
  })

  it("answers an error that says the catalog could not be read, and publishes no schema", async () => {
    const engine = countedGateway()
    engine.isRefused = true
    const reply = await rpc("tools/list", {})
    expect(reply.result).toBeUndefined()
    expect(reply.error?.message).toBe(gatewayCopy.mcp.catalogUnread)
  })

  it("answers the handshake with the server's name", async () => {
    gateway = harnessFor({ portsFor: localPorts })
    const reply = await rpc("initialize", {
      protocolVersion: legacyVersion,
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    expect(reply.result).toMatchObject({
      serverInfo: { name: "rosesfield" },
      capabilities: { tools: {} },
    })
  })

  it("lists one tool per catalog app, with the app's start-run body as its input, and the library tools", async () => {
    gateway = harnessFor({ portsFor: localPorts })
    const reply = await rpc("tools/list", {})
    const { tools } = toolList.parse(reply.result)
    expect(tools.map((tool) => tool.name)).toEqual([
      "sample-image",
      "sample-audio",
      "read_run",
      "list_assets",
      "list_characters",
    ])
    const image = tools[0]
    expect(Object.keys(image?.inputSchema.properties ?? {})).toEqual([
      "inputs",
      "count",
      "aspectRatio",
      "idempotencyKey",
    ])
    expect(JSON.stringify(image?.inputSchema)).toContain('"prompt"')
    expect(image?.outputSchema?.type).toBe("object")
  })

  it("starts a run of the app when its tool is called", async () => {
    gateway = harnessFor({ portsFor: localPorts })
    const reply = await rpc("tools/call", {
      name: "sample-audio",
      arguments: { inputs: { script: "Good morning" } },
    })
    const result = toolCall.parse(reply.result)
    expect(result.isError).toBeUndefined()
    const { run } = runResponse.parse(result.structuredContent)
    expect(run).toMatchObject({
      appId: "sample-audio",
      status: "queued",
      origin: "demo",
      inputs: { script: "Good morning" },
    })
    expect(gateway.jobs.enqueued).toEqual([run.id])
    const stored = await gateway.call(
      routes.getRun.path.replace(":runId", run.id)
    )
    expect(runResponse.parse(await stored.json()).run.id).toBe(run.id)
  })

  it("refuses arguments that break the app's rules and starts no run", async () => {
    gateway = harnessFor({ portsFor: localPorts })
    const reply = await rpc("tools/call", {
      name: "sample-image",
      arguments: { inputs: { prompt: "" } },
    })
    const refused =
      reply.error !== undefined || toolCall.parse(reply.result).isError === true
    expect(refused).toBe(true)
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("starts one run for one idempotency key, and a new run for each start without one", async () => {
    gateway = harnessFor({ portsFor: localPorts })
    const start = (key?: string) =>
      rpc("tools/call", {
        name: "sample-audio",
        arguments: {
          inputs: { script: "Good morning" },
          ...(key === undefined ? {} : { idempotencyKey: key }),
        },
      }).then(
        (reply) =>
          runResponse.parse(toolCall.parse(reply.result).structuredContent).run
      )

    const first = await start("retry-1")
    const again = await start("retry-1")
    const loose = await start()
    const looseAgain = await start()

    expect(again.id).toBe(first.id)
    expect(new Set([first.id, loose.id, looseAgain.id]).size).toBe(3)
    expect(gateway.jobs.enqueued).toHaveLength(3)
    const bad = await rpc("tools/call", {
      name: "sample-audio",
      arguments: { inputs: { script: "Hi" }, idempotencyKey: "" },
    })
    const refused =
      bad.error !== undefined || toolCall.parse(bad.result).isError === true
    expect(refused).toBe(true)
  })

  it("reads a run's status and its outputs with the address of their bytes", async () => {
    gateway = harnessFor({ portsFor: localPorts })
    const started = await rpc("tools/call", {
      name: "sample-image",
      arguments: { inputs: { prompt: "a red door" } },
    })
    const { run } = runResponse.parse(
      toolCall.parse(started.result).structuredContent
    )
    await gateway.drive(run.id)

    const reply = await rpc("tools/call", {
      name: "read_run",
      arguments: { runId: run.id },
    })

    const read = z
      .object({
        run: z.object({ status: z.string(), outputs: z.array(z.string()) }),
        outputs: z.array(
          z.object({ id: z.string(), kind: z.string(), content: z.string() })
        ),
      })
      .parse(toolCall.parse(reply.result).structuredContent)
    expect(read.run.status).toBe("done")
    expect(read.outputs.map((output) => output.id)).toEqual(read.run.outputs)
    expect(read.outputs[0]?.kind).toBe("image")
    expect(read.outputs[0]?.content).toBe(
      `/api/assets/${read.run.outputs[0]}/content`
    )
    const missing = await rpc("tools/call", {
      name: "read_run",
      arguments: { runId: "5d0c9b8a-7f6e-4d5c-8b4a-3f2e1d0c9b8a" },
    })
    expect(toolCall.parse(missing.result).isError).toBe(true)
    expect(toolCall.parse(missing.result).content[0]?.text).toContain(
      "RUN_NOT_FOUND"
    )
  })

  it("lists the library's assets and characters", async () => {
    gateway = harnessFor({ portsFor: localPorts })
    const uploaded = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: pngBytes,
    })
    const { asset } = assetResponse.parse(await uploaded.json())
    await gateway.call(
      routes.createCharacter.path,
      jsonInit({ name: "Ada", references: [asset.id], notes: "" })
    )

    const assets = await rpc("tools/call", {
      name: "list_assets",
      arguments: { kind: "image" },
    })
    const characters = await rpc("tools/call", {
      name: "list_characters",
      arguments: {},
    })

    expect(toolCall.parse(assets.result).structuredContent).toEqual({
      assets: [{ ...asset, content: `/api/assets/${asset.id}/content` }],
      next: null,
    })
    expect(
      characterListResponse
        .parse(toolCall.parse(characters.result).structuredContent)
        .characters.map((one) => one.name)
    ).toEqual(["Ada"])
  })
})
