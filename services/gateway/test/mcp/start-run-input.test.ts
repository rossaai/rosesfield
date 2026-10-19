import { appDefinition, runResponse } from "@rosesfield/contract"
import { RouterCatalog, taskBinding } from "@rosesfield/generation"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { pickEngines } from "#compose/pick-engines"
import { fakeRouter, pictureModel } from "../catalog/router-recordings"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { comfyCloud } from "../server-env"

const legacyVersion = "2025-06-18"

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
    {
      type: "number",
      name: "length",
      labelKey: "inputs.length",
      min: 2,
      max: 5,
      step: 1,
      default: 5,
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
    default: "maker/picture-2",
    fallback: { adapter: "demo", config: {} },
  }),
  limits: { timeoutSeconds: 600, maxRetries: 2 },
})

const reply = z.object({
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.object({ message: z.string() }).optional(),
})

let gateway: Harness

afterEach(() => gateway.close())

function open(): void {
  const router = fakeRouter({ schemas: [pictureModel] })
  gateway = harnessFor({
    portsFor: (clock, folder) => ({
      ...localPorts(clock, folder),
      apps: [pictures],
      engines: pickEngines(comfyCloud("comfyui-owner"), {
        clock,
        fetch: router.fetch,
        catalog: new RouterCatalog({ clock }),
      }),
    }),
  })
}

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
  const text = await response.text()
  const data = text
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length)
  return reply.parse(JSON.parse(data ?? text))
}

describe("the start-run input an app publishes to MCP", () => {
  it("publishes the default model's form, and a call that follows it runs the default model", async () => {
    open()
    const listed = await rpc("tools/list", {})
    const schema = JSON.stringify(listed.result)
    expect(schema).toContain('"aspectRatio"')
    expect(schema).not.toContain('"length"')
    const called = await rpc("tools/call", {
      name: "pictures",
      arguments: { inputs: { prompt: "a fox", aspectRatio: "16:9" } },
    })
    const result = z
      .object({
        structuredContent: z.unknown(),
        isError: z.boolean().optional(),
      })
      .parse(called.result)
    expect(result.isError).toBeUndefined()
    const { run } = runResponse.parse(result.structuredContent)
    expect(run.inputs).toEqual({
      model: "maker/picture-2",
      prompt: "a fox",
      aspectRatio: "16:9",
    })
    expect(gateway.jobs.enqueued).toEqual([run.id])
  })
})
