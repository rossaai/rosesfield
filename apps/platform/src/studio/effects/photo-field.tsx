import { type ReactElement, useEffect, useRef } from "react"
import type { AssetInput } from "@/catalog/app-facts"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, listOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"

type PhotoFieldProps = InputFieldProps<AssetInput> & {
  message: string | null
  onMessage: (message: string | null) => void
}

export function PhotoField(props: PhotoFieldProps): ReactElement {
  const { input, register } = props
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    register(() => trigger.current?.focus())
  }, [register])
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={inputNote(props.app, input)}
      problem={props.problem}
      message={props.message}
    >
      <DropWell
        kind="image"
        ids={listOf(props.value)}
        max={input.max}
        onChange={props.onChange}
        onMessage={props.onMessage}
        triggerRef={trigger}
      />
    </FieldFrame>
  )
}
