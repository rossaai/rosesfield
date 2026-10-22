import { useRender } from "@base-ui/react/use-render"
import { buttonVariants } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { AppBarDensity } from "@rosesfield/ui/contracts/app-bar.generated"
import { edgeMaskOf, useScrollEnds } from "@rosesfield/ui/hooks/use-scroll-ends"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import {
  type ComponentProps,
  createContext,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
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
  scrolled?: boolean
  className?: string
}

const fade = "var(--spacing-s12)"

function AreaLinks({ children }: { children: ReactNode }): ReactElement {
  const box = useRef<HTMLDivElement>(null)
  const { ends, update } = useScrollEnds(box)
  return (
    <div
      ref={box}
      onScroll={update}
      data-scroll-start={ends.start ? undefined : ""}
      data-slot="app-bar-overflow"
      style={edgeMaskOf(ends, fade)}
      className={cn(
        "hidden h-button min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] @regular:flex",
        interaction.ringRoom
      )}
    >
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}

function seamOffset(): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--spacing-s2_5"
    )
  )
  return Number.isFinite(value) ? value : 0
}

function isScroller(element: Element): boolean {
  const { overflowY } = getComputedStyle(element)
  return overflowY === "auto" || overflowY === "scroll"
}

function scrollerAfter(bar: HTMLElement): HTMLElement | null {
  let next = bar.nextElementSibling
  while (next !== null) {
    if (next instanceof HTMLElement && isScroller(next)) {
      return next
    }
    next = next.nextElementSibling
  }
  return null
}

function useIsScrolled(bar: RefObject<HTMLElement | null>): boolean {
  const [isScrolled, setScrolled] = useState(false)
  useEffect(() => {
    const element = bar.current
    if (element === null) {
      return
    }
    const offset = seamOffset()
    const scroller = scrollerAfter(element)
    const target: HTMLElement | Window = scroller ?? window
    const read = (): void =>
      setScrolled(
        (scroller === null ? window.scrollY : scroller.scrollTop) > offset
      )
    read()
    target.addEventListener("scroll", read, { passive: true })
    return () => target.removeEventListener("scroll", read)
  }, [bar])
  return isScrolled
}

const bars = {
  full: "h-header",
  compact: "h-header @regular:h-tab",
} satisfies Record<AppBarDensity, string>

const marks = {
  full: "h-6 w-9",
  compact: "h-6 w-9 @regular:h-4 @regular:w-6",
} satisfies Record<AppBarDensity, string>

const actions = {
  full: "h-button",
  compact: "h-button @regular:h-button-small @regular:px-s3",
} satisfies Record<AppBarDensity, string>

const DensityContext = createContext<AppBarDensity>("full")

type AppBarActionProps = Omit<ComponentProps<"button">, "children"> & {
  children: string
  tone?: "default" | "primary"
  icon?: ReactNode
  render?: ReactElement
}

function AppBarAction({
  children,
  tone = "default",
  icon,
  render,
  className,
  ...props
}: AppBarActionProps): ReactElement {
  const density = useContext(DensityContext)
  return useRender({
    defaultTagName: "button",
    render,
    props: {
      ...(render === undefined ? { type: "button" as const } : {}),
      ...props,
      "data-slot": "button",
      className: cn(
        buttonVariants({ tone, size: "dense" }),
        actions[density],
        className
      ),
      children: (
        <>
          {icon}
          <span data-slot="button-label" className="min-w-0 truncate">
            {children}
          </span>
        </>
      ),
    },
  })
}

function BarEnd({
  areaMenu,
  balance,
  connect,
}: Pick<AppBarProps, "areaMenu" | "balance" | "connect">): ReactElement {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {areaMenu === undefined ? null : (
        <span className="flex shrink-0 @regular:hidden">{areaMenu}</span>
      )}
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
  scrolled,
  className,
}: AppBarProps): ReactElement {
  const bar = useRef<HTMLElement>(null)
  const isScrolledHere = useIsScrolled(bar)
  const isScrolled = scrolled ?? isScrolledHere
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: a header outside any section is the banner landmark, which ARIA lets aria-label name
    <header
      ref={bar}
      aria-label={label}
      data-slot="app-bar"
      data-density={density}
      data-scrolled={isScrolled ? "yes" : "no"}
      data-ground="canvas"
      className={cn(
        "sticky top-0 z-40 w-full shrink-0 bg-canvas px-s5 data-[scrolled=yes]:material data-[scrolled=yes]:shadow-seam dark:data-[scrolled=yes]:shadow-none dark:data-[scrolled=yes]:[--layer:var(--surface)]",
        motion.tint,
        className
      )}
    >
      <div
        data-slot="app-bar-row"
        className={cn(
          "flex w-full items-center gap-s4",
          motion.yield,
          bars[density]
        )}
      >
        <span
          data-slot="app-bar-mark"
          className={cn(
            "hidden shrink-0 @regular:flex *:size-full",
            motion.yield,
            marks[density]
          )}
        >
          {mark}
        </span>
        <span
          data-slot="app-bar-mark"
          className="flex h-8 shrink-0 @regular:hidden"
        >
          {lockup}
        </span>
        <nav aria-label={label} className="contents">
          <AreaLinks>{areas}</AreaLinks>
        </nav>
        <span className="flex-1 @regular:hidden" />
        <DensityContext value={density}>
          <BarEnd areaMenu={areaMenu} balance={balance} connect={connect} />
        </DensityContext>
      </div>
    </header>
  )
}

export type { AppBarActionProps, AppBarProps }
export { AppBar, AppBarAction }
