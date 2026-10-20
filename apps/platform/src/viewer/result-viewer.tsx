import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { Viewer, type ViewerStep } from "@rosesfield/ui/components/viewer"
import { useMutation } from "@tanstack/react-query"
import { type ReactElement, type ReactNode, useState } from "react"
import { t } from "@/copy/t"
import { runAppName } from "@/pieces/run/run-facts"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { useEntrySrc, type VisualEntry } from "@/screens/explore/explore-tile"
import { useDownloadEntry } from "@/viewer/result-download"
import { ResultPanel } from "@/viewer/result-panel"
import { stageAspectOf, ViewerVideo } from "@/viewer/viewer-video"

export type ShownResult = {
  entry: VisualEntry
  origin: HTMLElement | null
}

export type ShownResultState = {
  shown: ShownResult | null
  isOpen: boolean
  show: (entry: VisualEntry, origin: HTMLElement | null) => void
  step: (entry: VisualEntry) => void
  close: () => void
}

export function useShownResult(): ShownResultState {
  const [shown, setShown] = useState<ShownResult | null>(null)
  const [isOpen, setOpen] = useState(false)
  return {
    shown,
    isOpen,
    show: (entry, origin) => {
      setShown({ entry, origin })
      setOpen(true)
    },
    step: (entry) => setShown({ entry, origin: null }),
    close: () => setOpen(false),
  }
}

type ResultViewerProps = {
  shown: ShownResult | null
  open: boolean
  list: readonly VisualEntry[]
  onClose: () => void
  onStep: (entry: VisualEntry) => void
  onRecreate: (entry: VisualEntry) => void
}

export function stepsOf(
  list: readonly VisualEntry[],
  entry: VisualEntry,
  onStep: (entry: VisualEntry) => void
): { previous?: ViewerStep; next?: ViewerStep } {
  const index = list.findIndex((one) => one.key === entry.key)
  const before = index > 0 ? list[index - 1] : undefined
  const after = index >= 0 ? list[index + 1] : undefined
  return {
    ...(before === undefined
      ? {}
      : {
          previous: {
            label: t("viewer.previous"),
            onSelect: () => onStep(before),
          },
        }),
    ...(after === undefined
      ? {}
      : { next: { label: t("viewer.next"), onSelect: () => onStep(after) } }),
  }
}

function ResultStage({ entry }: { entry: VisualEntry }): ReactElement {
  const src = useEntrySrc(entry)
  const label = t("explore.tile.label", { app: runAppName(entry.run) })
  if (src === null) {
    return <Skeleton className="size-full" />
  }
  if (entry.kind === "video") {
    return <ViewerVideo src={src} label={label} aspect={entry.aspect} />
  }
  return <img src={src} alt={label} className="size-full object-contain" />
}

function ResultLayer({
  shown,
  open,
  list,
  onClose,
  onStep,
  onRecreate,
}: ResultViewerProps & { shown: ShownResult }): ReactElement {
  const { entry } = shown
  const download = useDownloadEntry()
  const saving = useMutation({ mutationFn: download })
  const isRegular = useIsRegularWindow()
  return (
    <Viewer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
      origin={shown.origin}
      aspect={stageAspectOf(entry.aspect, entry.kind, isRegular)}
      title={t("explore.viewer.title", { app: runAppName(entry.run) })}
      closeLabel={t("viewer.close")}
      aside={
        <ResultPanel
          entry={entry}
          isDownloading={saving.isPending}
          onRecreate={() => onRecreate(entry)}
          onDownload={() => saving.mutate(entry)}
        />
      }
      {...stepsOf(list, entry, onStep)}
    >
      <ResultStage key={entry.key} entry={entry} />
    </Viewer>
  )
}

export function ResultViewer(props: ResultViewerProps): ReactNode {
  if (props.shown === null) {
    return null
  }
  return <ResultLayer {...props} shown={props.shown} />
}
