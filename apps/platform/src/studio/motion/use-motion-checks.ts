import { useEffect, useRef } from "react"
import type { FieldProblem } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  clipProblem,
  nearestRatio,
  photoProblem,
} from "@/studio/motion/motion-checks"
import type { ClipRange, WellNames } from "@/studio/motion/motion-tabs"
import {
  type MediaReading,
  useMediaFacts,
} from "@/studio/motion/use-media-facts"

export type MotionChecks = {
  clip: FieldProblem | null
  photo: FieldProblem | null
  readingInput: string | null
}

function missingProblem(name: string): FieldProblem {
  return { name, key: "field.asset.required", values: {} }
}

export function clipCheckOf(
  reading: MediaReading,
  range: ClipRange | null,
  name: string
): FieldProblem | null {
  switch (reading.state) {
    case "none":
    case "reading":
      return null
    case "failed":
      return missingProblem(name)
    case "read":
      return clipProblem(reading.facts, range, name)
  }
}

export function photoCheckOf(
  reading: MediaReading,
  name: string
): FieldProblem | null {
  switch (reading.state) {
    case "none":
    case "reading":
      return null
    case "failed":
      return missingProblem(name)
    case "read":
      return photoProblem(reading.facts, name)
  }
}

function useRatioFromPhoto(form: AppForm, reading: MediaReading): void {
  const width = reading.state === "read" ? reading.facts.width : null
  const height = reading.state === "read" ? reading.facts.height : null
  const setForm = useRef(form.setForm)
  setForm.current = form.setForm
  const ratio = form.values.aspectRatio
  useEffect(() => {
    if (width === null || height === null || ratio === null) {
      return
    }
    const nearest = nearestRatio(width, height)
    if (nearest !== ratio) {
      setForm.current({ aspectRatio: nearest })
    }
  }, [width, height, ratio])
}

export function useMotionChecks(
  form: AppForm,
  names: WellNames,
  range: ClipRange | null
): MotionChecks {
  const [photoId = null] = listOf(form.values.inputs[names.photo])
  const [clipId = null] = listOf(form.values.inputs[names.clip])
  const photo = useMediaFacts(photoId, "image")
  const clip = useMediaFacts(clipId, "video")
  useRatioFromPhoto(form, photo)
  const readingInput =
    photo.state === "reading"
      ? names.photo
      : clip.state === "reading"
        ? names.clip
        : null
  return {
    clip: clipCheckOf(clip, range, names.clip),
    photo: photoCheckOf(photo, names.photo),
    readingInput,
  }
}
