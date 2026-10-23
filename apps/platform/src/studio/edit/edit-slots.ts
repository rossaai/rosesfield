import type {
  PromptAttachment,
  PromptSlot,
} from "@rosesfield/ui/components/prompt-bar"
import { t } from "@/copy/t"
import { listOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import { extraSlotOf, imageSlotsOf } from "@/studio/edit/edit-form"
import type { EditToolState } from "@/studio/edit/use-edit-tool"

function slotLabelOf(state: EditToolState, name: string): string {
  const field = state.hosted?.fields?.find((one) => one.name === name)
  if (field !== undefined) {
    return fieldCaption(field)
  }
  const input = state.app.inputs.find((one) => one.name === name)
  return input === undefined ? "" : inputCaption(input)
}

function thumbsOf(
  ids: readonly string[],
  thumbs: readonly PromptAttachment[]
): PromptAttachment[] {
  return ids.flatMap((id) => {
    const thumb = thumbs.find((one) => one.id === id)
    return thumb === undefined
      ? []
      : [{ id: thumb.id, src: thumb.src, alt: thumb.alt }]
  })
}

export function editSlotsOf(
  state: EditToolState,
  thumbs: readonly PromptAttachment[]
): PromptSlot[] {
  const inputs = state.form.values.inputs
  const { photo } = state
  const [first, ...others] = imageSlotsOf(
    state.app,
    state.hosted?.fields ?? null,
    inputs
  )
  if (first === undefined) {
    return []
  }
  const open =
    photo.photo === null ? null : extraSlotOf([first, ...others], inputs)
  const addLabel = t("field.asset.add.image")
  return [
    {
      id: first.name,
      label: slotLabelOf(state, first.name),
      items: thumbsOf(photo.photo === null ? [] : [photo.photo], thumbs),
      addLabel,
      onAdd: photo.photo === null ? photo.upload : undefined,
    },
    ...others.map((slot) => ({
      id: slot.name,
      label: slotLabelOf(state, slot.name),
      note: t("field.optional"),
      items: thumbsOf(listOf(inputs[slot.name]), thumbs),
      addLabel,
      onAdd: slot.name === open ? photo.upload : undefined,
    })),
  ]
}
