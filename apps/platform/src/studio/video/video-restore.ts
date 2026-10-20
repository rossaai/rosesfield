import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import type { FieldValue } from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
import { movedPrompt, type Preset } from "@/studio/video/video-prompt"
import {
  fieldsOfModel,
  tabOfInputs,
  type VideoTab,
} from "@/studio/video/video-tabs"

export const graphPrompt = "prompt"

const cameraMoveInput = "cameraMove"

const autoMove = "auto"

export type Restored = {
  tab: VideoTab
  inputs: Record<string, FieldValue>
}

function promptNameOf(model: CatalogModel | null): string {
  return fieldsOfModel(model)?.prompt?.name ?? graphPrompt
}

export function restoredOf(
  inputs: Readonly<Record<string, FieldValue>>,
  model: CatalogModel | null,
  presets: readonly Preset[],
  app: AppListing
): Restored {
  const name = promptNameOf(model)
  const written = textOf(inputs[name])
  const moved = movedPrompt(written, inputs[cameraMoveInput], presets)
  return {
    tab: tabOfInputs(inputs, model, app),
    inputs:
      moved === written ? {} : { [name]: moved, [cameraMoveInput]: autoMove },
  }
}
