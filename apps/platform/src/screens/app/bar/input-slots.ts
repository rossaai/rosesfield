import { type AppListing, inputRulesOf } from "@rosesfield/contract"
import type {
  PromptAttachment,
  PromptSlot,
} from "@rosesfield/ui/components/prompt-bar"
import { isAssetInput } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"

type Inputs = Readonly<Record<string, FieldValue>>

function thumbsOf(
  ids: readonly string[],
  thumbs: readonly PromptAttachment[]
): PromptAttachment[] {
  return ids.flatMap((id) => {
    const thumb = thumbs.find((one) => one.id === id)
    return thumb === undefined ? [] : [thumb]
  })
}

function uncaptioned({ id, src, alt }: PromptAttachment): PromptAttachment {
  return { id, src, alt }
}

export function inputSlotsOf(
  app: AppListing,
  inputs: Inputs,
  thumbs: readonly PromptAttachment[],
  onAdd: (name: string) => void
): PromptSlot[] | undefined {
  const shown = inputRulesOf(app, inputs).map((rule) => rule.input)
  const assets = shown.filter(isAssetInput)
  const isSpaced =
    assets.length > 1 || assets.some((input) => input.presence === "required")
  const slots = shown.flatMap((input): PromptSlot[] => {
    const ids = listOf(inputs[input.name])
    if (input.type === "character") {
      return ids.length === 0
        ? []
        : [
            {
              id: input.name,
              label: inputCaption(input),
              items: thumbsOf(ids, thumbs),
              addLabel: "",
            },
          ]
    }
    if (!isAssetInput(input) || (!isSpaced && ids.length === 0)) {
      return []
    }
    return [
      {
        id: input.name,
        label: inputCaption(input),
        ...(input.presence === "optional" ? { note: t("field.optional") } : {}),
        items: thumbsOf(ids, thumbs).map(uncaptioned),
        addLabel: t(`field.asset.add.${input.type}`),
        onAdd: ids.length < input.max ? () => onAdd(input.name) : undefined,
      },
    ]
  })
  return slots.length === 0 ? undefined : slots
}
