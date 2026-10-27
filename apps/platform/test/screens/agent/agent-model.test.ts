import { describe, expect, it } from "vitest"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import {
  agentStateOf,
  isAgentOffCode,
  modelStateOf,
} from "@/screens/agent/agent-model"

describe("modelStateOf", () => {
  it("waits only while the settings are on their way", () => {
    expect(modelStateOf("unknown", undefined)).toBe("unknown")
  })

  it("offers the composer only when the server holds a model", () => {
    expect(modelStateOf("unknown", "set")).toBe("ready")
    expect(modelStateOf("unknown", "missing")).toBe("missing")
  })

  it("treats settings that name no agent model as no model", () => {
    expect(modelStateOf("unknown", "unknown")).toBe("missing")
  })

  it("keeps what a refused or accepted start said over the settings", () => {
    expect(modelStateOf("missing", "set")).toBe("missing")
    expect(modelStateOf("ready", "missing")).toBe("ready")
  })
})

describe("agentStateOf", () => {
  const listed = {
    models: ["deepseek/deepseek-v4-flash"],
    model: "deepseek/deepseek-v4-flash",
    recent: [],
    refusal: null,
    details: {},
  }

  it("keeps the composer while the Router lists a chat model for the key", () => {
    expect(agentStateOf("ready", listed)).toBe("ready")
    expect(agentStateOf("ready", undefined)).toBe("ready")
  })

  it("turns the agent off when the Router refuses the key or lists no chat model", () => {
    expect(
      agentStateOf("ready", {
        models: [],
        model: null,
        recent: [],
        refusal: { code: "ENGINE_NOT_ENABLED", status: 412 },
        details: {},
      })
    ).toBe("off")
    expect(
      agentStateOf("ready", {
        models: [],
        model: null,
        recent: [],
        refusal: null,
        details: {},
      })
    ).toBe("off")
  })

  it("leaves a missing model missing whatever the list says", () => {
    expect(agentStateOf("missing", listed)).toBe("missing")
  })
})

describe("isAgentOffCode", () => {
  function refused(code: string): GatewayRefusedError {
    return new GatewayRefusedError({
      code,
      status: 412,
      retryAfterSeconds: null,
    })
  }

  it("turns the agent off for a key the Router has not turned on", () => {
    expect(isAgentOffCode(refused("ENGINE_NOT_ENABLED"))).toBe(true)
    expect(isAgentOffCode(refused("ENGINE_KEY_OUTSIDE_WORKSPACE"))).toBe(true)
  })

  it("keeps the composer when the account runs out of credits", () => {
    expect(isAgentOffCode(refused("ENGINE_NO_CREDITS"))).toBe(false)
  })
})
