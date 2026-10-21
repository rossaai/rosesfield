import { defaultChatModel, routerChat } from "@rosesfield/agent"
import { describe, expect, it } from "vitest"
import { readAgentEnv } from "#agent/agent-env"
import { EnvInvalidError } from "#error/env-invalid.error"

describe("the agent's settings", () => {
  it("run the agent on the Comfy key alone, on the cheapest Router chat model", () => {
    expect(readAgentEnv({ COMFY_API_KEY: "comfyui-owner" })).toEqual({
      provider: routerChat.provider,
      model: defaultChatModel,
      apiKey: "comfyui-owner",
    })
  })

  it("leave the agent off when no Comfy key is set", () => {
    expect(readAgentEnv({})).toBeNull()
    expect(readAgentEnv({ COMFY_API_KEY: "  " })).toBeNull()
  })

  it("take each visitor's key in public mode, and hold none of their own", () => {
    expect(readAgentEnv({ COMFY_API_KEY: "comfyui-owner" }, "public")).toEqual(
      {
        provider: routerChat.provider,
        model: defaultChatModel,
        apiKey: null,
      }
    )
  })

  it("refuse each removed agent setting once at startup, and pass it blank", () => {
    const removed = [
      "AGENT_PROVIDER",
      "AGENT_MODEL",
      "AGENT_API_KEY",
      "AGENT_BASE_URL",
    ]
    for (const name of removed) {
      expect(() =>
        readAgentEnv({ COMFY_API_KEY: "comfyui-owner", [name]: "x" })
      ).toThrow(EnvInvalidError)
      expect(() =>
        readAgentEnv({ COMFY_API_KEY: "comfyui-owner", [name]: "x" })
      ).toThrow(new RegExp(`${name} is set`))
      expect(
        readAgentEnv({ COMFY_API_KEY: "comfyui-owner", [name]: " " })
      ).not.toBeNull()
    }
  })
})
