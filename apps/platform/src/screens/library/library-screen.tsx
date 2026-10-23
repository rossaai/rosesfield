import { Button } from "@rosesfield/ui/components/button"
import { Canvas } from "@rosesfield/ui/components/canvas"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useNavigate, useSearch } from "@tanstack/react-router"
import {
  type DragEvent,
  type ReactElement,
  type ReactNode,
  useState,
} from "react"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { type Uploads, useUploads } from "@/pieces/use-uploads"
import {
  KindTabs,
  LibraryHeader,
  type LibraryKind,
  LibrarySearch,
} from "@/screens/library/library-bars"
import {
  GridSkeleton,
  PagingSkeleton,
  PendingTiles,
} from "@/screens/library/library-grid"
import { LibraryRows } from "@/screens/library/library-rows"
import { libraryLayout } from "@/screens/library/library-view"
import { ResultGrid } from "@/screens/library/result-grid"
import {
  type LibraryData,
  libraryGridItems,
  useLibrary,
} from "@/screens/library/use-library"
import {
  appFilterGroups,
  type DateChoice,
  dateFilterGroup,
  isWithinDate,
  tileSizes,
  type ViewLayout,
  ViewMenu,
} from "@/screens/library/view-cluster"
import { useWorkingRuns } from "@/shell/use-working-runs"

const accept: readonly string[] = ["image/*", "video/*", "audio/*"]

type SearchChange = {
  kind?: LibraryKind
  query?: string
  appId?: string | null
}

function useLibrarySearch(): {
  kind: LibraryKind
  query: string
  appId: string | null
  setSearch: (next: SearchChange) => void
} {
  const search = useSearch({ from: "/_shell/library" })
  const navigate = useNavigate({ from: "/library" })
  const kind: LibraryKind =
    search.kind === "text" ? "all" : (search.kind ?? "all")
  const query = search.q ?? ""
  const appId = search.app ?? null
  const setSearch = (next: SearchChange): void => {
    const k = next.kind ?? kind
    const q = next.query ?? query
    const a = next.appId === undefined ? appId : next.appId
    void navigate({
      search: {
        ...(k === "all" ? {} : { kind: k }),
        ...(q === "" ? {} : { q }),
        ...(a === null ? {} : { app: a }),
      },
      replace: true,
    })
  }
  return { kind, query, appId, setSearch }
}

