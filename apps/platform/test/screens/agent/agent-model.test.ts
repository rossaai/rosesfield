import { describe, expect, it } from "vitest"
import { modelStateOf } from "@/screens/agent/agent-model"

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
