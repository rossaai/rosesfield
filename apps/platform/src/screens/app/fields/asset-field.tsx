import { type ReactElement, useEffect, useRef, useState } from "react"
import type { AssetInput } from "@/catalog/app-facts"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, listOf } from "@/screens/app/fields/field-props"
import {
  inputCaption,
  inputNote,
  isOptionalInput,
} from "@/screens/app/fields/input-copy"

export function AssetField(props: InputFieldProps<AssetInput>): ReactElement {
  const { input, register } = props
  const trigger = useRef<HTMLButtonElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    register(() => trigger.current?.focus())
  }, [register])
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={isOptionalInput(input)}
      note={inputNote(props.app, input)}
      problem={props.problem}
      message={message}
    >
      <DropWell
        kind={input.type}
        ids={listOf(props.value)}
        max={input.max}
        onChange={props.onChange}
        onMessage={setMessage}
        triggerRef={trigger}
      />
    </FieldFrame>
  )
}
