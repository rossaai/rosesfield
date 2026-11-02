import {
  findTemplate,
  sheetQuality,
  templateInputsOf,
} from "@rosesfield/catalog/ai-influencer"
import type { AppListing } from "@rosesfield/contract"
import { useEffect, useRef } from "react"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
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

/** Opens the model the template was made with, with the settings that run used, then fills its traits, so Recreate makes what the tile shows. */
export function useTemplate(
  form: AppForm,
  hosted: HostedState | undefined,
  example: string | undefined
): void {
  const isDone = useRef(false)
  const template = findTemplate(example)
  const isOpening = hosted?.isLoading ?? false
  const { setInput, setForm } = form
  const models = hosted?.models ?? null
  const choose = hosted?.choose ?? null
  useEffect(() => {
    if (isDone.current || template === null || isOpening) {
      return
    }
    isDone.current = true
    const { [modelInputName]: id, ...rest } = templateInputsOf(template)
    const model = models?.find((one) => one.id === id) ?? null
    const { settings, aspectRatio } = template.preview
    if (model !== null && choose !== null) {
      choose(model.id)
      if (aspectRatio !== null) {
        setForm({ aspectRatio })
      }
    }
    const fieldNames = new Set(model?.form?.map((field) => field.name) ?? [])
    for (const [name, value] of Object.entries(rest)) {
      if (!(name in settings) || fieldNames.has(name)) {
        setInput(name, value)
      }
    }
  }, [template, isOpening, models, choose, setInput, setForm])
}
