import { findApp } from "@rosesfield/catalog"
import { run, runResponse } from "@rosesfield/contract"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { imageApp } from "../sample-apps"

const legacyVersion = "2025-06-18"

const referenceId = "0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f"

const storyboard = findApp("storyboard")

const rpcReply = z.object({
  result: z.record(z.string(), z.unknown()).optional(),
})

const toolCall = z.object({
  structuredContent: z.unknown().optional(),
  isError: z.boolean().optional(),
})

const keyframeRuns = z.object({ runs: z.array(run.nullable()) })

const toolList = z.object({
  tools: z.array(
    z.object({
      name: z.string(),
      outputSchema: z
        .object({ properties: z.record(z.string(), z.unknown()) })
        .optional(),
    })
  ),
})

let gateway: Harness | null = null

afterEach(() => {
  vi.useRealTimers()
  gateway?.close()
  gateway = null
})

function gatewayOf(): Harness {
  if (storyboard === null) {
    throw new Error("The catalog lists no Storyboard")
  }
  gateway = harnessFor({
    portsFor: localPorts,
    apps: [storyboard, imageApp()],
  })
  return gateway
}

async function rpc(
  harness: Harness,
  method: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown> | undefined> {
  const response = await harness.call(
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
  return rpcReply.parse(JSON.parse(data ?? text)).result
}

async function settled<Value>(
  harness: Harness,
  pending: Promise<Value>
): Promise<Value> {
  let isDone = false
  const result = pending.finally(() => {
    isDone = true
  })
  const driven = new Set<string>()
  for (let step = 0; step < 30 && !isDone; step += 1) {
    for (const runId of harness.jobs.enqueued.filter((id) => !driven.has(id))) {
      driven.add(runId)
      await harness.drive(runId)
    }
    await vi.advanceTimersByTimeAsync(2_000)
  }
  return result
}

async function callStoryboard(
  harness: Harness,
  inputs: Record<string, unknown>
): Promise<z.infer<typeof toolCall>> {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  const result = await settled(
    harness,
    rpc(harness, "tools/call", { name: "storyboard", arguments: { inputs } })
  )
  return toolCall.parse(result)
}

describe("the MCP tool of the Storyboard app", () => {
  it("makes a keyframe run for each scene, and answers the list of its runs", async () => {
    const harness = gatewayOf()
    const reply = await callStoryboard(harness, {
      reference: [referenceId],
      sceneCount: "3",
      scene1: "a fox at dusk",
      scene2: "the fox in snow",
      scene3: "the fox at dawn",
    })
    expect(reply.isError).toBeUndefined()
    const { runs } = keyframeRuns.parse(reply.structuredContent)
    expect(runs.map((one) => one?.inputs.keyframe)).toEqual(["1", "2", "3"])
    expect(harness.jobs.enqueued).toHaveLength(3)
  })

  it("publishes a list of runs as the Storyboard output, and one run for every other app", async () => {
    const harness = gatewayOf()
    const { tools } = toolList.parse(await rpc(harness, "tools/list", {}))
    const outputOf = (name: string) =>
      Object.keys(
        tools.find((tool) => tool.name === name)?.outputSchema?.properties ?? {}
      )
    expect(outputOf("storyboard")).toEqual(["runs"])
    expect(outputOf("sample-image")).toEqual(["run"])
  })

  it("control: another app's tool still starts one run and answers it", async () => {
    const harness = gatewayOf()
    const reply = toolCall.parse(
      await rpc(harness, "tools/call", {
        name: "sample-image",
        arguments: { inputs: { prompt: "a fox" } },
      })
    )
    expect(reply.isError).toBeUndefined()
    expect(runResponse.parse(reply.structuredContent).run.appId).toBe(
      "sample-image"
    )
    expect(harness.jobs.enqueued).toHaveLength(1)
  })
})
