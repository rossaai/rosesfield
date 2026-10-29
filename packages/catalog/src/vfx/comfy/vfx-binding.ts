import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { guideWorkflow, shortSides } from "#motion/comfy/motion-binding"
import type {
  ClipPreset,
  PhotoPreset,
  VfxPreset,
} from "#vfx/vfx-preset.contract"
import { workflowBinding } from "#workflow-binding"

export const clipWorkflow = "vfx-clip-ltx-2-3-ic-lora"

function valuesOf<Preset extends VfxPreset>(
  presets: readonly Preset[],
  pick: (preset: Preset) => string | number
): Record<string, string | number> {
  return Object.fromEntries(presets.map((preset) => [preset.id, pick(preset)]))
}

function photoBinding(presets: readonly PhotoPreset[]): EngineBinding {
  return workflowBinding({
    workflow: guideWorkflow,
    bindings: [
      { from: "input", name: "photo", index: 0, to: "photo" },
      { from: "input", name: "guide", index: 0, to: "clip" },
      {
        from: "input",
        name: "preset",
        map: valuesOf(presets, (preset) => preset.prompt),
        to: "scene",
      },
      { from: "input", name: "resolution", map: shortSides, to: "shortSide" },
      { from: "seed", to: "seed" },
    ],
  })
}

function clipBinding(presets: readonly ClipPreset[]): EngineBinding {
  const mapped = (pick: (preset: ClipPreset) => string | number) => ({
    from: "input" as const,
    name: "preset",
    map: valuesOf(presets, pick),
  })
  return workflowBinding({
    workflow: clipWorkflow,
    bindings: [
      { from: "input", name: "clip", index: 0, to: "clip" },
      { from: "input", name: "resolution", map: shortSides, to: "shortSide" },
      { ...mapped((preset) => preset.adapter.file), to: "adapter" },
      { ...mapped((preset) => preset.adapter.strength), to: "strength" },
      { ...mapped((preset) => preset.prompt), to: "prompt" },
      { ...mapped((preset) => preset.negative), to: "negative" },
      { from: "seed", to: "seed" },
    ],
  })
}

export function vfxBinding(presets: readonly VfxPreset[]): EngineBinding {
  const photos = presets.filter(
    (preset): preset is PhotoPreset => preset.kind === "photo"
  )
  const clips = presets.filter(
    (preset): preset is ClipPreset => preset.kind === "clip"
  )
  const photo = photos.length === 0 ? null : photoBinding(photos)
  const clip = clips.length === 0 ? null : clipBinding(clips)
  return selectBinding({
    input: "preset",
    options: Object.fromEntries(
      presets.flatMap((preset) => {
        const binding = preset.kind === "photo" ? photo : clip
        return binding === null ? [] : [[preset.id, binding]]
      })
    ),
  })
}
