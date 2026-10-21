import { describe, expect, it } from "vitest"
import { comfyCloudUrl } from "#engine/engine-target"
import { readServerEnv } from "#env"

describe("the settings of a server on your machine", () => {
  it("start with no setting on the demo engine, on this computer only, at port 8787", () => {
    expect(readServerEnv({})).toEqual({
      engine: { target: "demo" },
      access: { mode: "owner", lock: { mode: "local" } },
      agent: null,
      host: "127.0.0.1",
      port: 8787,
      dataDir: "./data",
    })
  })

  it("take your Comfy key, your own ComfyUI's address and the port, and nothing else", () => {
    const env = readServerEnv({
      COMFY_API_KEY: "comfyui-key",
      COMFY_BASE_URL: comfyCloudUrl,
      PORT: "9000",
      RUNPOD_ENDPOINT_ID: "abc123",
      RUNPOD_API_KEY: "rp",
    })
    expect(env.engine).toEqual({
      target: "comfy-cloud",
      baseUrl: comfyCloudUrl,
      apiKey: "comfyui-key",
    })
    expect(env.port).toBe(9000)
    expect(env.access).toEqual({ mode: "owner", lock: { mode: "local" } })
  })
})
