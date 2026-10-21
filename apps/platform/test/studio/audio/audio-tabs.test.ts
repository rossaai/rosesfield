import { describe, expect, it } from "vitest"
import { defaultsOf } from "@/screens/app/app-form"
import {
  defaultTabOf,
  isOnTab,
  modelForTab,
  modelsOfTab,
  tabOfHash,
  tabOfValues,
  tabsOf,
} from "@/studio/audio/audio-tabs"
import { audioListing, modelOf } from "./audio-app"

const audio = audioListing()

const chatterbox = modelOf("chatterbox", "graph", "speech")
const music = modelOf("minimax-music-3", "graph", "music")
const seed = modelOf("byteplus/seed-audio-1.0", "hosted", "speech")
const effects = modelOf("elevenlabs/eleven_sfx_v2", "hosted", "sound")
const models = [chatterbox, music, seed, effects]

describe("the Audio tabs", () => {
  it("lists one tab per option of the app's mode, in its order", () => {
    expect(tabsOf(audio).map((tab) => tab.value)).toEqual([
      "speech",
      "voice-clone",
      "voice-change",
      "music",
      "sound",
    ])
    expect(tabsOf(audio)[1]?.labelKey).toBe("audio.choice.mode.voiceClone")
  })

  it("opens on the mode's default, and on the tab an address names", () => {
    expect(defaultTabOf(audio)).toBe("speech")
    expect(tabOfHash(audio, "#voice-clone")).toBe("voice-clone")
    expect(tabOfHash(audio, "voice-change")).toBe("voice-change")
    expect(tabOfHash(audio, "#lyrics")).toBeNull()
    expect(tabOfValues(audio, defaultsOf(audio))).toBe("speech")
  })

  it("shows a tab the hosted models of its task and the graphs of its task", () => {
    expect(modelsOfTab(models, "speech").map((one) => one.id)).toEqual([
      "chatterbox",
      "byteplus/seed-audio-1.0",
    ])
    expect(modelsOfTab(models, "sound").map((one) => one.id)).toEqual([
      "chatterbox",
      "minimax-music-3",
      "elevenlabs/eleven_sfx_v2",
    ])
    expect(modelsOfTab(models, "music").map((one) => one.id)).toEqual([
      "minimax-music-3",
    ])
  })

  it("keeps a wanted model that the tab shows, and otherwise opens on its first graph", () => {
    expect(modelForTab(models, "speech", [seed.id])).toBe(seed.id)
    expect(modelForTab(models, "music", [chatterbox.id])).toBe(music.id)
    expect(modelForTab(models, "speech", [null])).toBe(chatterbox.id)
    expect(isOnTab(models, "music", chatterbox.id)).toBe(false)
    expect(isOnTab(models, "speech", null)).toBe(false)
  })
})
