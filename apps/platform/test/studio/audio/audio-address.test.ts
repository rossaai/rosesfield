import { describe, expect, it } from "vitest"
import { movedAppOf } from "@/studio/audio/audio-address"

describe("the old Voice address", () => {
  it("moves to Audio on Voice clone, and leaves every other app where it is", () => {
    expect(movedAppOf("voice")).toEqual({ appId: "audio", hash: "voice-clone" })
    expect(movedAppOf("audio")).toBeNull()
    expect(movedAppOf("video")).toBeNull()
  })
})
