import { type ReactElement, useEffect, useRef, useState } from "react"
import type { AssetInput } from "@/catalog/app-facts"
import { settingTipOf } from "@/catalog/setting-registry"
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
      hint={settingTipOf(input.name)}
      isOptional={isOptionalInput(input)}
      note={null}
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
        limits={inputNote(props.app, input) ?? undefined}
      />
    </FieldFrame>
  )
}
