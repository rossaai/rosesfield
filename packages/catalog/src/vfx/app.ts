import { type AppInput, defineApp } from "#define-app"
import { photoAccept } from "#effects/app"
import { vfxBinding } from "#vfx/comfy/vfx-binding"
import type { VfxPreset } from "#vfx/vfx-preset.contract"
import {
  clipPresetIds,
  offeredPresets,
  photoPresetIds,
  presetKeyOf,
} from "#vfx/vfx-presets"

type AppInputs = AppInput["inputs"]

export const draftResolution = "480p"

export const vfxAspectRatios: readonly string[] = [
  "9:16",
  "16:9",
  "1:1",
  "4:3",
  "3:4",
]

function photoInputs(ids: readonly string[]): AppInputs {
  const when = [{ input: "preset", is: [...ids] }]
  return ids.length === 0
    ? []
    : [
        {
          type: "image",
          name: "photo",
          labelKey: "vfx.input.photo.label",
          presence: "required",
          max: 1,
          when,
          accept: {
            formats: [...photoAccept.formats],
            maxBytes: photoAccept.maxBytes,
            minShortSide: photoAccept.minShortSide,
          },
        },
        {
          type: "video",
          name: "guide",
          labelKey: "vfx.input.guide.label",
          presence: "optional",
          max: 1,
          when,
        },
      ]
}

function clipInputs(ids: readonly string[]): AppInputs {
  return ids.length === 0
    ? []
    : [
        {
          type: "video",
          name: "clip",
          labelKey: "vfx.input.clip.label",
          presence: "required",
          max: 1,
          when: [{ input: "preset", is: [...ids] }],
        },
      ]
}

export function vfxApp(presets: readonly VfxPreset[]): AppInput {
  const [first] = presets
  return defineApp({
    id: "vfx",
    nameKey: "vfx.name",
    category: "video",
    inputs: [
      {
        type: "choice",
        name: "preset",
        labelKey: "vfx.input.preset.label",
        options: presets.map((preset) => ({
          value: preset.id,
          labelKey: `vfx.preset.${presetKeyOf(preset.id)}`,
        })),
        default: first?.id ?? "",
      },
      ...photoInputs(photoPresetIds(presets)),
      ...clipInputs(clipPresetIds(presets)),
      {
        type: "choice",
        name: "resolution",
        labelKey: "vfx.input.resolution.label",
        options: [
          { value: draftResolution, labelKey: "vfx.choice.resolution.p480" },
          { value: "720p", labelKey: "vfx.choice.resolution.p720" },
        ],
        default: draftResolution,
      },
      { type: "seed", name: "seed", labelKey: "vfx.input.seed.label" },
    ],
    output: {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: { options: [...vfxAspectRatios], default: "9:16" },
    },
    engine: vfxBinding(presets),
    limits: { timeoutSeconds: 1800, maxRetries: 0 },
    preview: null,
    closedKey: presets.length === 0 ? "vfx.closed" : null,
  })
}

export const app = vfxApp(offeredPresets)
