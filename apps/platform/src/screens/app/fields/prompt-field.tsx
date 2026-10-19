import type { InputDefinition } from "@rosesfield/contract"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { type ReactElement, useEffect, useRef } from "react"
import { t } from "@/copy/t"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, textOf } from "@/screens/app/fields/field-props"
import {
  inputCaption,
  inputNote,
  inputPlaceholder,
  isOptionalInput,
} from "@/screens/app/fields/input-copy"

type PromptInput = Extract<InputDefinition, { type: "prompt" }>

export function PromptField(props: InputFieldProps<PromptInput>): ReactElement {
  const { app, input, register } = props
  const field = useRef<HTMLTextAreaElement>(null)
  const text = textOf(props.value)
  useEffect(() => {
    register(() => field.current?.focus())
  }, [register])
  const isNearLimit = text.length > input.maxLength * 0.8
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={isOptionalInput(input)}
      note={
        isNearLimit
          ? t("field.prompt.count", {
              count: text.length,
              max: input.maxLength,
            })
          : inputNote(app, input)
      }
      problem={props.problem}
    >
      <Textarea
        ref={field}
        value={text}
        placeholder={inputPlaceholder(app, input) ?? ""}
        onChange={(event) => props.onChange(event.target.value)}
        className="max-w-none"
      />
    </FieldFrame>
  )
}
