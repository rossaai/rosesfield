import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Canvas } from "@rosesfield/ui/components/canvas"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { SearchIcon, UploadIcon } from "lucide-react"
import {
  type DragEvent,
  type ReactElement,
  type ReactNode,
  useState,
} from "react"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { useGridColumns } from "@/pieces/use-columns"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { type Uploads, useUploads } from "@/pieces/use-uploads"
import {
  type LibraryKind,
  LibrarySearch,
  libraryFilterGroups,
  SelectionBar,
} from "@/screens/library/library-bars"
import { LibraryGrid, PendingTiles } from "@/screens/library/library-grid"
import { ResultGrid } from "@/screens/library/result-grid"
import {
  type LibraryData,
  libraryGridItems,
  useLibrary,
} from "@/screens/library/use-library"
import {
  tileSizes,
  ViewCluster,
  type ViewLayout,
} from "@/screens/library/view-cluster"
import { ScreenHeader } from "@/shell/screen-header"
import { useWorkingRuns } from "@/shell/use-working-runs"

const accept: readonly string[] = ["image/*", "video/*", "audio/*"]

function useLibrarySearch(): {
  kind: LibraryKind
  query: string
  setSearch: (next: { kind?: LibraryKind; query?: string }) => void
} {
  const search = useSearch({ from: "/_shell/library" })
  const navigate = useNavigate({ from: "/library" })
  const kind: LibraryKind =
    search.kind === "text" ? "all" : (search.kind ?? "all")
  const query = search.q ?? ""
  const setSearch = (next: { kind?: LibraryKind; query?: string }): void => {
    const k = next.kind ?? kind
    const q = next.query ?? query
    void navigate({
      search: {
        ...(k === "all" ? {} : { kind: k }),
        ...(q === "" ? {} : { q }),
      },
      replace: true,
    })
  }
  return { kind, query, setSearch }
}

function SkeletonRows(): ReactElement {
  const [ref, columns] = useGridColumns()
  return (
    <MediaGrid ref={ref}>
      {Array.from({ length: columns * 3 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
        <Skeleton key={index} />
      ))}
    </MediaGrid>
  )
}

type BodyProps = {
  data: LibraryData
  uploads: Uploads
  selected: string[] | null
  setSelected: (next: string[] | null) => void
  onUpload: () => void
  onClear: () => void
  isFiltered: boolean
  isRegular: boolean
  layout: ViewLayout
  size: number
}

function toggled(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((one) => one !== id) : [...list, id]
}

function LibraryEmpty(props: BodyProps): ReactElement {
  return props.isFiltered ? (
    <StateView
      kind="empty"
      title={t("library.filterEmpty.title")}
      actions={
        <Button onClick={props.onClear}>
          {t("library.filterEmpty.action")}
        </Button>
      }
    />
  ) : (
    <StateView
      kind="empty"
      title={t("library.empty.title")}
      body={t("library.empty.body")}
      actions={
        <Button tone="primary" onClick={props.onUpload}>
          {t("library.empty.action")}
        </Button>
      }
    />
  )
}

function LibraryBody(props: BodyProps): ReactNode {
  const { data, uploads } = props
  const working = useWorkingRuns()
  if (data.isPending) {
    return <SkeletonRows />
  }
  if (data.isError) {
    return (
      <StateView
        kind="failed"
        title={t("library.failed.title")}
        actions={<Button onClick={data.refetch}>{t("state.tryAgain")}</Button>}
      />
    )
  }
  const isEmpty =
    data.shown.length === 0 &&
    uploads.uploads.length === 0 &&
    working.length === 0
  if (isEmpty) {
    return <LibraryEmpty {...props} />
  }
  return (
    <>
      {props.selected === null ? null : (
        <SelectionBar
          selected={props.selected}
          assets={data.assets}
          onCancel={() => props.setSelected(null)}
        />
      )}
      <LibraryResults {...props} working={working} />
    </>
  )
}

function LibraryResults(
  props: BodyProps & { working: ReturnType<typeof useWorkingRuns> }
): ReactElement {
  const { data, uploads, working } = props
  const uploadActions = {
    stop: uploads.stop,
    retry: (key: string) => void uploads.retry(key),
    remove: uploads.remove,
  }
  const sentinel = (
    <span ref={data.sentinel} aria-hidden="true" className="block h-s1" />
  )
  if (props.layout === "grid" && props.selected === null) {
    return (
      <div className="flex flex-col gap-s6">
        <PendingTiles
          uploads={uploads.uploads}
          working={working}
          uploadActions={uploadActions}
        />
        <ResultGrid
          items={libraryGridItems(data)}
          size={props.size}
          after={sentinel}
        />
      </div>
    )
  }
  return (
    <>
      <LibraryGrid
        assets={data.shown}
        runsById={data.runsById}
        working={working}
        uploads={uploads.uploads}
        selected={props.selected}
        onToggle={(id) => props.setSelected(toggled(props.selected ?? [], id))}
        onStartSelect={(id) => props.setSelected([id])}
        isTouch={!props.isRegular}
        uploadActions={uploadActions}
      />
      {sentinel}
    </>
  )
}

