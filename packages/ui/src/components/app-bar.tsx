import { useRender } from "@base-ui/react/use-render"
import { buttonVariants } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { AppBarDensity } from "@rosesfield/ui/contracts/app-bar.generated"
import { edgeMaskOf, useScrollEnds } from "@rosesfield/ui/hooks/use-scroll-ends"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion, prefersReducedMotion } from "@rosesfield/ui/motion"
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

const rowFade = "var(--spacing-s8)"

const wheelLine = 16

type Wheel = Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode">

type Scroller = Pick<HTMLElement, "scrollLeft" | "clientWidth" | "scrollWidth">

function wheeledLeft(wheel: Wheel, row: Scroller): number | null {
  if (Math.abs(wheel.deltaX) >= Math.abs(wheel.deltaY)) {
    return null
  }
  const unit =
    wheel.deltaMode === 1
      ? wheelLine
      : wheel.deltaMode === 2
        ? row.clientWidth
        : 1
  const end = Math.max(0, row.scrollWidth - row.clientWidth)
  const left = Math.min(end, Math.max(0, row.scrollLeft + wheel.deltaY * unit))
  return left === row.scrollLeft ? null : left
}

function revealLink(link: Element, behavior: ScrollBehavior): void {
  link.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior })
}

function useRowInput(row: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = row.current
    if (element === null) {
      return
    }
    const turn = (event: WheelEvent): void => {
      const left = wheeledLeft(event, element)
      if (left === null) {
        return
      }
      event.preventDefault()
      element.scrollLeft = left
    }
    const follow = (event: FocusEvent): void => {
      if (event.target instanceof Element) {
        revealLink(event.target, "auto")
      }
    }
    element.addEventListener("wheel", turn, { passive: false })
    element.addEventListener("focusin", follow)
    return () => {
      element.removeEventListener("wheel", turn)
      element.removeEventListener("focusin", follow)
    }
  }, [row])
}

function useRevealCurrent(row: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = row.current
    if (element === null) {
      return
    }
    let shown: Element | null = null
    const reveal = (behavior: ScrollBehavior): void => {
      const current = element.querySelector("[aria-current='page']")
      if (current !== null && current !== shown) {
        revealLink(current, behavior)
      }
      shown = current
    }
    reveal("auto")
    const changes = new MutationObserver(() =>
      reveal(prefersReducedMotion() ? "auto" : "smooth")
    )
    changes.observe(element, {
      subtree: true,
      childList: true,
      attributeFilter: ["aria-current"],
    })
    return () => changes.disconnect()
  }, [row])
}

function AreaLinks({ children }: { children: ReactNode }): ReactElement {
  const row = useRef<HTMLDivElement>(null)
  const { ends, update } = useScrollEnds(row)
  useRowInput(row)
  useRevealCurrent(row)
  return (
    <div
      ref={row}
      data-slot="app-bar-overflow"
      data-overflow={ends.start || ends.end ? "" : undefined}
      data-scroll-start={ends.start ? "yes" : "no"}
      data-scroll-end={ends.end ? "yes" : "no"}
      onScroll={update}
      style={edgeMaskOf(ends, rowFade)}
      className={cn(
        "hidden h-button min-w-0 flex-1 scroll-px-s8 items-center overflow-x-auto overscroll-x-contain [scrollbar-width:none] @regular:flex",
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
