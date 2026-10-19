import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { useQueryClient } from "@tanstack/react-query"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { assetQuery } from "@/api/queries"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import type { FieldProblem, FieldValue } from "@/screens/app/app-form"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { type PixelSize, sizeOfAsset } from "@/studio/layers/stack-images"

const maxBytes = 20_000_000
const minSide = 256
const maxSide = 4096

type SourceFieldProps = {
  app: AppListing
  input: InputDefinition
  value: FieldValue
  problem: FieldProblem | undefined
  onChange: (value: FieldValue) => void
  register: (focus: () => void) => void
  onSize: (size: PixelSize) => void
}

export function refusalOf(bytes: number, size: PixelSize): string | null {
  if (bytes > maxBytes) {
    return t("field.asset.tooLarge", {
      size: formatBytes(bytes),
      limit: formatBytes(maxBytes),
    })
  }
  const shorter = Math.min(size.width, size.height)
  if (shorter < minSide) {
    return tCatalog("layers.input.source.tooSmall", {
      size: shorter,
      min: minSide,
    })
  }
  const longer = Math.max(size.width, size.height)
  if (longer > maxSide) {
    return tCatalog("layers.input.source.tooBig", {
      size: longer,
      max: maxSide,
    })
  }
  return null
}

function useSourceCheck(props: SourceFieldProps): {
  message: string | null
  setMessage: (message: string | null) => void
} {
  const client = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [first = null] = listOf(props.value)
  const { onChange, onSize } = props
  useEffect(() => {
    if (first === null) {
      return
    }
    let isCurrent = true
    const check = async (): Promise<void> => {
      const [{ asset }, size] = await Promise.all([
        client.fetchQuery(assetQuery(first)),
        sizeOfAsset(first),
      ])
      if (!isCurrent || size === null) {
        return
      }
      const refusal = refusalOf(asset.bytes, size)
      setMessage(refusal)
      if (refusal === null) {
        onSize(size)
      } else {
        onChange([])
      }
    }
    void check()
    return () => {
      isCurrent = false
    }
  }, [client, first, onChange, onSize])
  return { message, setMessage }
}

export function SourceField(props: SourceFieldProps): ReactElement | null {
  const { input, register } = props
  const trigger = useRef<HTMLButtonElement>(null)
  const { message, setMessage } = useSourceCheck(props)
  useEffect(() => {
    register(() => trigger.current?.focus())
  }, [register])
  if (input.type !== "image") {
    return null
  }
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={inputNote(props.app, input)}
      problem={props.problem}
      message={message}
    >
      <DropWell
        kind="image"
        ids={listOf(props.value)}
        max={input.max}
        onChange={props.onChange}
        onMessage={setMessage}
        triggerRef={trigger}
      />
    </FieldFrame>
  )
}
