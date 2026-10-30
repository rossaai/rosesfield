import { motionAppId } from "@rosesfield/catalog/motion"
import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { useNavigate } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useRef } from "react"
import { tCatalog } from "@/copy/t"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { noSeeds, useAppScreen } from "@/screens/app/use-app-screen"
import { SheetPanel, ShuffleButton } from "@/studio/ai-influencer/sheet-panel"
import { useSheetStart } from "@/studio/ai-influencer/use-sheet-start"

function UseInMotion({ run }: { run: Run }): ReactNode {
  const navigate = useNavigate()
  const [sheet] = run.outputs
  if (run.status !== "done" || sheet === undefined) {
    return null
  }
  return (
    <div>
      <Button
        size="small"
        onClick={() =>
          void navigate({
            to: "/apps/$appId",
            params: { appId: motionAppId },
            search: { use: sheet },
          })
        }
      >
        {tCatalog("aiInfluencer.studio.useInMotion")}
      </Button>
    </div>
  )
}

export function AppScreen({
  app,
  seeds = noSeeds,
}: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useAppScreen(
    app,
    seeds,
    () => sheetClose.current(),
    useSheetStart
  )
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      hasHeader={true}
      panel={<SheetPanel app={app} form={state.form} hosted={state.hosted} />}
      footLeading={<ShuffleButton form={state.form} />}
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
          afterRun={(run) => <UseInMotion run={run} />}
        />
      )}
    />
  )
}
