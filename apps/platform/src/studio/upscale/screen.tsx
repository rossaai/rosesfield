import { type ReactElement, useRef } from "react"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { UpscaleCompare } from "@/studio/upscale/upscale-compare"
import { ModeTabs, UpscalePanel } from "@/studio/upscale/upscale-panel"
import { useUpscaleScreen } from "@/studio/upscale/use-upscale-screen"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useUpscaleScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      tabs={<ModeTabs state={state} />}
      panel={<UpscalePanel state={state} />}
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          order="newest-first"
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
          afterRun={(run) => (
            <UpscaleCompare run={run} models={state.models} />
          )}
        />
      )}
    />
  )
}
