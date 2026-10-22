import { defaultChatModel, routerChat } from "@rosesfield/agent"
import { describe, expect, it } from "vitest"
import { readAgentEnv } from "#agent/agent-env"
import { comfyCloudUrl, type EngineSettings } from "#engine/engine-target"
import { readServerEnv } from "#env"
import { EnvInvalidError } from "#error/env-invalid.error"

const cloud: EngineSettings = {
  target: "comfy-cloud",
  baseUrl: comfyCloudUrl,
  apiKey: "comfyui-owner",
}

const routerModel = {
  provider: routerChat.provider,
  model: defaultChatModel,
}

describe("the agent's settings", () => {
  it("run the agent on the Comfy key alone, on the default Router chat model", () => {
    expect(readServerEnv({ COMFY_API_KEY: "comfyui-owner" }).agent).toEqual({
      ...routerModel,
      apiKey: "comfyui-owner",
    })
  })

  it("leave the agent off when no Comfy key is set", () => {
    expect(readServerEnv({}).agent).toBeNull()
    expect(readServerEnv({ COMFY_API_KEY: "  " }).agent).toBeNull()
    expect(readAgentEnv({}, { ...cloud, apiKey: null })).toBeNull()
  })

  it("leave the agent off when the Comfy key belongs to another engine host, so the key never reaches the Router", () => {
    for (const baseUrl of [
      "https://rosesfield-1.run.comfy.app",
      "https://abc123-8188.proxy.runpod.net",
      "http://127.0.0.1:8188",
    ]) {
      const env = readServerEnv({
        COMFY_BASE_URL: baseUrl,
        COMFY_API_KEY: "proxy-secret",
      })
      expect(env.engine.target, baseUrl).not.toBe("comfy-cloud")
      expect(env.agent, baseUrl).toBeNull()
    }
  })

  it("take each visitor's key in public mode, and hold none of their own", () => {
    expect(readAgentEnv({}, { ...cloud, apiKey: null }, "public")).toEqual({
      ...routerModel,
      apiKey: null,
    })
    expect(
      readAgentEnv(
        {},
        {
          target: "comfy-deployment",
          baseUrl: "https://rosesfield-1.run.comfy.app",
          apiKey: null,
        },
        "public"
      )
    ).toBeNull()
  })

  it("refuse each removed agent setting once at startup, and pass it blank", () => {
    const removed = [
      "AGENT_PROVIDER",
      "AGENT_MODEL",
      "AGENT_API_KEY",
      "AGENT_BASE_URL",
    ]
    for (const name of removed) {
      expect(() => readAgentEnv({ [name]: "x" }, cloud)).toThrow(
        EnvInvalidError
      )
      expect(() => readAgentEnv({ [name]: "x" }, cloud)).toThrow(
        new RegExp(`${name} is set`)
      )
      expect(readAgentEnv({ [name]: " " }, cloud)).not.toBeNull()
    }
  })
})
