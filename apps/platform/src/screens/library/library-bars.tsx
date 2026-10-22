import type { Asset } from "@rosesfield/contract"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import { ConfirmButton } from "@rosesfield/ui/components/confirm-button"
import { Input } from "@rosesfield/ui/components/input"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  DownloadIcon,
  ListChecksIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { t, tCount } from "@/copy/t"
import { useDeleteAssets, useDownloadAsset } from "@/pieces/asset-actions"
import { kindPictures } from "@/screens/library/view-cluster"
import { ScreenHeader } from "@/shell/screen-header"

export type LibraryKind = "all" | "image" | "video" | "audio" | "mesh"

const kindItems: SegmentedItem<LibraryKind>[] = (
  ["all", "image", "video", "audio", "mesh"] as const
).map((kind) => ({
  value: kind,
  label: t(`kind.${kind}`),
  icon: kindPictures[kind],
}))

export function KindTabs({
  kind,
  onKind,
  isRegular,
}: {
  kind: LibraryKind
  onKind: (kind: LibraryKind) => void
  isRegular: boolean
}): ReactElement {
  return (
    <SegmentedControl
      items={
        isRegular
          ? kindItems
          : kindItems.map(({ value, label }) => ({ value, label }))
      }
      value={kind}
      onValueChange={onKind}
      label={t("library.kind.label")}
      density={isRegular ? "chrome" : "row"}
    />
  )
}

type SearchProps = {
  query: string
  isSearchOpen: boolean
  onQuery: (query: string) => void
}

export function LibrarySearch(props: SearchProps): ReactElement {
  return (
    <Input
      type="search"
      aria-label={t("library.search.label")}
      placeholder={t("library.search.placeholder")}
      value={props.query}
      onChange={(event) => props.onQuery(event.target.value)}
      className={cn(
        "max-w-none @regular:w-field-max @regular:max-w-field-max",
        props.isSearchOpen ? "" : "hidden"
      )}
    />
  )
}

type SelectionProps = {
  selected: readonly string[]
  assets: readonly Asset[]
  onCancel: () => void
}

export function useSelectionActs(props: SelectionProps): {
  count: number
  download: () => void
  remove: () => void
  isRemoving: boolean
} {
  const download = useDownloadAsset()
  const remove = useDeleteAssets()
  const chosen = props.assets.filter((asset) =>
    props.selected.includes(asset.id)
  )
  return {
    count: props.selected.length,
    download: () => void Promise.all(chosen.map(download)),
    remove: () =>
      remove.mutate(props.selected, { onSuccess: () => props.onCancel() }),
    isRemoving: remove.isPending,
  }
}

export function SelectionActions(props: SelectionProps): ReactElement {
  const acts = useSelectionActs(props)
  return (
    <>
      <p
        data-slot="selection-count"
        className="min-w-0 truncate font-medium text-body"
      >
        {tCount("library.selected", acts.count)}
      </p>
      <Button tone="quiet" disabled={acts.count === 0} onClick={acts.download}>
        <DownloadIcon aria-hidden="true" />
        {t("library.selection.download")}
      </Button>
      <ConfirmButton
        icon={<Trash2Icon />}
        label={t("library.selection.delete")}
        disabled={acts.count === 0}
        busy={acts.isRemoving}
        onConfirm={acts.remove}
      />
      <Button tone="quiet" onClick={props.onCancel}>
        {t("library.selection.cancel")}
      </Button>
    </>
  )
}

export function PhoneSelectionActions(props: SelectionProps): ReactElement {
  const acts = useSelectionActs(props)
  return (
    <>
      <span
        data-slot="selection-count"
        className="px-s1 font-medium text-body tabular-nums"
      >
        {acts.count}
      </span>
      <IconButton
        label={t("library.selection.download")}
        tone="quiet"
        disabled={acts.count === 0}
        onClick={acts.download}
      >
        <DownloadIcon aria-hidden="true" />
      </IconButton>
      <ConfirmButton
        icon={<Trash2Icon />}
        label={t("library.selection.delete")}
        disabled={acts.count === 0}
        busy={acts.isRemoving}
        onConfirm={acts.remove}
      />
      <IconButton
        label={t("library.selection.cancel")}
        tone="quiet"
        onClick={props.onCancel}
      >
        <XIcon aria-hidden="true" />
      </IconButton>
    </>
  )
}

type HeaderProps = {
  onSelect: () => void
  onUpload: () => void
  onSearch: () => void
  search: ReactNode
  selection: SelectionProps | null
}

function RestActions(props: HeaderProps): ReactElement {
  return (
    <>
      {props.search}
      <Button tone="quiet" onClick={props.onSelect}>
        {t("library.select")}
      </Button>
      <Button tone="primary" onClick={props.onUpload}>
        {t("library.upload")}
      </Button>
    </>
  )
}

function PhoneRestActions(props: HeaderProps): ReactElement {
  return (
    <>
      <IconButton
        label={t("library.search.label")}
        tone="quiet"
        onClick={props.onSearch}
      >
        <SearchIcon aria-hidden="true" />
      </IconButton>
      <IconButton
        label={t("library.select")}
        tone="quiet"
        onClick={props.onSelect}
      >
        <ListChecksIcon aria-hidden="true" />
      </IconButton>
      <IconButton
        label={t("library.upload")}
        tone="quiet"
        onClick={props.onUpload}
      >
        <UploadIcon aria-hidden="true" />
      </IconButton>
    </>
  )
}

export function LibraryHeader(props: HeaderProps): ReactElement {
  const { selection } = props
  return (
    <ScreenHeader
      title={t("library.title")}
      actions={
        selection === null ? (
          <RestActions {...props} />
        ) : (
          <SelectionActions {...selection} />
        )
      }
      phoneAction={
        selection === null ? (
          <PhoneRestActions {...props} />
        ) : (
          <PhoneSelectionActions {...selection} />
        )
      }
    />
  )
}
