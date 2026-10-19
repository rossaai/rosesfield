import { appId, type Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { WorkingPulse } from "@rosesfield/ui/components/working-pulse"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/gallery/copy.en"
import {
  galleryApp,
  galleryAssets,
  galleryRun,
} from "@/gallery/fixtures/platform-fixtures"
import { GalleryData } from "@/gallery/gallery-data"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { DropWell } from "@/pieces/drop-well"
import { UploadRow } from "@/pieces/upload-row"
import { NoModel } from "@/screens/agent/agent-parts"
import { CanvasSkeleton } from "@/screens/app/app-canvas"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { HistoryRow, HistoryRowSkeleton } from "@/screens/history/history-row"

const shown = {
  appId: appId.parse("image"),
  outputs: [galleryAssets.wide.id, galleryAssets.square.id],
}

const working = galleryRun({
  ...shown,
  status: "running",
  outputs: [],
  progress: 0.4,
  createdAt: new Date().toISOString(),
  finishedAt: null,
})

const failed = galleryRun({
  ...shown,
  status: "failed",
  outputs: [],
  failure: { code: "ENGINE_UNAVAILABLE", status: 502 },
})

function Rows({ runs }: { runs: readonly Run[] }): ReactElement {
  return (
    <GalleryData>
      <ul className="w-full">
        {runs.map((run) => (
          <HistoryRow key={`${run.id}-${run.status}`} run={run} />
        ))}
      </ul>
    </GalleryData>
  )
}

function Data({ children }: { children: ReactNode }): ReactElement {
  return <GalleryData>{children}</GalleryData>
}

const historyRows: GalleryEntry = {
  id: "history-rows",
  title: "entry.historyRows",
  states: [
    {
      id: "loading",
      label: "state.loading",
      render: () => (
        <ul className="w-full">
          {[0, 1, 2].map((index) => (
            <HistoryRowSkeleton key={index} />
          ))}
        </ul>
      ),
    },
    {
      id: "working",
      label: "state.working",
      render: () => <Rows runs={[working]} />,
    },
    {
      id: "done",
      label: "state.done",
      render: () => <Rows runs={[galleryRun(shown)]} />,
    },
    {
      id: "failed",
      label: "state.failed",
      render: () => <Rows runs={[failed]} />,
    },
  ],
}

const appCanvas: GalleryEntry = {
  id: "app-canvas",
  title: "entry.appCanvas",
  states: [
    {
      id: "loading",
      label: "state.loading",
      render: () => <CanvasSkeleton app={galleryApp} />,
    },
  ],
}

const libraryTiles: GalleryEntry = {
  id: "library-tiles",
  title: "entry.libraryTiles",
  states: [
    {
      id: "loading",
      label: "state.loading",
      render: () => (
        <MediaGrid className="w-full">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} />
          ))}
        </MediaGrid>
      ),
    },
    {
      id: "working",
      label: "state.working",
      render: () => (
        <MediaGrid className="w-full">
          <div className="flex flex-col justify-end rounded-cell bg-(--well) p-s2">
            <UploadRow
              upload={{
                key: "uploading",
                file: new File([new Uint8Array(4)], "portrait.png", {
                  type: "image/png",
                }),
                progress: 0.6,
                status: "uploading",
                asset: null,
              }}
              onStop={() => undefined}
              onRetry={() => undefined}
              onRemove={() => undefined}
            />
          </div>
          <WorkingPulse label={t("sample.working")} />
          <WorkingPulse label={t("sample.working")} />
        </MediaGrid>
      ),
    },
    {
      id: "failed",
      label: "state.failed",
      render: () => (
        <StateView
          kind="failed"
          title={t("sample.libraryFailed")}
          actions={<Button>{t("sample.tryAgain")}</Button>}
        />
      ),
    },
  ],
}

const assetField: GalleryEntry = {
  id: "asset-field",
  title: "entry.assetField",
  states: [
    {
      id: "invalid",
      label: "state.invalid",
      render: () => (
        <Data>
          <FieldFrame
            caption={t("sample.photo.caption")}
            isOptional={false}
            note={null}
            problem={undefined}
            message={t("sample.photo.invalid")}
          >
            <DropWell
              kind="image"
              ids={[]}
              max={1}
              onChange={() => undefined}
              onMessage={() => undefined}
              limits={t("sample.photo.limits")}
            />
          </FieldFrame>
        </Data>
      ),
    },
  ],
}

const agentComposer: GalleryEntry = {
  id: "agent-composer",
  title: "entry.agentComposer",
  states: [
    {
      id: "no-model",
      label: "state.noModel",
      render: () => <NoModel />,
    },
    {
      id: "reply-failed",
      label: "state.failed",
      render: () => (
        <StateView
          kind="failed"
          density="compact"
          title={t("sample.agentFailed")}
          body={t("sample.failed.body")}
          actions={<Button>{t("sample.tryAgain")}</Button>}
        />
      ),
    },
  ],
}

export const screenStateEntries: GalleryEntry[] = [
  appCanvas,
  historyRows,
  libraryTiles,
  assetField,
  agentComposer,
]
