import { afterEach, describe, expect, it } from "vitest"
import { credentialHeaders } from "@/api/call-route"
import {
  holdVisitorKey,
  problemOfKey,
  visitorKeyHeaders,
} from "@/api/visitor-keys"

afterEach(() => {
  holdVisitorKey("engine", null)
})

describe("problemOfKey", () => {
  it("accepts a key the gateway can read", () => {
    expect(problemOfKey("  comfyui-abc123  ")).toBeNull()
  })

  it("names an empty key and a key with a space", () => {
    expect(problemOfKey("   ")).toBe("required")
    expect(problemOfKey("two words")).toBe("invalid")
    expect(problemOfKey("x".repeat(1025))).toBe("invalid")
  })
})

describe("the request headers", () => {
  it("send nothing until the visitor keeps a key", () => {
    expect(visitorKeyHeaders()).toEqual({})
    expect(credentialHeaders()).toEqual({})
  })

  it("send the visitor's Comfy key alone, which the engine and the agent both use", () => {
    holdVisitorKey("engine", "engine-key")
    expect(credentialHeaders()).toEqual({ "X-Engine-Key": "engine-key" })
    holdVisitorKey("engine", null)
    expect(credentialHeaders()).toEqual({})
  })
})
