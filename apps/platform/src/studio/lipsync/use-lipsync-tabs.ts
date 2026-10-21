import type { AppListing } from "@rosesfield/contract"
import { useEffect, useRef, useState } from "react"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { carry, fieldsOfModel } from "@/studio/lipsync/lipsync-run"
import {
  defaultsOfTab,
  type LipsyncTab,
  modeInput,
  modelForTab,
  modelsOfTab,
} from "@/studio/lipsync/lipsync-tabs"

export type LipsyncTabs = {
  tab: LipsyncTab
  setTabState: (tab: LipsyncTab) => void
  setTab: (tab: LipsyncTab) => void
  choose: (id: string) => void
}

export function useLipsyncTabs(
  app: AppListing,
  all: HostedState,
  form: AppForm
): LipsyncTabs {
  const [tab, setTabState] = useState<LipsyncTab>("photo")
  const remembered = useRef<Partial<Record<LipsyncTab, string>>>({})
  const hasMode = app.inputs.some((input) => input.name === modeInput)
  const switchTo = (id: string | null, onTab: LipsyncTab): void => {
    if (id !== null && id !== all.chosen?.id) {
      const next = all.models.find((model) => model.id === id) ?? null
      const kept = form.values.inputs
      all.choose(id)
      carry({
        from: fieldsOfModel(all.chosen, app),
        to: fieldsOfModel(next, app),
        kept,
        setInput: form.setInput,
      })
    }
    if (hasMode) {
      form.setInput(modeInput, onTab)
    }
  }
  return {
    tab,
    setTabState,
    choose: (id) => {
      remembered.current[tab] = id
      switchTo(id, tab)
    },
    setTab: (next) => {
      setTabState(next)
      const listed = modelsOfTab(all.models, next, app)
      const defaults = defaultsOfTab(next, all.defaultModel)
      const kept = remembered.current[next] ?? null
      switchTo(modelForTab(listed, kept, defaults), next)
    },
  }
}

export function useTabFit(
  app: AppListing,
  all: HostedState,
  tab: LipsyncTab,
  choose: (id: string) => void
): void {
  const listed = modelsOfTab(all.models, tab, app)
  const chosen = all.chosen?.id ?? null
  const fits = chosen !== null && listed.some((model) => model.id === chosen)
  const id = fits
    ? null
    : modelForTab(listed, null, defaultsOfTab(tab, all.defaultModel))
  const hold = useRef(choose)
  hold.current = choose
  useEffect(() => {
    if (!all.isLoading && id !== null && id !== chosen) {
      hold.current(id)
    }
  }, [all.isLoading, id, chosen])
}
