import type { Run } from "@rosesfield/contract"
import {
  Children,
  type CSSProperties,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { FillColumn } from "@/pieces/run/output-row"
import { RunChrome } from "@/pieces/run/run-chrome"
import { runAspect } from "@/pieces/run/run-facts"
import {
  type ChromePlace,
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

type PlaceStyle = CSSProperties & { "--place": number }

const columnCount = 2

const audioHeight = 0.25

const chromeHeight = 0.05

export function columnsOf(
  count: number,
  heights: readonly number[] | undefined
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
  const aspect = runAspect(run)
  const count = Math.max(run.outputs.length, run.count, 1)
  return aspect.height / (aspect.width * count) + chromeHeight
}

export function RunColumns({
  children,
  heights,
}: {
  children: ReactNode
  heights?: readonly number[]
}): ReactElement {
  const items = Children.toArray(children).filter(isValidElement)
  const columns = columnsOf(items.length, heights)
  return (
    <FillColumn>
      <div
        data-slot="run-columns"
        className="grid grid-cols-1 items-start gap-x-s3 gap-y-s6 @regular:grid-cols-2"
      >
        {Array.from({ length: columnCount }, (_, column) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: a column's place is its identity
            key={column}
            data-slot="run-column"
            className="contents @regular:flex @regular:min-w-0 @regular:flex-col @regular:gap-y-s6"
          >
            {items.flatMap((item, place) => {
              const style: PlaceStyle = { "--place": place }
              return columns[place] === column
                ? [
                    <div
                      key={item.key}
                      style={style}
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
    </FillColumn>
  )
}
