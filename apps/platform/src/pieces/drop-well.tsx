import { IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { DropZone } from "@rosesfield/ui/components/upload-zone"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  FileAudioIcon,
  ImageIcon,
  PlusIcon,
  VideoIcon,
  XIcon,
} from "lucide-react"
import {
  type ClipboardEvent,
  type DragEvent,
  type ReactElement,
  type Ref,
  useState,
} from "react"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { AssetTile } from "@/pieces/asset-tile"
import { LibraryPicker } from "@/pieces/library-picker"
import { UploadRow } from "@/pieces/upload-row"
import { useUploads } from "@/pieces/use-uploads"

export type WellKind = "image" | "video" | "audio"

type DropWellProps = {
  kind: WellKind
  ids: readonly string[]
  max: number
  onChange: (ids: string[]) => void
  onMessage: (message: string | null) => void
  triggerRef?: Ref<HTMLButtonElement>
  limits?: string
  title?: string
  fill?: boolean
}

const icons = { image: ImageIcon, video: VideoIcon, audio: FileAudioIcon }

const mostDiscs = 3

function fits(file: File, kind: WellKind): boolean {
  return file.type.startsWith(`${kind}/`)
}

function useWellFiles(props: DropWellProps): {
  uploads: ReturnType<typeof useUploads>
  addFiles: (files: readonly File[]) => void
  pick: () => void
} {
  const uploads = useUploads()
  const device = useDevice()
  const addFiles = (files: readonly File[]): void => {
    const fitting = files.filter((file) => fits(file, props.kind))
    const room = props.max - props.ids.length
    if (fitting.length < files.length) {
      props.onMessage(
        t("field.asset.wrongKind", { kinds: t(`apps.input.${props.kind}`) })
      )
    } else if (fitting.length > room) {
      props.onMessage(t("field.asset.tooMany", { max: props.max }))
    } else {
      props.onMessage(null)
    }
    void uploads.start(fitting.slice(0, Math.max(0, room))).then((assets) => {
      props.onChange(
        [...props.ids, ...assets.map((asset) => asset.id)].slice(0, props.max)
      )
    })
  }
  const pick = (): void => {
    void device
      .pickFiles({ accept: [`${props.kind}/*`], multiple: props.max > 1 })
      .then(addFiles)
  }
  return { uploads, addFiles, pick }
}

function AddMenu({
  kind,
  label,
  limits,
  max,
  onUpload,
  onLibrary,
  triggerRef,
  isTile,
}: {
  kind: WellKind
  label: string
  limits: string | undefined
  max: number
  onUpload: () => void
  onLibrary: () => void
  triggerRef?: Ref<HTMLButtonElement> | undefined
  isTile: boolean
}): ReactElement {
  const Icon = icons[kind]
  const kindGlyph = <Icon aria-hidden="true" />
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={triggerRef}
        render={
          isTile ? (
            <IconButton label={label} size="dense">
              <PlusIcon aria-hidden="true" />
            </IconButton>
          ) : (
            <DropZone
              title={label}
              line={limits ?? t(`kind.${kind}`)}
              kinds={Array.from(
                { length: Math.min(mostDiscs, Math.max(1, max)) },
                () => kindGlyph
              )}
            />
          )
        }
      />
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onUpload}>
          {t("field.asset.upload")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLibrary}>
          {t("field.asset.fromLibrary")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilledTiles({
  ids,
  onRemove,
}: {
  ids: readonly string[]
  onRemove: (id: string) => void
}): ReactElement {
  return (
    <div className="flex flex-wrap gap-s2">
      {ids.map((id) => (
        <div key={id} className="relative w-tile">
          <AssetTile assetId={id} />
          <IconButton
            label={t("field.asset.remove")}
            size="badge"
            className="material absolute top-s1 right-s1"
            onClick={() => onRemove(id)}
          >
            <XIcon aria-hidden="true" />
          </IconButton>
        </div>
      ))}
    </div>
  )
}

function WellFoot(
  props: DropWellProps & {
    isFull: boolean
    onUpload: () => void
    onLibrary: () => void
  }
): ReactElement {
  return (
    <div
      className={cn(
        "flex justify-between gap-s2",
        props.fill === true ? "flex-1 items-stretch" : "items-center"
      )}
    >
      {props.isFull ? null : (
        <AddMenu
          kind={props.kind}
          label={
            props.ids.length === 0 && props.title !== undefined
              ? props.title
              : t(`field.asset.add.${props.kind}`)
          }
          limits={props.limits}
          max={props.max}
          onUpload={props.onUpload}
          onLibrary={props.onLibrary}
          triggerRef={props.triggerRef}
          isTile={props.ids.length > 0}
        />
      )}
      {props.max > 1 && props.ids.length > 0 ? (
        <span className="text-caption text-ink-muted">
          {t("field.asset.count", { count: props.ids.length, max: props.max })}
        </span>
      ) : null}
    </div>
  )
}

function wellClass(isEmpty: boolean, isFilling: boolean): string {
  return cn(
    isEmpty
      ? "flex flex-col"
      : "flex flex-col gap-s3 rounded-card bg-(--well) p-s3",
    isFilling ? "flex-1" : ""
  )
}

export function DropWell(props: DropWellProps): ReactElement {
  const files = useWellFiles(props)
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  const isFull = props.ids.length >= props.max
  const isEmpty = props.ids.length === 0 && files.uploads.uploads.length === 0
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    files.addFiles(Array.from(event.dataTransfer.files))
  }
  const onPaste = (event: ClipboardEvent<HTMLDivElement>): void => {
    const pasted = Array.from(event.clipboardData.files)
    if (pasted.length > 0) {
      files.addFiles(pasted)
    }
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the well takes dropped and pasted files, and its buttons carry the keyboard path
    <div
      data-slot="drop-well"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onPaste={onPaste}
      className={wellClass(isEmpty, props.fill === true)}
    >
      {props.ids.length === 0 ? null : (
        <FilledTiles
          ids={props.ids}
          onRemove={(id) =>
            props.onChange(props.ids.filter((one) => one !== id))
          }
        />
      )}
      {files.uploads.uploads.map((upload) => (
        <UploadRow
          key={upload.key}
          upload={upload}
          onStop={() => files.uploads.stop(upload.key)}
          onRetry={() => void files.uploads.retry(upload.key)}
          onRemove={() => files.uploads.remove(upload.key)}
        />
      ))}
      <WellFoot
        {...props}
        isFull={isFull}
        onUpload={files.pick}
        onLibrary={() => setLibraryOpen(true)}
      />
      <LibraryPicker
        open={isLibraryOpen}
        onOpenChange={setLibraryOpen}
        kind={props.kind}
        max={props.max - props.ids.length}
        title={t("field.asset.fromLibrary")}
        onDone={(picked) =>
          props.onChange([...props.ids, ...picked].slice(0, props.max))
        }
      />
    </div>
  )
}