function DropLayer({ isShown }: { isShown: boolean }): ReactNode {
  return isShown ? (
    <div
      data-ground="layer"
      className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-scrim"
    >
      <p className="material rounded-card px-s6 py-s4 text-body shadow-float">
        {t("library.drop")}
      </p>
    </div>
  ) : null
}

function useDropUpload(start: (files: readonly File[]) => unknown): {
  isDragging: boolean
  handlers: {
    onDragOver: (event: DragEvent<HTMLDivElement>) => void
    onDragLeave: (event: DragEvent<HTMLDivElement>) => void
    onDrop: (event: DragEvent<HTMLDivElement>) => void
  }
} {
  const [isDragging, setDragging] = useState(false)
  return {
    isDragging,
    handlers: {
      onDragOver: (event) => {
        event.preventDefault()
        setDragging(true)
      },
      onDragLeave: (event) => {
        if (event.currentTarget === event.target) {
          setDragging(false)
        }
      },
      onDrop: (event) => {
        event.preventDefault()
        setDragging(false)
        void start(Array.from(event.dataTransfer.files))
      },
    },
  }
}

function LibraryHeader({
  onSelect,
  onUpload,
  onSearch,
}: {
  onSelect: () => void
  onUpload: () => void
  onSearch: () => void
}): ReactElement {
  return (
    <ScreenHeader
      title={t("library.title")}
      actions={
        <>
          <Button tone="quiet" onClick={onSelect}>
            {t("library.select")}
          </Button>
          <Button tone="primary" onClick={onUpload}>
            {t("library.upload")}
          </Button>
        </>
      }
      phoneAction={
        <>
          <IconButton
            label={t("library.search.label")}
            tone="quiet"
            onClick={onSearch}
          >
            <SearchIcon aria-hidden="true" />
          </IconButton>
          <IconButton
            label={t("library.upload")}
            tone="quiet"
            onClick={onUpload}
          >
            <UploadIcon aria-hidden="true" />
          </IconButton>
        </>
      }
    />
  )
}

type LibraryView = {
  layout: ViewLayout
  setLayout: (layout: ViewLayout) => void
  size: number
  setSize: (size: number) => void
}

function useLibraryView(): LibraryView {
  const [layout, setLayout] = useState<ViewLayout>("list")
  const [size, setSize] = useState<number>(tileSizes.initial)
  return { layout, setLayout, size, setSize }
}

type LibraryCanvasProps = {
  search: ReturnType<typeof useLibrarySearch>
  data: LibraryData
  view: LibraryView
  isSearchOpen: boolean
  isFiltered: boolean
  children: ReactNode
}

function LibraryCanvas(props: LibraryCanvasProps): ReactElement {
  const { search, view } = props
  return (
    <Canvas
      label={t("library.title")}
      tabs={
        <div className="min-w-0 flex-1">
          <LibrarySearch
            query={search.query}
            isSearchOpen={props.isSearchOpen || search.query !== ""}
            onQuery={(next) => search.setSearch({ query: next })}
          />
        </div>
      }
      cluster={
        <ViewCluster
          layout={view.layout}
          onLayout={view.setLayout}
          size={view.size}
          onSize={view.setSize}
          groups={libraryFilterGroups(search.kind, (next) =>
            search.setSearch({ kind: next })
          )}
        />
      }
      hasRuns={props.data.assets.length > 0 || props.isFiltered}
    >
      {props.children}
    </Canvas>
  )
}

export function LibraryScreen(): ReactElement {
  const search = useLibrarySearch()
  const { kind, query, setSearch } = search
  const data = useLibrary(kind, query)
  const uploads = useUploads()
  const device = useDevice()
  const view = useLibraryView()
  const [selected, setSelected] = useState<string[] | null>(null)
  const [isSearchOpen, setSearchOpen] = useState(query !== "")
  const isRegular = useIsRegularWindow()
  const drop = useDropUpload(uploads.start)
  const isFiltered = kind !== "all" || query !== ""
  const upload = (): void => {
    void device.pickFiles({ accept, multiple: true }).then(uploads.start)
  }
  return (
    <div className="flex min-h-full flex-col" {...drop.handlers}>
      <LibraryHeader
        onSelect={() => setSelected(selected === null ? [] : null)}
        onUpload={upload}
        onSearch={() => setSearchOpen(!isSearchOpen)}
      />
      <div className="flex flex-1 flex-col gap-s6 px-s5 pb-s12 @regular:px-s4">
        <LibraryCanvas
          search={search}
          data={data}
          view={view}
          isSearchOpen={isSearchOpen}
          isFiltered={isFiltered}
        >
          <LibraryBody
            data={data}
            uploads={uploads}
            selected={selected}
            setSelected={setSelected}
            onUpload={upload}
            onClear={() => setSearch({ kind: "all", query: "" })}
            isFiltered={isFiltered}
            isRegular={isRegular}
            layout={view.layout}
            size={view.size}
          />
        </LibraryCanvas>
      </div>
      <DropLayer isShown={drop.isDragging} />
    </div>
  )
}
