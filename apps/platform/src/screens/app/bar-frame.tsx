import type { AppListing, Run } from "@rosesfield/contract"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@rosesfield/ui/components/sheet"
import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useCanvasFit } from "@/pieces/use-canvas-fit"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCanvas } from "@/screens/app/app-canvas"
import { AppStage } from "@/screens/app/app-stage"
import type { SheetControl } from "@/screens/app/column-frame"
import { ToolsKey } from "@/screens/app/tools-key"

export type BarPlace = "dock" | "sheet"

type BarFrameProps = {
  app: AppListing
  hasRuns: boolean | null
  onUseInputs: (run: Run) => void
  bar: (place: BarPlace) => ReactNode
  settings: ReactNode
  sheet: SheetControl
}

function useBottomScroll(
  hasRuns: boolean | null
): (node: HTMLElement | null) => void {
  const [node, setNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (node === null || hasRuns !== true) {
      return
    }
    let isPinned = true
    const toBottom = (): void => {
      if (isPinned) {
        node.scrollTop = node.scrollHeight
      }
    }
    const onScroll = (): void => {
      isPinned = node.scrollHeight - node.scrollTop - node.clientHeight < 1
    }
    const sizes =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(toBottom)
    const watch = (): void => {
      for (const child of node.children) {
        sizes?.observe(child)
      }
    }
    const children =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            watch()
            toBottom()
          })
    watch()
    children?.observe(node, { childList: true })
    toBottom()
    node.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      sizes?.disconnect()
      children?.disconnect()
      node.removeEventListener("scroll", onScroll)
    }
  }, [node, hasRuns])
  return setNode
}

function useDockCover(): {
  stageRef: (node: HTMLElement | null) => void
  dockRef: (node: HTMLElement | null) => void
} {
  const [stage, setStage] = useState<HTMLElement | null>(null)
  const [dock, setDock] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (stage === null || dock === null) {
      return
    }
    const cover = (): void => {
      stage.style.setProperty("--covered-bottom", `${dock.offsetHeight}px`)
    }
    cover()
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(cover)
    observer?.observe(dock)
    return () => {
      observer?.disconnect()
      stage.style.removeProperty("--covered-bottom")
    }
  }, [stage, dock])
  return { stageRef: setStage, dockRef: setDock }
}

export function BarFrame(props: BarFrameProps): ReactElement {
  const [isOpen, setOpen] = props.sheet
  const isRegular = useIsRegularWindow()
  const fit = useCanvasFit()
  const bottom = useBottomScroll(props.hasRuns)
  const cover = useDockCover()
  const fitRef = fit.ref
  const scrollRef = useCallback(
    (element: HTMLElement | null) => {
      fitRef(element)
      bottom(element)
    },
    [fitRef, bottom]
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{appName(props.app)}</h1>
      <div
        ref={cover.stageRef}
        data-slot="bar-stage"
        className="flex min-h-0 flex-1 pb-4"
      >
        <AppStage
          app={props.app}
          kind="bar"
          scrollRef={scrollRef}
          scrollClassName="px-4 pb-4 @regular:pb-36"
        >
          <AppCanvas
            app={props.app}
            order="newest-last"
            onUseInputs={props.onUseInputs}
          />
        </AppStage>
      </div>
      {isRegular ? (
        <div
          ref={cover.dockRef}
          data-slot="prompt-dock"
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-220 flex-col items-center gap-2"
        >
          {props.bar("dock")}
        </div>
      ) : null}
      <ToolsKey onOpen={() => setOpen(true)} />
      <Sheet open={isOpen && !isRegular} onOpenChange={setOpen}>
        <SheetContent side="bottom" closeLabel={t("viewer.close")}>
          <SheetHeader>
            <SheetTitle>{appName(props.app)}</SheetTitle>
          </SheetHeader>
          <SheetBody>{props.settings}</SheetBody>
          <SheetFooter>{isRegular ? null : props.bar("sheet")}</SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function BarChips({ chips }: { chips: ReactNode }): ReactElement {
  return (
    <span
      data-slot="bar-chips"
      className="flex min-w-0 shrink-0 items-center gap-1 *:flex-nowrap *:gap-1"
    >
      {chips}
    </span>
  )
}
