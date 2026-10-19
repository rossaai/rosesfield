import type { AppListing } from "@rosesfield/contract"
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
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { ContentEndMark, Dock, useContentEnd } from "@/pieces/dock"
import { useCanvasFit } from "@/pieces/use-canvas-fit"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppHeader } from "@/screens/app/app-header"
import { GenerateFoot } from "@/screens/app/generate-foot"
import type { StartRun } from "@/screens/app/use-start-run"

export type SheetControl = readonly [boolean, (open: boolean) => void]

export function useSheetOpen(hasRuns: boolean | null): SheetControl {
  const [isOpen, setOpen] = useState(false)
  const isRegular = useIsRegularWindow()
  const decided = useRef(false)
  useEffect(() => {
    if (hasRuns === null || decided.current) {
      return
    }
    decided.current = true
    if (!hasRuns && !isRegular) {
      setOpen(true)
    }
  }, [hasRuns, isRegular])
  return [isOpen, setOpen]
}

type ColumnFrameProps = {
  app: AppListing
  start: StartRun
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
  sheet: SheetControl
  panel: ReactNode
  canvas: (openInputs: () => void) => ReactNode
  footLeading?: ReactNode
  hasHeader?: boolean
}

export function AddInputsButton({
  onClick,
}: {
  onClick: () => void
}): ReactElement {
  return (
    <Button className="@regular:hidden" onClick={onClick}>
      {t("app.empty.action")}
    </Button>
  )
}

export function ColumnFrame(props: ColumnFrameProps): ReactElement {
  const [isOpen, setOpen] = props.sheet
  const isRegular = useIsRegularWindow()
  const fit = useCanvasFit()
  const end = useContentEnd()
  const openInputs = (): void => setOpen(true)
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {props.hasHeader === false ? null : <AppHeader app={props.app} />}
      <div className="flex min-h-0 flex-1">
        <aside
          onKeyDown={props.onShortcut}
          className="hidden w-[calc(var(--spacing-field-max)+2*var(--spacing-s4))] shrink-0 flex-col @regular:flex"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-s4 pt-s2 pb-s4">
            {isRegular ? props.panel : null}
          </div>
          <GenerateFoot
            start={props.start}
            leading={props.footLeading}
            className="px-s4 py-s3"
          />
        </aside>
        <section
          ref={fit.ref}
          data-ground={isRegular ? "surface" : "canvas"}
          className="min-w-0 flex-1 overflow-y-auto px-s5 py-s4 @regular:mr-s4 @regular:mb-s4 @regular:rounded-card @regular:bg-surface @regular:px-s4"
        >
          {props.canvas(openInputs)}
          <ContentEndMark end={end} />
        </section>
      </div>
      <Dock
        isRaised={end.isContentBelow}
        className="flex items-center gap-s3 px-s5 py-s3 @regular:hidden"
      >
        <GenerateFoot
          start={props.start}
          className="w-full"
          leading={<Button onClick={openInputs}>{t("app.inputs.open")}</Button>}
        />
      </Dock>
      <Sheet open={isOpen && !isRegular} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          closeLabel={t("viewer.close")}
          onKeyDown={props.onShortcut}
        >
          <SheetHeader>
            <SheetTitle>{appName(props.app)}</SheetTitle>
          </SheetHeader>
          <SheetBody>{isRegular ? null : props.panel}</SheetBody>
          <SheetFooter>
            <GenerateFoot start={props.start} leading={props.footLeading} />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
