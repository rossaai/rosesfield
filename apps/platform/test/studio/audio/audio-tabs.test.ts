import { describe, expect, it } from "vitest"
import { defaultsOf } from "@/screens/app/app-form"
import {
  defaultTabOf,
  graphsOfTab,
  isOnTab,
  modelForTab,
  modelsOfTab,
  pickerModelsOf,
  tabOfHash,
  tabOfValues,
  tabsOf,
} from "@/studio/audio/audio-tabs"
import { audioListing, modelOf } from "./audio-app"

const audio = audioListing()

const chatterbox = modelOf("chatterbox", "graph", "speech")
const voiceChange = modelOf("chatterbox-vc", "graph", "speech")
const music = modelOf("minimax-music-3", "graph", "speech")
const stable = modelOf("stable-audio-3-medium", "graph", "speech")
const seed = modelOf("byteplus/seed-audio-1.0", "hosted", "speech")
const effects = modelOf("elevenlabs/eleven_sfx_v2", "hosted", "sound")
const models = [chatterbox, voiceChange, music, stable, seed, effects]

function idsOf(tab: string): string[] {
  return modelsOfTab(models, tab, audio).map((one) => one.id)
}

describe("the Audio tabs", () => {
  it("lists one tab per option of the app's mode, in its order", () => {
    expect(tabsOf(audio).map((tab) => tab.value)).toEqual([
      "speech",
      "clone",
      "change",
      "music",
      "sound",
    ])
    expect(tabsOf(audio)[1]?.labelKey).toBe("audio.mode.clone")
  })

  it("opens on the mode's default, and on the tab an address names", () => {
    expect(defaultTabOf(audio)).toBe("speech")
    expect(tabOfHash(audio, "#clone")).toBe("clone")
    expect(tabOfHash(audio, "change")).toBe("change")
    expect(tabOfHash(audio, "#lyrics")).toBeNull()
    expect(tabOfValues(audio, defaultsOf(audio))).toBe("speech")
  })

  it("shows a tab the graphs its mode allows and the hosted models of its task", () => {
    expect(graphsOfTab(audio, "music")).toEqual(["minimax-music-3"])
    expect(idsOf("speech")).toEqual(["chatterbox", "byteplus/seed-audio-1.0"])
    expect(idsOf("clone")).toEqual(["chatterbox"])
    expect(idsOf("change")).toEqual(["chatterbox-vc"])
    expect(idsOf("music")).toEqual(["minimax-music-3"])
    expect(idsOf("sound")).toEqual([
      "stable-audio-3-medium",
      "elevenlabs/eleven_sfx_v2",
    ])
  })

  it("gives a graph row the task of its tab, so its line is the tab's", () => {
    const rows = pickerModelsOf(models, "music", audio)
    expect(rows.map((row) => [row.id, row.task])).toEqual([
      ["minimax-music-3", "music"],
    ])
    expect(pickerModelsOf(models, "sound", audio)[1]?.task).toBe("sound")
  })

  it("keeps a wanted model that the tab shows, and otherwise opens on its graph", () => {
    expect(modelForTab(models, "speech", audio, [seed.id])).toBe(seed.id)
    expect(modelForTab(models, "music", audio, [chatterbox.id])).toBe(music.id)
    expect(modelForTab(models, "sound", audio, [null])).toBe(stable.id)
    expect(isOnTab(models, "music", audio, chatterbox.id)).toBe(false)
    expect(isOnTab(models, "speech", audio, null)).toBe(false)
  })
})
