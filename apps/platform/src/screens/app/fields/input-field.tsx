import type { InputDefinition } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { tCatalog } from "@/copy/t"
import { AssetField } from "@/screens/app/fields/asset-field"
import { CharacterField } from "@/screens/app/fields/character-field"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import type { InputFieldProps } from "@/screens/app/fields/field-props"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { NumberField } from "@/screens/app/fields/number-field"
import { PromptField } from "@/screens/app/fields/prompt-field"
import { ToggleField } from "@/screens/app/fields/toggle-field"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function ChoiceInputField(props: InputFieldProps<ChoiceInput>): ReactElement {
  const items = props.input.options.map((option) => ({
    value: option.value,
    label: tCatalog(option.labelKey),
  }))
  return (
    <ChoiceField
      label={inputCaption(props.input)}
      items={items}
      value={textOf(props.value) || props.input.default}
      onChange={props.onChange}
      note={inputNote(props.app, props.input)}
      register={props.register}
    />
  )
}

export function InputField(props: InputFieldProps): ReactElement | null {
  const { input } = props
  if (isAssetInput(input)) {
    return <AssetField {...props} input={input} />
  }
  switch (input.type) {
    case "prompt":
      return <PromptField {...props} input={input} />
    case "character":
      return <CharacterField {...props} input={input} />
    case "choice":
      return <ChoiceInputField {...props} input={input} />
    case "number":
      return <NumberField {...props} input={input} />
    case "toggle":
      return <ToggleField {...props} input={input} />
    default:
      return null
  }
}
