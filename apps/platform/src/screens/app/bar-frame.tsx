import type { AppListing, Run } from "@rosesfield/contract"
import { Chip } from "@rosesfield/ui/components/chip"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@rosesfield/ui/components/sheet"
import { SlidersHorizontalIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useEffect, useState } from "react"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useAppToolsOpener } from "@/pieces/app-tools"
import { Dock } from "@/pieces/dock"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCanvas } from "@/screens/app/app-canvas"
import { AppStage } from "@/screens/app/app-stage"
import type { SheetControl } from "@/screens/app/column-frame"
import { ToolsKey } from "@/screens/app/tools-key"

export type BarPlace = "dock" | "sheet" | "phone"

export type PhoneBar = "sheet" | "dock"

type BarFrameProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  bar: (place: BarPlace) => ReactNode
  settings: ReactNode
  sheet: SheetControl
  phone?: PhoneBar
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

function PhoneDock({
  onOpen,
  children,
}: {
  onOpen: () => void
  children: ReactNode
}): ReactElement {
  useAppToolsOpener(onOpen)
  return (
    <Dock
      isRaised
      className="sticky bottom-0 z-40 shrink-0 px-4 pt-2 pb-[calc(var(--spacing)*2+env(safe-area-inset-bottom))]"
    >
      <div data-slot="prompt-dock" className="flex flex-col gap-2">
        {children}
      </div>
    </Dock>
  )
}

function PhoneBarPlace({
  props,
  isRegular,
  onOpen,
}: {
  props: BarFrameProps
  isRegular: boolean
  onOpen: () => void
}): ReactNode {
  if (isRegular) {
    return null
  }
  return props.phone === "dock" ? (
    <PhoneDock onOpen={onOpen}>{props.bar("phone")}</PhoneDock>
  ) : (
    <ToolsKey onOpen={onOpen} />
  )
}

export function BarFrame(props: BarFrameProps): ReactElement {
  const [isOpen, setOpen] = props.sheet
  const isRegular = useIsRegularWindow()
  const isDocked = props.phone === "dock"
  const cover = useDockCover()
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{appName(props.app)}</h1>
      <div
        ref={cover.stageRef}
        data-slot="bar-stage"
        className="flex min-h-0 flex-1 pb-4 @regular:pb-0"
      >
        <AppStage
          app={props.app}
          kind="bar"
          scrollClassName="px-4 @regular:pb-36"
        >
          <AppCanvas app={props.app} onUseInputs={props.onUseInputs} />
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
      <PhoneBarPlace
        props={props}
        isRegular={isRegular}
        onOpen={() => setOpen(true)}
      />
      <Sheet open={isOpen && !isRegular} onOpenChange={setOpen}>
        <SheetContent side="bottom" closeLabel={t("viewer.close")}>
          <SheetHeader>
            <SheetTitle>
              {isDocked ? t("app.inputs.open") : appName(props.app)}
            </SheetTitle>
          </SheetHeader>
          <SheetBody>{props.settings}</SheetBody>
          {isDocked ? null : (
            <SheetFooter>{isRegular ? null : props.bar("sheet")}</SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function FoldedChips({ chips }: { chips: ReactNode }): ReactElement {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Chip data-slot="bar-settings" icon={<SlidersHorizontalIcon />}>
            {t("bar.settings")}
          </Chip>
        }
      />
      <PopoverContent
        side="top"
        sideOffset={8}
        aria-label={t("bar.settings")}
        data-density="composer"
      >
        <PopoverTitle className="sr-only">{t("bar.settings")}</PopoverTitle>
        <div
          data-slot="bar-settings-chips"
          className="flex flex-wrap items-center gap-s1"
        >
          {chips}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function BarChips({ chips }: { chips: ReactNode }): ReactElement {
  const isRegular = useIsRegularWindow()
  if (!isRegular) {
    return <FoldedChips chips={chips} />
  }
  return (
    <span
      data-slot="bar-chips"
      className="flex min-w-0 shrink-0 items-center gap-s1 *:flex-nowrap *:gap-s1"
    >
      {chips}
    </span>
  )
}