type BodyProps = {
  data: LibraryData
  uploads: Uploads
  selected: string[] | null
  setSelected: (next: string[] | null) => void
  onUpload: () => void
  onClear: () => void
  isFiltered: boolean
  layout: ViewLayout
  size: number
  date: DateChoice
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
  const { uploads } = props
  const now = new Date()
  const data = {
    ...props.data,
    shown: props.data.shown.filter((asset) =>
      isWithinDate(asset.createdAt, props.date, now)
    ),
  }
  const working = useWorkingRuns()
  if (data.isPending) {
    return <GridSkeleton size={props.size} />
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
  if (isEmpty && data.hasMore) {
    return (
      <PagingSkeleton
        size={props.size}
        isFetching={data.isFetchingMore}
        fetchMore={data.fetchMore}
      />
    )
  }
  if (isEmpty) {
    return <LibraryEmpty {...props} />
  }
  return <LibraryResults {...props} data={data} working={working} />
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
  const { shown } = data
  const selected = props.selected
  const onToggle = (id: string): void =>
    props.setSelected(toggled(selected ?? [], id))
  return (
    <div className="flex flex-col gap-s6">
      <PendingTiles
        uploads={uploads.uploads}
        working={working}
        uploadActions={uploadActions}
      />
      {props.layout === "grid" ? (
        <ResultGrid
          items={libraryGridItems({ ...data, shown })}
          size={props.size}
          after={sentinel}
          {...(selected === null ? {} : { selection: { selected, onToggle } })}
        />
      ) : (
        <>
          <LibraryRows
            assets={shown}
            runsById={data.runsById}
            selected={selected}
            onToggle={onToggle}
          />
          {sentinel}
        </>
      )}
    </div>
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

type LibraryView = {
  layout: ViewLayout
  setLayout: (layout: ViewLayout) => void
  size: number
  setSize: (size: number) => void
  date: DateChoice
  setDate: (date: DateChoice) => void
}

function useLibraryView(): LibraryView {
  const [layout, setLayout] = useState<ViewLayout>(libraryLayout)
  const [size, setSize] = useState<number>(tileSizes.initial)
  const [date, setDate] = useState<DateChoice>("any")
  return { layout, setLayout, size, setSize, date, setDate }
}

type LibraryCanvasProps = {
  search: ReturnType<typeof useLibrarySearch>
  data: LibraryData
  view: LibraryView
  isFiltered: boolean
  isRegular: boolean
  children: ReactNode
}

function LibraryCanvas(props: LibraryCanvasProps): ReactElement {
  const { search, view, data } = props
  const hasRuns = data.assets.length > 0 || props.isFiltered
  const viewMenu =
    hasRuns || data.isPending ? (
      <ViewMenu
        layout={view.layout}
        onLayout={view.setLayout}
        size={view.size}
        onSize={view.setSize}
        isLoading={data.isPending}
        groups={[
          ...appFilterGroups(search.appId, (next) =>
            search.setSearch({ appId: next })
          ),
          dateFilterGroup(view.date, view.setDate),
        ]}
      />
    ) : null
  return (
    <Canvas
      label={t("library.title")}
      inset="page"
      tabs={
        <div
          data-slot="library-tabs"
          className="flex min-w-0 flex-1 items-center justify-between gap-s3"
        >
          <KindTabs
            kind={search.kind}
            onKind={(next) => search.setSearch({ kind: next })}
          />
          {props.isRegular ? null : viewMenu}
        </div>
      }
      {...(props.isRegular ? { cluster: viewMenu } : {})}
      hasRuns={props.isRegular && viewMenu !== null}
    >
      {props.children}
    </Canvas>
  )
}

function useLibraryUpload(): {
  uploads: Uploads
  upload: () => void
  drop: ReturnType<typeof useDropUpload>
} {
  const uploads = useUploads()
  const device = useDevice()
  const drop = useDropUpload(uploads.start)
  return {
    uploads,
    upload: () =>
      void device.pickFiles({ accept, multiple: true }).then(uploads.start),
    drop,
  }
}

export function LibraryScreen(): ReactElement {
  const search = useLibrarySearch()
  const { kind, query, appId, setSearch } = search
  const data = useLibrary(kind, query, appId)
  const { uploads, upload, drop } = useLibraryUpload()
  const view = useLibraryView()
  const [selected, setSelected] = useState<string[] | null>(null)
  const [isSearchOpen, setSearchOpen] = useState(query !== "")
  const isRegular = useIsRegularWindow()
  const isFiltered = kind !== "all" || query !== "" || appId !== null
  const searchField = (
    <LibrarySearch
      query={query}
      isSearchOpen={true}
      onQuery={(next) => setSearch({ query: next })}
    />
  )
  return (
    <div className="flex min-h-full flex-col" {...drop.handlers}>
      <LibraryHeader
        onSelect={() => setSelected(selected === null ? [] : null)}
        onUpload={upload}
        onSearch={() => setSearchOpen(!isSearchOpen)}
        search={searchField}
        selection={
          selected && {
            selected,
            assets: data.assets,
            onCancel: () => setSelected(null),
          }
        }
      />
      <div className="flex flex-1 flex-col gap-s3 px-s5 pb-s12">
        {isRegular || !(isSearchOpen || query !== "") ? null : searchField}
        <LibraryCanvas
          search={search}
          data={data}
          view={view}
          isFiltered={isFiltered || view.date !== "any"}
          isRegular={isRegular}
        >
          <LibraryBody
            data={data}
            uploads={uploads}
            selected={selected}
            setSelected={setSelected}
            onUpload={upload}
            onClear={() => {
              view.setDate("any")
              setSearch({ kind: "all", query: "", appId: null })
            }}
            isFiltered={isFiltered || view.date !== "any"}
            layout={view.layout}
            size={view.size}
            date={view.date}
          />
        </LibraryCanvas>
      </div>
      <DropLayer isShown={drop.isDragging} />
    </div>
  )
}
