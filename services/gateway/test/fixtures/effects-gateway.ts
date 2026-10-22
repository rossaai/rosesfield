import { readApps } from "@rosesfield/catalog"
import {
  type AppDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  type Run,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, expect } from "vitest"
import { z } from "zod"
import {
  type app,
  effectsApp,
} from "../../../../packages/catalog/src/effects/app"
import { passedRecipe } from "../../../../packages/catalog/test/effects/passed-recipe"
import { type Harness, harnessFor, jsonInit, type PortsFor } from "../harness"
import { localPorts } from "../local-ports"

const rpcReply = z.object({
  result: z.record(z.string(), z.unknown()).optional(),
})

export function parsedEffects(input: unknown): AppDefinition {
  const [one] = readApps([{ folder: "effects", app: input as typeof app }])
  if (one === undefined) {
    throw new Error("The effects app did not parse")
  }
  return one
}

export function openEffects(): AppDefinition {
  return parsedEffects(
    effectsApp([passedRecipe("push-into-eye"), passedRecipe("many-copies")])
  )
}

export function pngOf(width: number, height: number): Uint8Array {
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

export function effectsGateways(): (
  effects?: AppDefinition,
  portsFor?: PortsFor
) => Harness {
  const open: Harness[] = []
  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })
  return (effects = openEffects(), portsFor = localPorts) => {
    const harness = harnessFor({ portsFor, apps: [effects] })
    open.push(harness)
    return harness
  }
}

export async function upload(
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

export function start(gateway: Harness, body: unknown): Promise<Response> {
  return gateway.call(
    buildPath(routes.startRun.path, { appId: "effects" }),
    jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
  )
}

export async function started(gateway: Harness, body: unknown): Promise<Run> {
  const response = await start(gateway, body)
  expect(response.status).toBe(202)
  return runResponse.parse(await response.json()).run
}

export async function readRun(gateway: Harness, runId: string): Promise<Run> {
  const read = await gateway.call(buildPath(routes.getRun.path, { runId }))
  return runResponse.parse(await read.json()).run
}

export async function refused(
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

export async function mcp(
  gateway: Harness,
  method: string,
  params: object
): Promise<Record<string, unknown>> {
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
