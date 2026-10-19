import { useEffect, useRef, useState } from "react"
import type { FieldProblem } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  clipInput,
  clipProblem,
  type MediaFacts,
  nearestRatio,
  photoInput,
  photoProblem,
} from "@/studio/motion/motion-checks"
import {
  type MediaReading,
  useMediaFacts,
} from "@/studio/motion/use-media-facts"

export type MotionChecks = {
  problems: Readonly<Record<string, FieldProblem | undefined>>
  readingInput: string | null
}

type Problems = Record<string, FieldProblem | undefined>

function missingProblem(name: string): FieldProblem {
  return { name, key: "field.asset.required", values: {} }
}

function useWellCheck(
  form: AppForm,
  name: string,
  reading: MediaReading,
  check: (facts: MediaFacts) => FieldProblem | null,
  setProblems: (change: (current: Problems) => Problems) => void
): void {
  const { setInput } = form
  const facts = reading.state === "read" ? reading.facts : null
  const failed = reading.state === "failed"
  useEffect(() => {
    if (facts === null && !failed) {
      return
    }
    const problem = facts === null ? missingProblem(name) : check(facts)
    setProblems((current) => ({ ...current, [name]: problem ?? undefined }))
    if (problem !== null) {
      setInput(name, [])
    }
  }, [facts, failed, name, check, setInput, setProblems])
}

export function useMotionChecks(form: AppForm): MotionChecks {
  const [photoId = null] = listOf(form.values.inputs[photoInput])
  const [clipId = null] = listOf(form.values.inputs[clipInput])
  const photo = useMediaFacts(photoId, "image")
  const clip = useMediaFacts(clipId, "video")
  const [problems, setProblems] = useState<Problems>({})
  useWellCheck(form, photoInput, photo, photoProblem, setProblems)
  useWellCheck(form, clipInput, clip, clipProblem, setProblems)
  const width = photo.state === "read" ? photo.facts.width : null
  const height = photo.state === "read" ? photo.facts.height : null
  const setForm = useRef(form.setForm)
  setForm.current = form.setForm
  const ratio = form.values.aspectRatio
  useEffect(() => {
    if (width === null || height === null) {
      return
    }
    const nearest = nearestRatio(width, height)
    if (nearest !== ratio) {
      setForm.current({ aspectRatio: nearest })
    }
  }, [width, height, ratio])
  const readingInput =
    photo.state === "reading"
      ? photoInput
      : clip.state === "reading"
        ? clipInput
        : null
  return { problems, readingInput }
}
