import type { AppListing } from "@rosesfield/contract"
import type { PromptAttachment } from "@rosesfield/ui/components/prompt-bar"
import { useQueryClient } from "@tanstack/react-query"
import { isAssetInput } from "@/catalog/app-facts"
import { useDevice } from "@/device/device-context"
import { useAssetThumbs, useCharacterThumbs } from "@/pieces/attachment-thumbs"
import { useUploads } from "@/pieces/use-uploads"
import { listOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { placeAll } from "@/screens/app/form-fill"
import type { AppForm } from "@/screens/app/use-app-form"

export type BarTray = {
  attachments: PromptAttachment[]
  isUploading: boolean
  upload: () => void
  addAssets: (ids: readonly string[]) => void
  remove: (id: string) => void
  acceptsAssets: boolean
  acceptsCharacter: boolean
}

function captionMap(app: AppListing, form: AppForm): Map<string, string> {
  const captions = new Map<string, string>()
  for (const input of app.inputs) {
    if (isAssetInput(input) || input.type === "character") {
      for (const id of listOf(form.values.inputs[input.name])) {
        captions.set(id, inputCaption(input))
      }
    }
  }
  return captions
}

function idsOfType(
  app: AppListing,
  form: AppForm,
  isCharacter: boolean
): string[] {
  return app.inputs
    .filter((input) =>
      isCharacter ? input.type === "character" : isAssetInput(input)
    )
    .flatMap((input) => listOf(form.values.inputs[input.name]))
}

export function useBarTray(app: AppListing, form: AppForm): BarTray {
  const client = useQueryClient()
  const uploads = useUploads()
  const device = useDevice()
  const captions = captionMap(app, form)
  const assets = useAssetThumbs(idsOfType(app, form, false), (id) =>
    captions.get(id)
  )
  const characters = useCharacterThumbs(idsOfType(app, form, true))
  const addAssets = (ids: readonly string[]): void => {
    void placeAll(client, app, form.values, ids).then((placed) => {
      for (const input of app.inputs.filter(isAssetInput)) {
        form.setInput(input.name, placed.inputs[input.name])
      }
    })
  }
  const accepts = app.inputs
    .filter(isAssetInput)
    .map((input) => `${input.type}/*`)
  return {
    attachments: [...assets, ...characters],
    isUploading: uploads.uploads.some((one) => one.status === "uploading"),
    upload: () => {
      void device
        .pickFiles({ accept: accepts, multiple: true })
        .then((files) => uploads.start(files))
        .then((added) => addAssets(added.map((asset) => asset.id)))
    },
    addAssets,
    remove: (id) => {
      for (const input of app.inputs) {
        const list = listOf(form.values.inputs[input.name])
        if (list.includes(id)) {
          form.setInput(
            input.name,
            list.filter((one) => one !== id)
          )
        }
      }
    },
    acceptsAssets: accepts.length > 0,
    acceptsCharacter: app.inputs.some((input) => input.type === "character"),
  }
}
