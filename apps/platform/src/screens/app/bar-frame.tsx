import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
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
import { t } from "@/copy/t"
import { ContentEndMark, Dock, useContentEnd } from "@/pieces/dock"
import { useCanvasFit } from "@/pieces/use-canvas-fit"
import { AppCanvas } from "@/screens/app/app-canvas"
import { AppHeader } from "@/screens/app/app-header"
import type { SheetControl } from "@/screens/app/column-frame"

type BarFrameProps = {
  app: AppListing
  hasRuns: boolean | null
  onUseInputs: (run: Run) => void
  bar: ReactNode
  settings: ReactNode
  price: string
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

export function BarFrame(props: BarFrameProps): ReactElement {
  const [isOpen, setOpen] = props.sheet
  const fit = useCanvasFit()
  const end = useContentEnd()
  const bottom = useBottomScroll(props.hasRuns)
  const fitRef = fit.ref
  const canvasRef = useCallback(
    (element: HTMLElement | null) => {
      fitRef(element)
      bottom(element)
    },
    [fitRef, bottom]
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader app={props.app} isScrolled={fit.isScrolled} />
      <section
        ref={canvasRef}
        className="min-h-0 flex-1 overflow-y-auto px-s5 py-s4 @regular:px-s4"
      >
        <AppCanvas
          app={props.app}
          order="newest-last"
          onUseInputs={props.onUseInputs}
        />
        <ContentEndMark end={end} />
      </section>
      <Dock
        isRaised={end.isContentBelow}
        className="flex flex-col items-center gap-s2 px-s5 pb-s4 @regular:px-s4 @regular:before:shadow-none"
      >
        {props.bar}
      </Dock>
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="bottom" closeLabel={t("viewer.close")}>
          <SheetHeader>
            <SheetTitle>{t("app.inputs.open")}</SheetTitle>
          </SheetHeader>
          <SheetBody>{props.settings}</SheetBody>
          <SheetFooter>
            <p className="text-caption text-ink-muted">{props.price}</p>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function BarChips({
  chips,
  onOpenSheet,
}: {
  chips: ReactNode
  onOpenSheet: () => void
}): ReactElement {
  return (
    <>
      <span className="hidden min-w-0 items-center gap-s2 @regular:flex">
        {chips}
      </span>
      <Button size="small" className="@regular:hidden" onClick={onOpenSheet}>
        {t("app.inputs.open")}
      </Button>
    </>
  )
}
