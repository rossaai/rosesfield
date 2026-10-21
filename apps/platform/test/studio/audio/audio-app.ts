import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing } from "@rosesfield/contract"

const tabs = ["speech", "voice-clone", "voice-change", "music", "sound"]

function camelOf(value: string): string {
  return value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

const recordingTabs = ["voice-clone", "voice-change"]

export function audioListing(): AppListing {
  return appListing.parse({
    id: "audio",
    nameKey: "audio.name",
    category: "audio",
    inputs: [
      {
        type: "choice",
        name: "mode",
        labelKey: "audio.input.mode.label",
        options: tabs.map((value) => ({
          value,
          labelKey: `audio.choice.mode.${camelOf(value)}`,
        })),
        default: "speech",
      },
      {
        type: "prompt",
        name: "script",
        labelKey: "audio.input.script.label",
        presence: "required",
        maxLength: 500,
        when: [{ input: "mode", is: ["speech", "voice-clone"] }],
      },
      {
        type: "audio",
        name: "recording",
        labelKey: "audio.input.recording.label",
        presence: "required",
        max: 1,
        when: [{ input: "mode", is: recordingTabs }],
      },
      {
        type: "prompt",
        name: "description",
        labelKey: "audio.input.description.label",
        presence: "required",
        maxLength: 500,
        when: [{ input: "mode", is: ["music", "sound"] }],
      },
      {
        type: "choice",
        name: "model",
        labelKey: "audio.input.model.label",
        options: [
          { value: "chatterbox", labelKey: "audio.model.chatterbox" },
          { value: "minimax-music-3", labelKey: "audio.model.music" },
        ],
        default: "chatterbox",
      },
      { type: "seed", name: "seed", labelKey: "field.seed.label" },
    ],
    output: { kind: "audio", count: { default: 1, max: 4 } },
    limits: { timeoutSeconds: 300, maxRetries: 0 },
  })
}

export function modelOf(
  id: string,
  kind: CatalogModel["kind"],
  task: string,
  form: CatalogModel["form"] = null
): CatalogModel {
  return {
    id,
    kind,
    maker: "Maker",
    name: id,
    nameKey: null,
    task,
    tags: [],
    form,
  }
}
