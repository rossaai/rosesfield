import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { GenerateButton } from "@rosesfield/ui/components/generate-button"
import { InputPanel } from "@rosesfield/ui/components/input-panel"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@rosesfield/ui/components/sheet"
import { SlidersHorizontalIcon } from "lucide-react"
import type { KeyboardEvent, ReactElement, ReactNode } from "react"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useAppToolsOpener } from "@/pieces/app-tools"
import { Dock } from "@/pieces/dock"
import { useCanvasFit } from "@/pieces/use-canvas-fit"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppStage } from "@/screens/app/app-stage"
import type { SheetControl } from "@/screens/app/column-frame"
import { GenerateFoot, StartProblem } from "@/screens/app/generate-foot"
import type { StartRun } from "@/screens/app/use-start-run"
import { priceCaptionOf } from "@/studio/storyboard/use-storyboard-start"

type StoryboardFrameProps = {
  app: AppListing
  start: StartRun
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
  sheet: SheetControl
  panel: ReactNode
  canvas: (openInputs: () => void) => ReactNode
}

function PriceCaption({ start }: { start: StartRun }): ReactElement | null {
  const caption = priceCaptionOf(start)
  return caption === "" ? null : (
    <p
      data-slot="storyboard-price"
      className="min-w-0 truncate text-caption text-ink-muted tabular-nums"
    >
      {caption}
    </p>
  )
}

function Foot({ start }: { start: StartRun }): ReactElement {
  return (
    <GenerateFoot
      start={start}
      leading={
        (start.priceValue ?? null) === null ? (
          <PriceCaption start={start} />
        ) : null
      }
    />
  )
}

function ColumnPanel(props: StoryboardFrameProps): ReactElement {
  return (
    <aside
      onKeyDown={props.onShortcut}
      className="hidden min-h-0 shrink-0 @regular:flex @regular:pb-19"
    >
      <InputPanel
        label={appName(props.app)}
        footer={<Foot start={props.start} />}
      >
        {props.panel}
        <StartProblem start={props.start} />
      </InputPanel>
    </aside>
  )
}

function PhoneDock({
  start,
  onOpen,
}: {
  start: StartRun
  onOpen: () => void
}): ReactElement {
  return (
    <Dock
      isRaised
      className="sticky bottom-0 z-40 shrink-0 px-4 pt-2 pb-[calc(var(--spacing)*2+env(safe-area-inset-bottom))] @regular:hidden"
    >
      <div data-slot="storyboard-dock" className="flex items-center gap-2">
        <Button onClick={onOpen}>
          <SlidersHorizontalIcon aria-hidden="true" />
          {t("app.inputs.open")}
        </Button>
        <div className="min-w-0 flex-1">
          <PriceCaption start={start} />
        </div>
        <GenerateButton
          form="bar"
          label={t("run.generate")}
          busy={start.isPending}
          onClick={start.generate}
          aria-label={start.priceName ?? undefined}
          className="w-auto"
        />
      </div>
    </Dock>
  )
}

function PhoneSheet(
  props: StoryboardFrameProps & { isRegular: boolean }
): ReactElement {
  const [isOpen, setOpen] = props.sheet
  return (
    <Sheet open={isOpen && !props.isRegular} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        closeLabel={t("viewer.close")}
        onKeyDown={props.onShortcut}
      >
        <SheetHeader>
          <SheetTitle>{appName(props.app)}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {props.isRegular ? null : props.panel}
          <StartProblem start={props.start} />
        </SheetBody>
        <SheetFooter>
          <Foot start={props.start} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function StoryboardFrame(props: StoryboardFrameProps): ReactElement {
  const setOpen = props.sheet[1]
  const isRegular = useIsRegularWindow()
  const fit = useCanvasFit()
  const openInputs = (): void => setOpen(true)
  useAppToolsOpener(openInputs)
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <h1 className="sr-only">{appName(props.app)}</h1>
      <div
        data-slot="column-row"
        className="flex min-h-0 flex-1 gap-2 pt-2 @regular:px-4"
      >
        {isRegular ? <ColumnPanel {...props} /> : null}
        <AppStage
          app={props.app}
          kind="column"
          scrollRef={fit.ref}
          scrollClassName="px-4"
        >
          {props.canvas(openInputs)}
        </AppStage>
      </div>
      {isRegular ? null : <PhoneDock start={props.start} onOpen={openInputs} />}
      <PhoneSheet {...props} isRegular={isRegular} />
    </div>
  )
}
