import { buildPath, routes, runResponse } from "@rosesfield/contract"
import { comfyWorkflowAdapter } from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { pickEngines, visitorEngines } from "#compose/pick-engines"
import { readServerEnv } from "#env"
import { harnessFor, jsonInit, type PortsFor } from "./harness"
import { localPorts } from "./local-ports"
import { start } from "./sample-apps"
import { comfyCloud } from "./server-env"

const clock = new FixedClock({ now: start })

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
    expect(
      targetOf({ RUNPOD_ENDPOINT_ID: "abc123", RUNPOD_API_KEY: "rp" })
    ).toBe("runpod-serverless")
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
    ])
  })

  it("refuses two targets at once and a RunPod key without its endpoint", () => {
    expect(() =>
      readServerEnv({
        COMFY_BASE_URL: "http://127.0.0.1:8189",
        RUNPOD_ENDPOINT_ID: "abc123",
      })
    ).toThrow(/COMFY_BASE_URL and RUNPOD_ENDPOINT_ID are both set/)
    expect(() => readServerEnv({ RUNPOD_API_KEY: "rp" })).toThrow(
      /RUNPOD_ENDPOINT_ID is missing/
    )
  })

  it("picks RunPod Serverless for its endpoint and the demo engine for no target", () => {
    const runpod = pickEngines(
      { target: "runpod-serverless", endpointId: "abc123", apiKey: "rp" },
      { clock }
    )
    expect(runpod.map((engine) => engine.key)).toEqual(["runpod-serverless"])
    expect(
      pickEngines({ target: "demo" }, { clock }).map((one) => one.origin)
    ).toEqual(["demo"])
  })

  it("gives a visitor the live engine only with their key, and the demo engine always", () => {
    const target = comfyCloud("ignored")
    expect(
      visitorEngines(target, null, { clock }).map((one) => one.key)
    ).toEqual(["demo"])
    expect(
      visitorEngines(target, "comfyui-visitor", { clock }).map((one) => one.key)
    ).toEqual([comfyWorkflowAdapter, "demo"])
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
})
