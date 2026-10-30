import {
  findTemplate,
  sheetQuality,
  templateInputsOf,
} from "@rosesfield/catalog/ai-influencer"
import type { AppListing } from "@rosesfield/contract"
import { useEffect, useRef } from "react"
import { readLastUsed } from "@/screens/app/hosted/last-used"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { imageFieldsOf } from "@/studio/image/image-fields"

/** Opens an untouched form at medium quality once it opens on the catalog's #1, when that model offers medium, and leaves a model you used before, or a run you recreate, as it is. */
export function useOpenAtSheetQuality(
  app: AppListing,
  form: AppForm,
  hosted: HostedState | undefined
): void {
  const isDone = useRef(readLastUsed(app.id) !== null)
  const fields = hosted?.fields ?? null
  const chosen = hosted?.chosen?.id ?? null
  const opening = hosted?.defaultModel ?? null
  const source = form.source ?? "defaults"
  const { setInput } = form
  useEffect(() => {
    if (isDone.current || fields === null || chosen === null) {
      return
    }
    if (source !== "defaults") {
      isDone.current = true
      return
    }
    if (chosen !== opening) {
      return
    }
    isDone.current = true
    const quality = imageFieldsOf(fields).quality
    if (quality?.options.some((option) => String(option) === sheetQuality)) {
      setInput(quality.name, sheetQuality)
    }
  }, [chosen, fields, opening, setInput, source])
}

/** Fills the traits of the template the address names once the model has opened, so Remix leaves the model as it opens. */
export function useTemplate(
  form: AppForm,
  hosted: HostedState | undefined,
  example: string | undefined
): void {
  const isDone = useRef(false)
  const template = findTemplate(example)
  const isOpening = hosted?.isLoading ?? false
  const { setInput } = form
  useEffect(() => {
    if (isDone.current || template === null || isOpening) {
      return
    }
    isDone.current = true
    for (const [name, value] of Object.entries(templateInputsOf(template))) {
      setInput(name, value)
    }
  }, [template, isOpening, setInput])
}
