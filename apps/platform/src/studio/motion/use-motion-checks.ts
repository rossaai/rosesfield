import { useEffect, useRef } from "react"
import { ratioOfSize } from "@/catalog/app-facts"
import type { FieldProblem } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  clipProblem,
  examplePhotoProblem,
  guideShapeProblem,
  photoProblem,
} from "@/studio/motion/motion-checks"
import type { ClipRange, WellNames } from "@/studio/motion/motion-tabs"
import {
  type MediaReading,
  useMediaFacts,
} from "@/studio/motion/use-media-facts"
import { usePhotosReading } from "@/studio/motion/use-photos-reading"

export type MotionChecks = {
  clip: FieldProblem | null
  photo: FieldProblem | null
  readingInput: string | null
  clipSize: { width: number; height: number } | null
}

const resolutionInput = "resolution"

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

export type GuideCheck = { photo: MediaReading; resolution: string }

export function guideCheckOf(
  reading: MediaReading,
  guide: GuideCheck,
  range: ClipRange | null,
  name: string
): FieldProblem | null {
  const problem = clipCheckOf(reading, range, name)
  if (
    problem !== null ||
    reading.state !== "read" ||
    guide.photo.state !== "read"
  ) {
    return problem
  }
  return guideShapeProblem(
    reading.facts,
    guide.photo.facts,
    guide.resolution,
    name
  )
}

export type ExampleShape = {
  guide: { width: number; height: number }
  resolution: string
}

export function photoCheckOf(
  reading: MediaReading,
  name: string,
  shape: ExampleShape | null = null
): FieldProblem | null {
  switch (reading.state) {
    case "none":
    case "reading":
      return null
    case "failed":
      return missingProblem(name)
    case "read":
      return (
        photoProblem(reading.facts, name) ??
        (shape === null
          ? null
          : examplePhotoProblem(
              shape.guide,
              reading.facts,
              shape.resolution,
              name
            ))
      )
  }
}

export function shapeOf(
  reading: MediaReading,
  exampleShape: string | null
): string | null {
  if (exampleShape !== null) {
    return exampleShape
  }
  const { width = null, height = null } =
    reading.state === "read" ? reading.facts : {}
  return width === null || height === null ? null : ratioOfSize(width, height)
}

function useShapeOfResult(
  form: AppForm,
  reading: MediaReading,
  exampleShape: string | null
): void {
  const setForm = useRef(form.setForm)
  setForm.current = form.setForm
  const ratio = form.values.aspectRatio
  const shape = shapeOf(reading, exampleShape)
  useEffect(() => {
    if (shape !== ratio) {
      setForm.current({ aspectRatio: shape })
    }
  }, [shape, ratio])
}

function clipSizeOf(reading: MediaReading): MotionChecks["clipSize"] {
  if (reading.state !== "read") {
    return null
  }
  const { width, height } = reading.facts
  return width === null || height === null ? null : { width, height }
}

/** The problem of the photos after the first, naming the photo by its place in the well: one this browser cannot open or that is not a photo of a kind it takes. A file over the limit says so as the field does. */
export function laterPhotoProblem(
  readings: readonly MediaReading[],
  name: string
): FieldProblem | null {
  for (const [at, reading] of readings.entries()) {
    const problem =
      reading.state === "failed" ? null : photoCheckOf(reading, name)
    if (reading.state === "failed" || problem !== null) {
      return problem?.key === "field.asset.tooLarge"
        ? problem
        : { name, key: "field.asset.unopened", values: { number: at + 2 } }
    }
  }
  return null
}

export function useMotionChecks(
  form: AppForm,
  names: WellNames,
  range: ClipRange | null,
  isGuide = false,
  exampleGuide: ExampleShape["guide"] | null = null,
  exampleShape: string | null = null
): MotionChecks {
  const photoIds = listOf(form.values.inputs[names.photo])
  const [clipId = null] = listOf(form.values.inputs[names.clip])
  const photos = usePhotosReading(photoIds.slice(1))
  const photo = useMediaFacts(photoIds[0] ?? null, "image")
  const clip = useMediaFacts(clipId, "video")
  useShapeOfResult(form, photo, exampleShape)
  const readingInput =
    photo.state === "reading" || photos.some((one) => one.state === "reading")
      ? names.photo
      : clip.state === "reading"
        ? names.clip
        : null
  const resolution = form.values.inputs[resolutionInput]
  const resolutionText = typeof resolution === "string" ? resolution : ""
  return {
    clip: isGuide
      ? guideCheckOf(
          clip,
          {
            photo,
            resolution: resolutionText,
          },
          range,
          names.clip
        )
      : clipCheckOf(clip, range, names.clip),
    photo:
      photoCheckOf(
        photo,
        names.photo,
        exampleGuide === null
          ? null
          : { guide: exampleGuide, resolution: resolutionText }
      ) ?? laterPhotoProblem(photos, names.photo),
    readingInput,
    clipSize: clipSizeOf(clip),
  }
}
