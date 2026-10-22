import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing } from "@rosesfield/contract"

const tabs = ["speech", "clone", "change", "music", "sound"]

const graphs: Readonly<Record<string, string>> = {
  speech: "chatterbox",
  clone: "chatterbox",
  change: "chatterbox-vc",
  music: "minimax-music-3",
  sound: "stable-audio-3-medium",
}

function inModes(...modes: string[]): [{ input: "mode"; is: string[] }] {
  return [{ input: "mode", is: modes }]
}

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
          labelKey: `audio.mode.${value}`,
        })),
        default: "speech",
      },
      {
        type: "choice",
        name: "model",
        labelKey: "audio.input.model.label",
        options: [...new Set(Object.values(graphs))].map((value) => ({
          value,
          labelKey: "audio.model.graph",
        })),
        default: "chatterbox",
        bounds: tabs.map((tab) => ({
          when: inModes(tab),
          values: [graphs[tab]],
        })),
      },
      {
        type: "prompt",
        name: "script",
        labelKey: "audio.input.script.label",
        presence: "required",
        maxLength: 500,
        when: inModes("speech", "clone"),
      },
      {
        type: "audio",
        name: "recording",
        labelKey: "audio.input.recording.label",
        presence: "required",
        max: 1,
        when: inModes("clone"),
      },
      {
        type: "audio",
        name: "source",
        labelKey: "audio.input.source.label",
        presence: "required",
        max: 1,
        when: inModes("change"),
      },
      {
        type: "audio",
        name: "target",
        labelKey: "audio.input.target.label",
        presence: "required",
        max: 1,
        when: inModes("change"),
      },
      {
        type: "prompt",
        name: "description",
        labelKey: "audio.input.description.label",
        presence: "required",
        maxLength: 1000,
        when: inModes("music", "sound"),
      },
      {
        type: "number",
        name: "length",
        labelKey: "audio.input.length.label",
        min: 1,
        max: 240,
        step: 1,
        default: 10,
        bounds: [
          { when: inModes("music"), min: 5, max: 240 },
          { when: inModes("sound"), min: 1, max: 60 },
        ],
        when: inModes("music", "sound"),
      },
      { type: "seed", name: "seed", labelKey: "field.seed.label" },
    ],
    output: { kind: "audio", count: { default: 1, max: 4 } },
    limits: { timeoutSeconds: 900, maxRetries: 0 },
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
