import { IconButton } from "@rosesfield/ui/components/button"
import { XIcon } from "lucide-react"
import {
  type ClipboardEvent,
  type DragEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
} from "react"
import type { AssetInput } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { DeviceProvider, useDevice } from "@/device/device-context"
import type { FieldValue } from "@/screens/app/app-form"
import { AssetField } from "@/screens/app/fields/asset-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, listOf } from "@/screens/app/fields/field-props"
import {
  inputCaption,
  inputNote,
  isOptionalInput,
} from "@/screens/app/fields/input-copy"
import { NamingDevice } from "@/studio/audio/naming-device"
import {
  addedRecordingOf,
  audioFilesOf,
  recordingNames,
} from "@/studio/audio/recording-names"
import { WaveformPlayer } from "@/studio/audio/waveform-player"

function NamingWell(props: InputFieldProps<AssetInput>): ReactElement {
  const offered = useRef<readonly File[]>([])
  const outer = useDevice()
  const device = useMemo(
    () =>
      new NamingDevice({
        inner: outer,
        onPick: (files) => {
          offered.current = audioFilesOf(files)
        },
      }),
    [outer]
  )
  const ids = listOf(props.value)
  const onChange = (value: FieldValue): void => {
    const added = addedRecordingOf(ids, listOf(value), offered.current)
    if (added !== null) {
      recordingNames.remember(added)
    }
    offered.current = []
    props.onChange(value)
  }
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    offered.current = audioFilesOf(Array.from(event.dataTransfer.files))
  }
  const onPaste = (event: ClipboardEvent<HTMLDivElement>): void => {
    offered.current = audioFilesOf(Array.from(event.clipboardData.files))
  }
  return (
    <DeviceProvider device={device}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the wrapper only reads the names of the files the well below takes */}
      <div
        className="contents"
        onDropCapture={onDrop}
        onPasteCapture={onPaste}
      >
        <AssetField {...props} onChange={onChange} />
      </div>
    </DeviceProvider>
  )
}

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
    return <NamingWell {...props} />
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
                onClick={() => props.onChange(ids.filter((one) => one !== id))}
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
