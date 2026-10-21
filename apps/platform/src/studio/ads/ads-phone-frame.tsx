import type { AppListing, Run } from "@rosesfield/contract"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@rosesfield/ui/components/sheet"
import type { ReactElement, ReactNode } from "react"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useAppToolsOpener } from "@/pieces/app-tools"
import { Dock } from "@/pieces/dock"
import { useCanvasFit } from "@/pieces/use-canvas-fit"
import { AppCanvas } from "@/screens/app/app-canvas"
import { AppStage } from "@/screens/app/app-stage"
import type { SheetControl } from "@/screens/app/column-frame"

type AdsPhoneFrameProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  bar: (openInputs: () => void) => ReactNode
  settings: ReactNode
  sheet: SheetControl
}

export function AdsPhoneFrame(props: AdsPhoneFrameProps): ReactElement {
  const [isOpen, setOpen] = props.sheet
  const fit = useCanvasFit()
  const openInputs = (): void => setOpen(true)
  useAppToolsOpener(openInputs)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{appName(props.app)}</h1>
      <div data-slot="bar-stage" className="flex min-h-0 flex-1">
        <AppStage
          app={props.app}
          kind="bar"
          scrollRef={fit.ref}
          scrollClassName="px-4 pb-4"
        >
          <AppCanvas
            app={props.app}
            order="newest-last"
            onUseInputs={props.onUseInputs}
          />
        </AppStage>
      </div>
      <Dock
        isRaised
        className="sticky bottom-0 z-40 shrink-0 px-4 pt-2 pb-[calc(var(--spacing)*2+env(safe-area-inset-bottom))]"
      >
        <div data-slot="prompt-dock" className="flex flex-col gap-2">
          {props.bar(openInputs)}
        </div>
      </Dock>
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="bottom" closeLabel={t("viewer.close")}>
          <SheetHeader>
            <SheetTitle>{t("app.inputs.open")}</SheetTitle>
          </SheetHeader>
          <SheetBody>{props.settings}</SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  )
}
