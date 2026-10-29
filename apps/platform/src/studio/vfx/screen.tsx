import type { ReactElement } from "react"
import { useRef } from "react"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { useAppScreen } from "@/screens/app/use-app-screen"
import type { StartRun } from "@/screens/app/use-start-run"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import { useVfxChecks } from "@/studio/vfx/use-vfx-checks"
import { VfxPanel } from "@/studio/vfx/vfx-panel"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetOpen = useRef<(open: boolean) => void>(() => undefined)
  const isRegular = useIsRegularWindow()
  const screen = useAppScreen(app, seeds, () => sheetOpen.current(false))
  const { form } = screen
  const checks = useVfxChecks(form)
  const refuse = (): void => {
    if (!isRegular) {
      sheetOpen.current(true)
    }
  }
  const checked = useCheckedStart(screen.start, form, !checks.isReading, refuse)
  const problem = checks.photo ?? checks.clip
  const start: StartRun = {
    ...checked,
    generate: () => {
      if (problem !== null) {
        refuse()
        return
      }
      checked.generate()
    },
  }
  const sheet = useSheetOpen()
  sheetOpen.current = sheet[1]
  return (
    <ColumnFrame
      app={app}
      start={start}
      onShortcut={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          start.generate()
        }
      }}
      sheet={sheet}
      panel={
        <VfxPanel
          app={app}
          form={form}
          checks={checks}
          lastSeed={screen.lastSeed}
        />
      }
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          onUseInputs={screen.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
