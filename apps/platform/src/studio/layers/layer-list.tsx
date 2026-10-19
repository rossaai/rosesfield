import { IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { EllipsisIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import type { ReactElement } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { t, tCatalog } from "@/copy/t"
import type { StackLayer } from "@/studio/layers/layer-stack"
import type { PixelSize } from "@/studio/layers/stack-images"

export type LayerRow = {
  layer: StackLayer
  shown: string
  isHidden: boolean
  isPicked: boolean
  isTop: boolean
  isBottom: boolean
}

export type LayerActions = {
  pick: (key: string) => void
  toggle: (key: string) => void
  move: (key: string, step: -1 | 1) => void
  choose: (key: string, version: string) => void
}

function Thumb({
  assetId,
  size,
  className,
}: {
  assetId: string
  size: PixelSize | null
  className?: string
}): ReactElement {
  const source = useAssetSource(assetId)
  return (
    <span
      className={cn(
        "relative block aspect-square shrink-0 overflow-hidden bg-(--well)",
        className
      )}
      style={
        size === null
          ? undefined
          : { aspectRatio: `${size.width} / ${size.height}` }
      }
    >
      {source.state === "ready" ? (
        <img
          src={source.src}
          alt=""
          className="absolute inset-0 size-full object-contain"
        />
      ) : null}
    </span>
  )
}

function Versions({
  row,
  actions,
  size,
}: {
  row: LayerRow
  actions: LayerActions
  size: PixelSize | null
}): ReactElement | null {
  const { layer } = row
  if (layer.versions.length < 2 && layer.working === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap gap-s1">
      {layer.versions.map((version, index) => (
        <button
          key={version}
          type="button"
          aria-pressed={version === row.shown}
          aria-label={tCatalog("layers.layer.version", { number: index + 1 })}
          onClick={() => actions.choose(layer.key, version)}
          className={cn(
            "rounded-cell p-s1",
            version === row.shown ? "bg-selection" : "bg-transparent"
          )}
        >
          <Thumb assetId={version} size={size} className="h-s6 rounded-dense" />
        </button>
      ))}
      {layer.working > 0 ? (
        <Skeleton className="size-s6 rounded-dense" />
      ) : null}
    </div>
  )
}

export function LayerControls({
  row,
  actions,
}: {
  row: LayerRow
  actions: LayerActions
}): ReactElement {
  const number = row.layer.number
  const { key } = row.layer
  return (
    <div className="flex shrink-0 items-center gap-s1_5">
      <IconButton
        size="small"
        label={tCatalog(
          row.isHidden ? "layers.layer.show" : "layers.layer.hide",
          { number }
        )}
        onClick={() => actions.toggle(key)}
      >
        {row.isHidden ? (
          <EyeOffIcon aria-hidden="true" />
        ) : (
          <EyeIcon aria-hidden="true" />
        )}
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton size="small" label={t("menu.more")}>
              <EllipsisIcon aria-hidden="true" />
            </IconButton>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={row.isTop}
            onClick={() => actions.move(key, 1)}
          >
            {tCatalog("layers.layer.up", { number })}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={row.isBottom}
            onClick={() => actions.move(key, -1)}
          >
            {tCatalog("layers.layer.down", { number })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Row({
  row,
  actions,
  size,
}: {
  row: LayerRow
  actions: LayerActions
  size: PixelSize | null
}): ReactElement {
  return (
    <li
      className={cn(
        "flex flex-col gap-s1 rounded-cell p-s1",
        row.isPicked ? "bg-selection" : "bg-transparent"
      )}
    >
      <div className="flex min-w-0 items-center gap-s2">
        <button
          type="button"
          aria-pressed={row.isPicked}
          onClick={() => actions.pick(row.layer.key)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-s2 text-left",
            row.isHidden ? "opacity-(--opacity-disabled)" : "opacity-100"
          )}
        >
          <Thumb
            assetId={row.shown}
            size={size}
            className="h-s8 rounded-dense"
          />
          <span className="truncate text-body">
            {tCatalog("layers.layer.name", { number: row.layer.number })}
          </span>
        </button>
        <LayerControls row={row} actions={actions} />
      </div>
      <Versions row={row} actions={actions} size={size} />
    </li>
  )
}

export function LayerList({
  rows,
  actions,
  size,
}: {
  rows: readonly LayerRow[]
  actions: LayerActions
  size: PixelSize | null
}): ReactElement {
  return (
    <ul
      aria-label={tCatalog("layers.stack.title")}
      className="flex flex-col gap-s1"
    >
      {rows.map((row) => (
        <Row key={row.layer.key} row={row} actions={actions} size={size} />
      ))}
    </ul>
  )
}

export function LayerStrip({
  rows,
  actions,
  size,
}: {
  rows: readonly LayerRow[]
  actions: LayerActions
  size: PixelSize | null
}): ReactElement {
  const picked = rows.find((row) => row.isPicked)
  return (
    <div className="flex flex-col gap-s2">
      <ul
        aria-label={tCatalog("layers.stack.title")}
        className="flex gap-s2 overflow-x-auto"
      >
        {rows.map((row) => (
          <li key={row.layer.key}>
            <button
              type="button"
              aria-pressed={row.isPicked}
              aria-label={tCatalog("layers.layer.pick", {
                number: row.layer.number,
              })}
              onClick={() => actions.pick(row.layer.key)}
              className={cn(
                "rounded-cell p-s1",
                row.isPicked ? "bg-selection" : "bg-transparent",
                row.isHidden ? "opacity-(--opacity-disabled)" : "opacity-100"
              )}
            >
              <Thumb
                assetId={row.shown}
                size={size}
                className="h-thumb rounded-cell"
              />
            </button>
          </li>
        ))}
      </ul>
      {picked === undefined ? null : (
        <div className="flex items-center justify-between gap-s2">
          <Versions row={picked} actions={actions} size={size} />
          <LayerControls row={picked} actions={actions} />
        </div>
      )}
    </div>
  )
}
