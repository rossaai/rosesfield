import { type ChainRun, SpeechChain } from "@rosesfield/catalog/lipsync"
import type { StoryboardAsk } from "@rosesfield/catalog/storyboard"
import {
  buildPath,
  type Run,
  type RunInputs,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { expect } from "vitest"

export type Call = {
  method?: string
  headers?: Record<string, string>
  body?: string | Uint8Array
}

export function postJson(body: unknown, key: string): Call {
  return {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(body),
  }
}

type ChainEvent = { kind: "start" | "end"; key: string }

export class GatewayChain extends SpeechChain {
  readonly events: ChainEvent[] = []
  private readonly keys = new Map<string, string>()
  private readonly call: (path: string, init?: Call) => Promise<Response>
  private readonly drive: (runId: string) => Promise<void>

  constructor(options: {
    call: (path: string, init?: Call) => Promise<Response>
    drive: (runId: string) => Promise<void>
  }) {
    super()
    this.call = options.call
    this.drive = options.drive
  }

  async start(appId: string, request: ChainRun, key: string): Promise<Run> {
    this.events.push({ kind: "start", key })
    const body =
      request.aspectRatio === null
        ? { inputs: request.inputs }
        : { inputs: request.inputs, aspectRatio: request.aspectRatio }
    const response = await this.call(
      buildPath(routes.startRun.path, { appId }),
      postJson(body, key)
    )
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    this.keys.set(run.id, key)
    return run
  }

  async settle(run: Run): Promise<Run> {
    await this.drive(run.id)
    const read = await this.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    const ended = runResponse.parse(await read.json()).run
    this.events.push({ kind: "end", key: this.keys.get(run.id) ?? "" })
    return ended
  }

  async secondsOf(): Promise<number | null> {
    return null
  }
}

export function askOf(
  scenes: readonly string[],
  extra: RunInputs,
  aspectRatio = "16:9"
): StoryboardAsk {
  const inputs: RunInputs = {
    sceneCount: String(scenes.length),
    look: "blue hour, soft fog",
    ...extra,
  }
  scenes.forEach((scene, index) => {
    inputs[`scene${index + 1}`] = scene
  })
  return { inputs, aspectRatio, hosted: null }
}
