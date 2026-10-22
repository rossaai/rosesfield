import type { Run } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { Skeleton, SkeletonGroup } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  Children,
  type CSSProperties,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { aspectStyle } from "@/pieces/asset-tile"
import { OutputRow } from "@/pieces/run/output-row"
import { RunChrome } from "@/pieces/run/run-chrome"
import {
  type ChromePlace,
  outputAspectOf,
  type RunChromeOf,
  RunOutputs,
} from "@/pieces/run/run-outputs"

type RunCardProps = {
  run: Run
  list?: readonly string[]
  onUseInputs?: (run: Run) => void
  afterRun?: ((run: Run) => ReactNode) | undefined
  children?: (chrome: RunChromeOf) => ReactNode
}

export function RunCard({
  run,
  list,
  onUseInputs,
  afterRun,
  children,
}: RunCardProps): ReactElement {
  const chrome = (place: ChromePlace): ReactNode => (
    <RunChrome
      run={run}
      place={place}
      {...(onUseInputs === undefined ? {} : { onUseInputs })}
    />
  )
  return (
    <article
      data-slot="run-card"
      className="group/reveal flex min-w-0 flex-col gap-s2"
    >
      {children === undefined ? (
        <RunOutputs
          run={run}
          chrome={chrome}
          {...(list === undefined ? {} : { list })}
        />
      ) : (
        children(chrome)
      )}
      {afterRun?.(run)}
    </article>
  )
}

export function RunCardSkeleton({
  aspect,
}: {
  aspect: MediaAspect
}): ReactElement {
  return (
    <article
      data-slot="run-card"
      data-state="loading"
      className="flex min-w-0 flex-col gap-s2"
    >
      <SkeletonGroup>
        <OutputRow aspects={[aspect]}>
          {() => (
            <div
              data-slot="run-card-media"
              className="relative w-full rounded-cell bg-(--tint)"
              style={aspectStyle(aspect)}
            >
              <span
                data-slot="run-card-facts"
                className="absolute start-s2 top-s2 flex gap-s1"
              >
                <Skeleton shape="chip" size="chip" ground="canvas" />
              </span>
              <span
                data-slot="run-card-actions"
                className="absolute end-s2 top-s2 flex"
              >
                <Skeleton shape="circle" size="dense" ground="canvas" />
              </span>
            </div>
          )}
        </OutputRow>
      </SkeletonGroup>
    </article>
  )
}

type PlaceStyle = CSSProperties & { "--place": number }

type ColumnsStyle = CSSProperties & { "--run-columns": string }

export const runColumnsDefault = 2

const columnStart = "@regular:[&_[data-slot=output-row]]:ms-0"

const audioHeight = 0.25

const chromeHeight = 0.05

export function columnsOf(
  count: number,
  heights: readonly number[] | undefined,
  columnCount: number = runColumnsDefault
): number[] {
  const filled = Array.from({ length: columnCount }, () => 0)
  return Array.from({ length: count }, (_, place) => {
    const column =
      heights === undefined
        ? place % columnCount
        : filled.indexOf(Math.min(...filled))
    filled[column] = (filled[column] ?? 0) + (heights?.[place] ?? 1)
    return column
  })
}

export function runHeightOf(run: Run): number {
  const kind = findCatalogApp(run.appId)?.output.kind ?? "image"
  if (kind === "audio" || kind === "text") {
    return audioHeight
  }
  const aspect = outputAspectOf(run)
  const count = Math.max(run.outputs.length, run.count, 1)
  return aspect.height / (aspect.width * count) + chromeHeight
}

export function RunColumns({
  children,
  heights,
  columns = runColumnsDefault,
}: {
  children: ReactNode
  heights?: readonly number[]
  columns?: number
}): ReactElement {
  const items = Children.toArray(children).filter(isValidElement)
  const count = Math.max(1, Math.round(columns))
  const placed = columnsOf(items.length, heights, count)
  const style: ColumnsStyle = {
    "--run-columns": `repeat(${count}, minmax(0, 1fr))`,
  }
  return (
    <div
      data-slot="run-columns"
      data-columns={count}
      style={style}
      className={cn(
        "grid grid-cols-1 items-start gap-s2 @regular:grid-cols-(--run-columns)",
        count > 1 ? columnStart : ""
      )}
    >
      {Array.from({ length: count }, (_, column) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a column's place is its identity
          key={column}
          data-slot="run-column"
          className="contents @regular:flex @regular:min-w-0 @regular:flex-col @regular:gap-s2"
        >
          {items.flatMap((item, place) => {
            const placeStyle: PlaceStyle = { "--place": place }
            return placed[place] === column
              ? [
                  <div
                    key={item.key}
                    style={placeStyle}
                    className="order-(--place) min-w-0 @regular:order-none"
                  >
                    {item}
                  </div>,
                ]
              : []
          })}
        </div>
      ))}
    </div>
  )
}
