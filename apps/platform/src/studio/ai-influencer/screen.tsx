import { sheetModel } from "@rosesfield/catalog/ai-influencer"
import { motionAppId } from "@rosesfield/catalog/motion"
import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { useNavigate } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useEffect, useRef } from "react"
import { tCatalog } from "@/copy/t"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import { readLastUsed } from "@/screens/app/hosted/last-used"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import type { AppForm } from "@/screens/app/use-app-form"
import { noSeeds, useAppScreen } from "@/screens/app/use-app-screen"
import { SheetPanel, ShuffleButton } from "@/studio/ai-influencer/sheet-panel"
import { useSheetStart } from "@/studio/ai-influencer/use-sheet-start"

/** Opens an untouched form on the model the bar characters were made on, where every task app opens on its #1, and leaves a model you chose before as it is. */
function useOpenOnSheetModel(
  app: AppListing,
  form: AppForm,
  hosted: HostedState | undefined
): void {
  const isDone = useRef(readLastUsed(app.id) !== null)
  const chosen = hosted?.chosen?.id ?? null
  useEffect(() => {
    if (isDone.current || hosted === undefined || chosen === null) {
      return
    }
    const isOwn = (form.source ?? "defaults") !== "defaults"
    if (isOwn || hosted.defaultModel === sheetModel) {
      isDone.current = true
      return
    }
    if (chosen !== sheetModel) {
      isDone.current = true
      hosted.choose(sheetModel)
    }
  }, [chosen, form.source, hosted])
}

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
  useOpenOnSheetModel(app, state.form, state.hosted)
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      hasHeader={true}
      layouts="list"
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
