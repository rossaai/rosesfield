import { IconButton } from "@rosesfield/ui/components/button"
import { XIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef } from "react"
import type { AssetInput } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { AssetField } from "@/screens/app/fields/asset-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, listOf } from "@/screens/app/fields/field-props"
import {
  inputCaption,
  inputNote,
  isOptionalInput,
} from "@/screens/app/fields/input-copy"
import { WaveformPlayer } from "@/studio/audio/waveform-player"

export function RecordingField(
  props: InputFieldProps<AssetInput>
): ReactElement {
  const { input, register } = props
  const ids = listOf(props.value)
  const players = useRef<HTMLDivElement>(null)
  const first = ids[0]
  useEffect(() => {
    if (first !== undefined) {
      register(() => players.current?.querySelector("button")?.focus())
    }
  }, [first, register])
  if (first === undefined || input.max > 1) {
    return <AssetField {...props} />
  }
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={isOptionalInput(input)}
      note={inputNote(props.app, input)}
      problem={props.problem}
    >
      <div ref={players} className="flex flex-col gap-s2">
        {ids.map((id) => (
          <WaveformPlayer
            key={id}
            assetId={id}
            hasDownload={false}
            action={
              <IconButton
                label={t("field.asset.remove")}
                tone="quiet"
                onClick={() =>
                  props.onChange(ids.filter((one) => one !== id))
                }
              >
                <XIcon aria-hidden="true" />
              </IconButton>
            }
          />
        ))}
      </div>
    </FieldFrame>
  )
}
