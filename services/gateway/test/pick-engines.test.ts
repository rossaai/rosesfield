import { type MediaResult, MediaTool } from "@rosesfield/catalog/remake"
import { buildPath, routes, runResponse } from "@rosesfield/contract"
import {
  CreditMeter,
  comfyWorkflow,
  comfyWorkflowAdapter,
  type Fetch,
  hostedModelBinding,
} from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { pickEngines, visitorEngines } from "#compose/pick-engines"
import type { EngineSettings } from "#engine/engine-target"
import { readServerEnv } from "#env"
import { harnessFor, jsonInit, type PortsFor } from "./harness"
import { localPorts } from "./local-ports"
import { start } from "./sample-apps"
import { comfyCloud } from "./server-env"

const clock = new FixedClock({ now: start })

class RefusingMediaTool extends MediaTool {
  override limitMs(): number {
    return 1000
  }

  override run(): Promise<MediaResult> {
    return Promise.reject(new Error("this test runs no ffmpeg"))
  }
}

function targetOf(source: Record<string, string>): string {
  return readServerEnv(source).engine.target
}

describe("the engine target the settings select", () => {
  it("reads each target from its address and its key", () => {
    expect(targetOf({})).toBe("demo")
    expect(targetOf({ COMFY_API_KEY: "comfyui-k" })).toBe("comfy-cloud")
    expect(
      targetOf({
        COMFY_BASE_URL: "https://studio.run.comfy.app",
        COMFY_API_KEY: "k",
      })
    ).toBe("comfy-deployment")
    expect(targetOf({ COMFY_BASE_URL: "http://127.0.0.1:8189" })).toBe(
      "comfyui"
    )
    expect(
      targetOf({
        COMFY_BASE_URL: "https://abc123-8189.proxy.runpod.net",
        COMFY_API_KEY: "t",
      })
    ).toBe("runpod-pod")
    expect(
      targetOf({
        COMFY_BASE_URL: "https://me--comfy-server.modal.run",
        COMFY_API_KEY: "wk",
      })
    ).toBe("modal")
  })

  it("selects a keyless ComfyUI on this computer instead of the demo engine", () => {
    const env = readServerEnv({ COMFY_BASE_URL: "http://127.0.0.1:8189" })
    expect(env.engine).toEqual({
      target: "comfyui",
      baseUrl: "http://127.0.0.1:8189",
      apiKey: null,
    })
    const engines = pickEngines(env.engine, { clock })
    expect(engines.map((engine) => [engine.key, engine.origin])).toEqual([
      [comfyWorkflowAdapter, "live"],
      ["comfy-router", "live"],
    ])
    expect(engines[1]?.canRun(hostedModelBinding("maker/model"))).toBe(false)
  })

  it("reads no RunPod setting, so a stale one selects nothing", () => {
    expect(
      targetOf({ RUNPOD_ENDPOINT_ID: "abc123", RUNPOD_API_KEY: "rp" })
    ).toBe("demo")
    expect(
      targetOf({
        COMFY_BASE_URL: "http://127.0.0.1:8189",
        RUNPOD_ENDPOINT_ID: "abc123",
      })
    ).toBe("comfyui")
  })

  it("refuses RunPod Serverless, which left Rosesfield, once at startup and never per request", () => {
    const runpod: EngineSettings = {
      target: "runpod-serverless",
      endpointId: "abc123",
      apiKey: null,
    }
    expect(() => pickEngines(runpod, { clock })).toThrow(/comfy-api-proxy/)
    expect(
      visitorEngines(runpod, "comfyui-visitor", { clock }).map((one) => one.key)
    ).toEqual(["comfy-router", "demo"])
    expect(
      pickEngines({ target: "demo" }, { clock }).map((one) => one.origin)
    ).toEqual(["live", "demo"])
  })

  it("runs hosted models with a Comfy key and never with a proxy token", () => {
    const hosted = hostedModelBinding("maker/model")
    const [, cloudRouter] = pickEngines(comfyCloud("comfyui-k"), { clock })
    const [, proxyRouter] = pickEngines(
      {
        target: "runpod-pod",
        baseUrl: "https://a-8189.proxy.runpod.net",
        apiKey: "token",
      },
      { clock }
    )
    expect(cloudRouter?.canRun(hosted)).toBe(true)
    expect(proxyRouter?.canRun(hosted)).toBe(false)
  })

  it("meters a graph on Comfy Cloud by the balance the Router reads", async () => {
    const jobId = "7f3d2c1b-9a8e-4d6f-b012-3c4d5e6f7a8b"
    const cents = [1000, 999.5, 999.5]
    const fetch: Fetch = async (input, init) => {
      const request = new Request(String(input), init)
      const { host, pathname } = new URL(request.url)
      if (host === "api.comfy.org" && pathname === "/customers/balance") {
        return Response.json({ amount_cents: cents.shift() ?? 999.5 })
      }
      if (request.method === "POST" && pathname === "/api/v2/jobs") {
        return Response.json({ id: jobId, status: "queued" }, { status: 201 })
      }
      if (pathname === `/api/v2/jobs/${jobId}`) {
        return Response.json({
          id: jobId,
          status: "succeeded",
          metrics: { execution_ms: 42000 },
        })
      }
      throw new Error(`No recording for ${request.method} ${request.url}`)
    }
    const meter = new CreditMeter({ clock, wait: async () => undefined })
    const [graph] = pickEngines(comfyCloud("comfyui-k"), {
      clock,
      meter,
      fetch,
    })
    const submission = await graph?.submit({
      idempotencyKey: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
      binding: comfyWorkflow({
        workflow: {
          "6": { class_type: "CLIPTextEncode", inputs: { text: "" } },
        },
        bindings: [
          { from: "input", name: "prompt", path: ["6", "inputs", "text"] },
        ],
      }),
      inputs: { prompt: "a red door" },
      files: [],
      count: 1,
      aspectRatio: null,
      seed: 42,
      outputKind: "image",
    })
    expect(await graph?.read(submission?.ref ?? "")).toEqual({
      state: "succeeded",
      cost: { amount: 1.055 / 211, currency: "USD" },
    })
  })

  it("gives a visitor the live engine only with their key, and the demo engine always", () => {
    const target = comfyCloud("ignored")
    expect(
      visitorEngines(target, null, { clock }).map((one) => one.key)
    ).toEqual(["comfy-router", "demo"])
    expect(
      visitorEngines(target, "comfyui-visitor", { clock }).map((one) => one.key)
    ).toEqual([comfyWorkflowAdapter, "comfy-router", "demo"])
  })

  it("starts a run on the Comfy adapter its app binds when a key is set", async () => {
    const livePorts: PortsFor = (fixed, folder) => ({
      ...localPorts(fixed, folder),
      engines: pickEngines(comfyCloud("comfyui-k"), { clock: fixed }),
    })
    const gateway = harnessFor({ portsFor: livePorts })
    const response = await gateway.call(
      buildPath(routes.startRun.path, { appId: "sample-image" }),
      jsonInit({ inputs: { prompt: "Hello" } })
    )
    const { run } = runResponse.parse(await response.json())
    expect(run.engine.adapter).toBe(comfyWorkflowAdapter)
    expect(run.origin).toBe("live")
    gateway.close()
  })

  it("puts Remake's runner before the live engines when the server runs ffmpeg", () => {
    const media = new RefusingMediaTool()
    const remake = { adapter: "remake-shots", config: {} }
    const engines = pickEngines(comfyCloud("comfyui-k"), { clock, media })
    expect(engines.map((one) => one.key)).toEqual([
      "remake-shots",
      comfyWorkflowAdapter,
      "comfy-router",
    ])
    expect(engines.find((one) => one.canRun(remake))?.key).toBe("remake-shots")
    expect(
      pickEngines({ target: "demo" }, { clock, media }).map((one) => one.key)
    ).toEqual(["comfy-router", "demo"])
  })

  it("puts Remake's runner before a pasted key's live engines when the server runs ffmpeg", () => {
    const media = new RefusingMediaTool()
    const target = comfyCloud("ignored")
    expect(
      visitorEngines(target, "comfyui-visitor", { clock, media }).map(
        (one) => one.key
      )
    ).toEqual(["remake-shots", comfyWorkflowAdapter, "comfy-router", "demo"])
    expect(
      visitorEngines(target, null, { clock, media }).map((one) => one.key)
    ).toEqual(["comfy-router", "demo"])
  })

  it("control: a server that runs no ffmpeg lists no Remake runner", () => {
    expect(
      pickEngines(comfyCloud("comfyui-k"), { clock }).map((one) => one.key)
    ).toEqual([comfyWorkflowAdapter, "comfy-router"])
  })
})
