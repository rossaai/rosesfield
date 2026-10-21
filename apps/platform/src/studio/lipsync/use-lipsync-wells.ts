import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { useEffect, useRef, useState } from "react"
import type { FieldProblem } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  lengthFor,
  limitsFor,
  type MediaFacts,
  nearestRatio,
  problemOf,
  type WellKind,
} from "@/studio/lipsync/lipsync-checks"
import type { LengthLimit } from "@/studio/lipsync/lipsync-tabs"
import {
  type MediaKind,
  type MediaReading,
  useMediaFacts,
} from "@/studio/lipsync/use-media-facts"

export type WellProblems = Readonly<Record<string, FieldProblem | undefined>>

type SetProblems = (change: (current: WellProblems) => WellProblems) => void

const mediaKinds: Readonly<Record<WellKind, MediaKind>> = {
  photo: "image",
  clip: "video",
  audio: "audio",
}

export type Well = {
  name: string | null
  kind: WellKind
  limit: LengthLimit | null
}

export type WellReading = {
  facts: MediaFacts | null
  isWaiting: boolean
}

function useWell(form: AppForm, well: Well, set: SetProblems): WellReading {
  const { name, kind } = well
  const [first = null] = name === null ? [] : listOf(form.values.inputs[name])
  const reading: MediaReading = useMediaFacts(first, mediaKinds[kind])
  const facts = reading.state === "read" ? reading.facts : null
  const failed = reading.state === "failed"
  const min = well.limit?.min ?? null
  const max = well.limit?.max ?? null
  const { setInput } = form
  useEffect(() => {
    if (name === null || (facts === null && !failed)) {
      return
    }
    const seconds = min === null || max === null ? null : { min, max }
    const problem: FieldProblem | null =
      facts === null
        ? { name, key: "field.asset.required", values: {} }
        : problemOf(facts, limitsFor(kind, name, seconds))
    set((current) => ({ ...current, [name]: problem ?? undefined }))
    if (problem !== null) {
      setInput(name, [])
    }
  }, [facts, failed, name, kind, min, max, setInput, set])
  return { facts, isWaiting: reading.state === "reading" }
}

function useDerivedLength(
  form: AppForm,
  audio: MediaFacts | null,
  field: ModelField | null,
  step: number | null
): void {
  const seconds = audio?.seconds ?? null
  const { setInput } = form
  const name = field?.name ?? null
  const current = name === null ? undefined : form.values.inputs[name]
  const value =
    seconds === null || field === null ? null : lengthFor(seconds, field, step)
  useEffect(() => {
    if (name !== null && value !== null && value !== current) {
      setInput(name, value)
    }
  }, [name, value, current, setInput])
}

function useShape(
  form: AppForm,
  app: AppListing,
  face: MediaFacts | null,
  isGraph: boolean
): void {
  const setForm = useRef(form.setForm)
  setForm.current = form.setForm
  const output = app.output
  const offered =
    output.kind === "video" || output.kind === "image"
      ? output.aspectRatios.options
      : []
  const width = face?.width ?? null
  const height = face?.height ?? null
  const chosen =
    !isGraph || width === null || height === null
      ? null
      : nearestRatio(width, height, offered)
  const current = form.values.aspectRatio
  useEffect(() => {
    if (chosen !== null && chosen !== current) {
      setForm.current({ aspectRatio: chosen })
    }
  }, [chosen, current])
}

export type LipsyncWells = {
  problems: WellProblems
  audio: MediaFacts | null
  isWaiting: (name: string) => boolean
}

export function useLipsyncWells(options: {
  form: AppForm
  app: AppListing
  face: Well
  audio: Well
  length: ModelField | null
  lengthStep: number | null
  isGraph: boolean
}): LipsyncWells {
  const { form } = options
  const [problems, setProblems] = useState<WellProblems>({})
  const face = useWell(form, options.face, setProblems)
  const audio = useWell(form, options.audio, setProblems)
  useDerivedLength(form, audio.facts, options.length, options.lengthStep)
  useShape(form, options.app, face.facts, options.isGraph)
  const waiting = [
    face.isWaiting ? options.face.name : null,
    audio.isWaiting ? options.audio.name : null,
  ]
  return {
    problems,
    audio: audio.facts,
    isWaiting: (name) =>
      waiting.includes(name) || problems[name] !== undefined,
  }
}
