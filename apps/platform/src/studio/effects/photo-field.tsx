import { type ReactElement, useEffect, useRef } from "react"
import type { AssetInput } from "@/catalog/app-facts"
import { formatBytes } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, listOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { acceptOf } from "@/studio/effects/use-photo-checks"

type PhotoFieldProps = InputFieldProps<AssetInput> & {
  title?: string | undefined
  message: string | null
  onMessage: (message: string | null) => void
}

export function PhotoField(props: PhotoFieldProps): ReactElement {
  const { input, register } = props
  const trigger = useRef<HTMLButtonElement>(null)
  const accept = acceptOf(props.app, input.name)
  useEffect(() => {
    register(() => trigger.current?.focus())
  }, [register])
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={null}
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
        title={props.title}
        limits={
          accept === null
            ? (inputNote(props.app, input) ?? undefined)
            : tCatalog("effects.input.image.note", {
                size: formatBytes(accept.maxBytes),
                min: accept.minShortSide,
              })
        }
      />
    </FieldFrame>
  )
}
