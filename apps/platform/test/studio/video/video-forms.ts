import { type ModelField, modelField } from "@rosesfield/catalog/comfy"
import recorded from "./video-forms.json"

const fieldList = modelField.array()

function formOf(fields: unknown): readonly ModelField[] {
  return fieldList.parse(fields)
}

export const minimaxH3 = formOf(recorded.minimaxH3)
export const h3MaxTurbo = formOf(recorded.h3MaxTurbo)
export const veoLite = formOf(recorded.veoLite)
export const pVideo = formOf(recorded.pVideo)
export const seedanceFast = formOf(recorded.seedanceFast)
export const ltxFast = formOf(recorded.ltxFast)
