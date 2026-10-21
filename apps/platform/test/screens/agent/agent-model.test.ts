import { describe, expect, it } from "vitest"
import { agentStateOf, modelStateOf } from "@/screens/agent/agent-model"

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
    refusal: null,
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
        refusal: { code: "ENGINE_NOT_ENABLED", status: 412 },
      })
    ).toBe("off")
    expect(
      agentStateOf("ready", { models: [], model: null, refusal: null })
    ).toBe("off")
  })

  it("leaves a missing model missing whatever the list says", () => {
    expect(agentStateOf("missing", listed)).toBe("missing")
  })
})
