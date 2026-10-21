import type { Preset } from "@/studio/video/video-prompt"

const samples = import.meta.glob("./presets/*.mp4", {
  eager: true,
  query: "?url",
  import: "default",
})

export type ShownPreset = Preset & {
  sample: string
}

export function sampleOf(
  value: string,
  files: Readonly<Record<string, string>> = samples
): string | null {
  const entry = Object.entries(files).find(([path]) =>
    path.endsWith(`/${value}.mp4`)
  )
  return entry?.[1] ?? null
}

export function shownPresets(
  presets: readonly Preset[],
  files: Readonly<Record<string, string>> = samples
): ShownPreset[] {
  return presets.flatMap((preset) => {
    const sample = sampleOf(preset.value, files)
    return sample === null ? [] : [{ ...preset, sample }]
  })
}
