import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { movedAppOf } from "@/studio/audio/audio-address"

describe("the old Voice and Audio addresses", () => {
  it("move Voice to Voice clone, and leave every other app where it is", () => {
    expect(movedAppOf("voice")).toEqual({ appId: "voice-clone", hash: "" })
    expect(movedAppOf("video")).toBeNull()
  })

  it("move Audio to the app of its mode, and to Speech with no mode", () => {
    expect(movedAppOf("audio", "#music")).toEqual({ appId: "music", hash: "" })
    expect(movedAppOf("audio", "#clone")).toEqual({
      appId: "voice-clone",
      hash: "",
    })
    expect(movedAppOf("audio", "#sound")).toEqual({
      appId: "sound-effects",
      hash: "",
    })
    expect(movedAppOf("audio")).toEqual({ appId: "speech", hash: "" })
  })

  it("send every move to an app the catalog lists", () => {
    for (const hash of ["#speech", "#clone", "#change", "#music", "#sound"]) {
      const moved = movedAppOf("audio", hash)
      expect(findCatalogApp(moved?.appId ?? ""), hash).not.toBeNull()
    }
  })
})
