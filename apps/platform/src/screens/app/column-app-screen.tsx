import type { AppListing } from "@rosesfield/contract"
import { type ReactElement, useRef } from "react"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import { TaskPanel } from "@/screens/app/hosted/task-panel"
import { InputsPanel } from "@/screens/app/inputs-panel"
import {
  type AppSeeds,
  noSeeds,
  useAppScreen,
} from "@/screens/app/use-app-screen"

export function ColumnAppScreen({
  app,
  seeds = noSeeds,
  hasHeader = true,
}: {
  app: AppListing
  seeds?: AppSeeds
  hasHeader?: boolean
}): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useAppScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      hasHeader={hasHeader}
      panel={
        state.hosted?.isTaskApp === true ? (
          <TaskPanel
            app={app}
            form={state.form}
            hosted={state.hosted}
            graphPanel={(graphApp) => (
              <InputsPanel
                app={graphApp}
                form={state.form}
                lastSeed={state.lastSeed}
              />
            )}
          />
        ) : (
          <InputsPanel app={app} form={state.form} lastSeed={state.lastSeed} />
        )
      }
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          order="newest-first"
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
