import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import { useEffect, useMemo, useRef, useState } from "react"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import {
  type AppScreenState,
  type AppSeeds,
  useAppScreen,
} from "@/screens/app/use-app-screen"
import {
  defaultsOfTab,
  modelForTab,
  modelsOfTab,
  openingTab,
  shownTabs,
  type ThreeDTab,
  tabsOfModel,
} from "@/studio/three-d/three-d-tabs"

export type ThreeDScreen = {
  state: AppScreenState
  hosted: HostedState
  tab: ThreeDTab
  tabs: readonly ThreeDTab[]
  tabModels: readonly CatalogModel[]
  setTab: (tab: ThreeDTab) => void
  fillFromRun: (run: Run) => void
}

function emptyHosted(): HostedState {
  return {
    isTaskApp: false,
    models: [],
    isLoading: false,
    error: null,
    keyState: "unknown",
    defaultModel: null,
    chosen: null,
    fields: null,
    ranBefore: [],
    choose: () => undefined,
  }
}

export function tabOfModel(
  model: CatalogModel | null | undefined,
  app: AppListing,
  current: ThreeDTab
): ThreeDTab {
  if (model === null || model === undefined) {
    return current
  }
  const tabs = tabsOfModel(model, app)
  return tabs.includes(current) ? current : (tabs[0] ?? current)
}

export function modelToOpen(
  hosted: HostedState,
  tab: ThreeDTab,
  app: AppListing,
  picked: string | null
): string | null {
  const models = modelsOfTab(hosted.models, tab, app)
  const chosen = hosted.chosen?.id ?? null
  if (models.length === 0 || models.some((model) => model.id === chosen)) {
    return null
  }
  return modelForTab(models, [
    picked,
    ...defaultsOfTab(hosted.models, tab),
    hosted.defaultModel,
  ])
}

export function tabShown(
  picked: ThreeDTab,
  tabs: readonly ThreeDTab[]
): ThreeDTab {
  return tabs.includes(picked) ? picked : openingTab
}

type Picked = Record<ThreeDTab, string | null>

function useTabModel(
  screen: Pick<ThreeDScreen, "state" | "hosted" | "tab">,
  app: AppListing,
  setTab: (tab: ThreeDTab) => void
): void {
  const seeded = useRef(false)
  const picked = useRef<Picked>({ image: null, text: null })
  const { state, hosted, tab } = screen
  useEffect(() => {
    if (hosted.models.length === 0 || hosted.isLoading) {
      return
    }
    const chosen = hosted.chosen
    if (chosen !== null && tabsOfModel(chosen, app).includes(tab)) {
      picked.current[tab] = chosen.id
    }
    if (state.form.source === "seed" && !seeded.current) {
      seeded.current = true
      const own = tabOfModel(chosen, app, tab)
      if (own !== tab) {
        setTab(own)
        return
      }
    }
    const id = modelToOpen(hosted, tab, app, picked.current[tab])
    if (id !== null) {
      hosted.choose(id)
    }
  })
}

export function useThreeDScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted: () => void
): ThreeDScreen {
  const state = useAppScreen(app, seeds, onStarted)
  const hosted = state.hosted ?? emptyHosted()
  const [picked, setTab] = useState<ThreeDTab>(openingTab)
  const tabs = useMemo(
    () => shownTabs(hosted.models, app),
    [hosted.models, app]
  )
  const tab = tabShown(picked, tabs)
  useTabModel({ state, hosted, tab }, app, setTab)
  const tabModels = useMemo(
    () => modelsOfTab(hosted.models, tab, app),
    [hosted.models, tab, app]
  )
  const fillForm = state.useInputs
  return {
    state,
    hosted,
    tab,
    tabs,
    tabModels,
    setTab,
    fillFromRun: (run) => {
      fillForm(run)
      const model = hosted.models.find(
        (one) => one.id === run.inputs[modelInputName]
      )
      setTab(tabOfModel(model, app, tab))
    },
  }
}
