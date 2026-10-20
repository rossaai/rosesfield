import type { AppBarDensity } from "@rosesfield/ui/contracts/app-bar.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type UIEvent,
  useState,
} from "react"

type AppBarProps = {
  label: string
  mark: ReactNode
  lockup: ReactNode
  areas: ReactNode
  areaMenu?: ReactNode
  balance?: ReactNode
  connect?: ReactNode
  density?: AppBarDensity
  className?: string
}

const fade = "calc(var(--spacing) * 18)"

type Ends = { start: boolean; end: boolean }

function maskOf(ends: Ends): CSSProperties {
  const left = ends.start ? `transparent, black ${fade}` : "black, black"
  const right = ends.end ? `black calc(100% - ${fade}), transparent` : "black"
  const image = `linear-gradient(to right, ${left}, ${right})`
  return { maskImage: image, WebkitMaskImage: image }
}

function readEnds(element: HTMLElement): Ends {
  return {
    start: element.scrollLeft > 0,
    end: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
  }
}

function AreaLinks({ children }: { children: ReactNode }): ReactElement {
  const [ends, setEnds] = useState<Ends>({ start: false, end: false })
  const measure = (element: HTMLElement | null): void => {
    if (element !== null) {
      setEnds((was) => {
        const next = readEnds(element)
        return was.start === next.start && was.end === next.end ? was : next
      })
    }
  }
  const onScroll = (event: UIEvent<HTMLDivElement>): void => {
    setEnds(readEnds(event.currentTarget))
  }
  return (
    <div
      ref={measure}
      onScroll={onScroll}
      data-scroll-start={ends.start ? undefined : ""}
      data-slot="app-bar-overflow"
      style={maskOf(ends)}
      className="hidden h-7 min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] @regular:flex"
    >
      <div className="mx-auto flex shrink-0 items-center">{children}</div>
    </div>
  )
}

const bars = {
  full: "h-13",
  compact: "h-13 @regular:h-9",
} satisfies Record<AppBarDensity, string>

const marks = {
  full: "size-8",
  compact: "size-8 @regular:size-5",
} satisfies Record<AppBarDensity, string>

function BarEnd({
  balance,
  connect,
}: Pick<AppBarProps, "balance" | "connect">): ReactElement {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {balance === undefined ? null : (
        <span data-slot="app-bar-balance" className="flex">
          {balance}
        </span>
      )}
      {connect === undefined ? null : (
        <span data-slot="app-bar-connect" className="hidden @regular:flex">
          {connect}
        </span>
      )}
    </span>
  )
}

function AppBar({
  label,
  mark,
  lockup,
  areas,
  areaMenu,
  balance,
  connect,
  density = "full",
  className,
}: AppBarProps): ReactElement {
  return (
    <header
      aria-label={label}
      data-slot="app-bar"
      data-density={density}
      data-ground="canvas"
      className={cn(
        "sticky top-0 z-40 flex w-full shrink-0 items-center gap-3 bg-canvas px-4 transition-[height] duration-(--duration-surface)",
        bars[density],
        className
      )}
    >
      <span
        data-slot="app-bar-mark"
        className={cn(
          "hidden shrink-0 transition-[width,height] duration-(--duration-surface) @regular:flex *:size-full",
          marks[density]
        )}
      >
        {mark}
      </span>
      <span data-slot="app-bar-mark" className="flex h-8 shrink-0 @regular:hidden">
        {lockup}
      </span>
      <nav aria-label={label} className="contents">
        <AreaLinks>{areas}</AreaLinks>
      </nav>
      <span className="flex-1 @regular:hidden" />
      {areaMenu === undefined ? null : (
        <span className="flex shrink-0 @regular:hidden">{areaMenu}</span>
      )}
      <BarEnd balance={balance} connect={connect} />
    </header>
  )
}

export type { AppBarProps }
export { AppBar }
