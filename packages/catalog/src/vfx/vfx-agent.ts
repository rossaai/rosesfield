import type { RunInputs } from "@rosesfield/contract"
import { draftResolution } from "#vfx/app"
import { vfxCopy } from "#vfx/copy.en"
import type { VfxPreset } from "#vfx/vfx-preset.contract"
import { offeredPresets, presetKeyOf } from "#vfx/vfx-presets"

export const vfxAppId = "vfx"

const copy: Readonly<Record<string, string>> = vfxCopy

function wordsOf(key: string): string {
  return copy[key] ?? key
}

export function isFinalRun(appId: string, inputs: RunInputs): boolean {
  if (appId !== vfxAppId) {
    return false
  }
  const resolution = inputs.resolution
  return resolution !== undefined && resolution !== draftResolution
}

export function vfxAgentNotes(
  presets: readonly VfxPreset[] = offeredPresets
): string {
  const needs = presets.map((preset) => {
    const key = presetKeyOf(preset.id)
    return wordsOf("vfx.agent.needs")
      .replace("{preset}", preset.id)
      .replace("{needs}", wordsOf(`vfx.needs.${key}`))
  })
  return [wordsOf("vfx.agent.howTo"), ...needs].join("\n")
}
