import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { exampleInput, ownVideo } from "@rosesfield/catalog/motion"
import type { AppListing } from "@rosesfield/contract"
import { useEffect, useMemo, useRef } from "react"
import { defaultsOf } from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  heldWellsOf,
  inputsForModel,
  isMotionTab,
  type MotionTab,
  modeInput,
  modelForTab,
  modelInput,
  modelsOfTab,
  tabOfTask,
  wellNamesOf,
} from "@/studio/motion/motion-tabs"

export type TabHosted = {
  hosted: HostedState
  setTab: (tab: MotionTab) => void
}

/** The picker on a tab lists that tab's models. Picking a tab keeps the model you have when it serves that tab, else the app's own, else the tab's first, and a new tab leaves a Library example for your own video. */
export function useTabHosted(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  tab: MotionTab
): TabHosted {
  const { models, chosen, defaultModel } = hosted
  const wells = (): ReturnType<typeof heldWellsOf> =>
    heldWellsOf(form.values.inputs, wellNamesOf(app, chosen))
  const choose = (id: string): void => {
    const next = models.find((one) => one.id === id)
    if (next !== undefined) {
      form.setForm({
        inputs: inputsForModel(
          app,
          next,
          form.values.inputs,
          tabOfTask(next),
          wells()
        ),
      })
    }
  }
  const setTab = (next: MotionTab): void => {
    const model = modelForTab(modelsOfTab(models, next), [
      chosen?.id ?? null,
      textOf(defaultsOf(app).inputs[modelInput]),
      defaultModel,
    ])
    const kept = { ...form.values.inputs, [exampleInput]: ownVideo }
    if (model === null) {
      form.setForm({ inputs: { ...kept, [modeInput]: next } })
      return
    }
    form.setForm({ inputs: inputsForModel(app, model, kept, next, wells()) })
  }
  const tabModels = useMemo(() => modelsOfTab(models, tab), [models, tab])
  return { hosted: { ...hosted, models: tabModels, choose }, setTab }
}

/** Keeps the tab and the model together. On opening at Swap's address the model follows the tab, and otherwise the tab follows the model: the one you open on, pick or use again. */
export function useTabMatchesModel(
  form: AppForm,
  chosen: CatalogModel | null,
  tab: MotionTab,
  setTab: (tab: MotionTab) => void
): void {
  const opened = useRef(false)
  const { setInput } = form
  const isNamed = isMotionTab(form.values.inputs[modeInput])
  const setTabRef = useRef(setTab)
  setTabRef.current = setTab
  useEffect(() => {
    if (chosen === null) {
      return
    }
    const isOpening = !opened.current
    opened.current = true
    const served = tabOfTask(chosen)
    if (served === tab) {
      return
    }
    if (isOpening && !isNamed && tab === "swap") {
      setTabRef.current(tab)
      return
    }
    setInput(modeInput, served)
  }, [chosen, tab, isNamed, setInput])
}
