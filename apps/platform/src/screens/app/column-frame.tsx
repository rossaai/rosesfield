import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { InputPanel } from "@rosesfield/ui/components/input-panel"
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
  useState,
} from "react"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppStage } from "@/screens/app/app-stage"
import { GenerateFoot, StartProblem } from "@/screens/app/generate-foot"
import { ToolsKey } from "@/screens/app/tools-key"
import type { StartRun } from "@/screens/app/use-start-run"

export type SheetControl = readonly [boolean, (open: boolean) => void]

export function useSheetOpen(): SheetControl {
  return useState(false)
}

type ColumnFrameProps = {
  app: AppListing
  start: StartRun
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
  sheet: SheetControl
  tabs?: ReactNode
  panel: ReactNode
  canvas: (openInputs: () => void) => ReactNode
  footLeading?: ReactNode
  hasHeader?: boolean
  hasWork?: boolean
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

function ColumnPanel(props: ColumnFrameProps): ReactElement {
  return (
    <aside
      onKeyDown={props.onShortcut}
      className="hidden min-h-0 shrink-0 @regular:flex @regular:pb-19"
    >
      <InputPanel
        label={appName(props.app)}
        tabs={props.tabs}
        footer={
          <GenerateFoot start={props.start} leading={props.footLeading} />
        }
      >
        {props.panel}
        <StartProblem start={props.start} />
      </InputPanel>
    </aside>
  )
}

function ColumnSheet(
  props: ColumnFrameProps & { isRegular: boolean }
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
          {props.isRegular ? null : (
            <>
              {props.tabs === undefined ? null : (
                <div data-slot="sheet-tray" className="mb-2">
                  {props.tabs}
                </div>
              )}
              {props.panel}
            </>
          )}
          <StartProblem start={props.start} />
        </SheetBody>
        <SheetFooter>
          <GenerateFoot start={props.start} leading={props.footLeading} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function ColumnFrame(props: ColumnFrameProps): ReactElement {
  const setOpen = props.sheet[1]
  const isRegular = useIsRegularWindow()
  const openInputs = (): void => setOpen(true)
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {props.hasHeader === false ? null : (
        <h1 className="sr-only">{appName(props.app)}</h1>
      )}
      <div
        data-slot="column-row"
        className="flex min-h-0 flex-1 gap-2 pt-2 @regular:px-4"
      >
        {isRegular ? <ColumnPanel {...props} /> : null}
        <AppStage
          app={props.app}
          kind="column"
          scrollClassName="px-4"
          hasWork={props.hasWork ?? false}
        >
          {props.canvas(openInputs)}
        </AppStage>
      </div>
      <ToolsKey onOpen={openInputs} />
      <ColumnSheet {...props} isRegular={isRegular} />
    </div>
  )
}
