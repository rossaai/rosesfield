import { presetOf, type VfxPreset } from "@rosesfield/catalog/vfx"
import { useEffect, useRef } from "react"
import type { FieldProblem } from "@/screens/app/app-form"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  guideShapeProblem,
  type MediaFacts,
  nearestRatio,
} from "@/studio/motion/motion-checks"
import { graphClipRange } from "@/studio/motion/motion-tabs"
import {
  type MediaReading,
  useMediaFacts,
} from "@/studio/motion/use-media-facts"
import { clipCheckOf, photoCheckOf } from "@/studio/motion/use-motion-checks"

export const presetInput = "preset"
export const photoInput = "photo"
export const clipInput = "clip"
const resolutionInput = "resolution"

export type VfxChecks = {
  preset: VfxPreset | null
  photo: FieldProblem | null
  clip: FieldProblem | null
  isReading: boolean
}

export function guideFactsOf(preset: VfxPreset): MediaFacts | null {
  return preset.kind === "photo"
    ? {
        mime: "video/mp4",
        bytes: preset.guide.bytes,
        width: preset.guide.width,
        height: preset.guide.height,
        seconds: preset.guide.frames / preset.guide.fps,
      }
    : null
}

export function photoFitOf(
  preset: VfxPreset | null,
  reading: MediaReading,
  resolution: string
): FieldProblem | null {
  const problem = photoCheckOf(reading, photoInput)
  const guide = preset === null ? null : guideFactsOf(preset)
  if (problem !== null || guide === null || reading.state !== "read") {
    return problem
  }
  return guideShapeProblem(guide, reading.facts, resolution, photoInput)
}

function ratioOf(preset: VfxPreset | null, clip: MediaReading): string | null {
  if (preset?.kind === "photo") {
    return nearestRatio(preset.guide.width, preset.guide.height)
  }
  if (clip.state === "read" && clip.facts.width !== null) {
    return nearestRatio(clip.facts.width, clip.facts.height ?? 1)
  }
  return null
}

export function useVfxChecks(form: AppForm): VfxChecks {
  const preset = presetOf(textOf(form.values.inputs[presetInput]))
  const [photoId = null] = listOf(form.values.inputs[photoInput])
  const [clipId = null] = listOf(form.values.inputs[clipInput])
  const photo = useMediaFacts(
    preset?.kind === "photo" ? photoId : null,
    "image"
  )
  const clip = useMediaFacts(preset?.kind === "clip" ? clipId : null, "video")
  const ratio = ratioOf(preset, clip)
  const setForm = useRef(form.setForm)
  setForm.current = form.setForm
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm.current({ aspectRatio: ratio })
    }
  }, [ratio, current])
  return {
    preset,
    photo: photoFitOf(
      preset,
      photo,
      textOf(form.values.inputs[resolutionInput])
    ),
    clip: clipCheckOf(clip, graphClipRange, clipInput),
    isReading: photo.state === "reading" || clip.state === "reading",
  }
}
