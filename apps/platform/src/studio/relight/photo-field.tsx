import { type ReactElement, useEffect, useRef } from "react"
import type { AssetInput } from "@/catalog/app-facts"
import { tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, listOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import {
  maxPhotoBytes,
  minPhotoSide,
  outputSizeOf,
  type PhotoSize,
  photoFormats,
} from "@/studio/relight/relight-photo"

type PhotoFieldProps = InputFieldProps<AssetInput> & {
  size: PhotoSize | null
  message: string | null
  onMessage: (message: string | null) => void
}

function noteOf(size: PhotoSize | null, isEmpty: boolean): string {
  if (isEmpty || size === null) {
    return tCatalog("relight.input.image.noteEmpty")
  }
  return tCatalog("relight.input.image.note", outputSizeOf(size))
}

export function PhotoField(props: PhotoFieldProps): ReactElement {
  const { input, register, problem } = props
  const trigger = useRef<HTMLButtonElement>(null)
  const { message, onMessage } = props
  useEffect(() => {
    register(() => trigger.current?.focus())
  }, [register])
  const ids = listOf(props.value)
  const required =
    problem?.key === "field.asset.required"
      ? tCatalog("relight.input.image.required")
      : null
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={noteOf(props.size, ids.length === 0)}
      problem={problem}
      message={message ?? required}
    >
      <DropWell
        kind="image"
        ids={ids}
        max={input.max}
        onChange={props.onChange}
        onMessage={onMessage}
        triggerRef={trigger}
        limits={assetLimitsText({
          formats: photoFormats,
          bytes: maxPhotoBytes,
          shortSide: minPhotoSide,
          ratio: { min: "3:7", max: "7:3" },
        })}
      />
    </FieldFrame>
  )
}
