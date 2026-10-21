import type { AppListing, Run } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  type HostedState,
  useHostedModel,
} from "@/screens/app/hosted/use-hosted-model"
import { usePriceRefresh } from "@/screens/app/hosted/use-price-refresh"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import type { AppSeeds } from "@/screens/app/use-app-screen"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import {
  type AdsKind,
  type AdsProblem,
  adsProblems,
  adsValuesOf,
  barTextInputs,
  barTextOf,
  bodyAppFor,
  compactedPhotos,
  formProblemsOf,
  holdsBarText,
  kindOf,
  modelInput,
  optionalApp,
} from "@/studio/ads/ads-rules"

export type AdsScreenState = {
  app: AppListing
  form: AppForm
  start: StartRun
  hosted: HostedState
  kind: AdsKind
  text: string
  setText: (text: string) => void
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
  message: string | null
  bar: RefObject<HTMLDivElement | null>
}

function focusFor(
  bar: HTMLDivElement | null,
  problem: AdsProblem
): HTMLElement | null {
  if (bar === null) {
    return null
  }
  if (problem.focus === "prompt") {
    return bar.querySelector("textarea")
  }
  const attach = t("bar.attach")
  const control = Array.from(
    bar.querySelectorAll<HTMLElement>("[aria-label]")
  ).find((element) => element.getAttribute("aria-label") === attach)
  if (control === undefined || control.matches("button")) {
    return control ?? null
  }
  return control.querySelector<HTMLElement>("button:not([disabled])")
}

function pricedStart(start: StartRun): StartRun {
  return start.priceValue === formatNumber(0)
    ? {
        ...start,
        price: start.price === "" ? t("run.price.unknown") : start.price,
        priceValue: null,
        priceName: null,
      }
    : start
}

function useAdsModels(
  app: AppListing,
  form: AppForm,
  runs: readonly Run[]
): HostedState {
  const hosted = useHostedModel(app, form, runs)
  usePriceRefresh(app.id, runs)
  const { setInput } = form
  return { ...hosted, choose: (id) => setInput(modelInput, id) }
}

function useBarText(app: AppListing, form: AppForm, kind: AdsKind) {
  const [text, setLocal] = useState("")
  const isSame = holdsBarText(app, form.values.inputs, kind, text)
  const shown = barTextOf(app, form.values.inputs)
  useEffect(() => {
    if (!isSame) {
      setLocal(shown)
    }
  }, [isSame, shown])
  const setText = (next: string): void => {
    setLocal(next)
    for (const [name, value] of Object.entries(
      barTextInputs(app, kind, next)
    )) {
      form.setInput(name, value)
    }
  }
  return { text: isSame ? text : shown, setText }
}

function usePhotoOrder(app: AppListing, form: AppForm): void {
  const placed = compactedPhotos(app, form.values.inputs)
  const { setInput } = form
  useEffect(() => {
    if (placed === null) {
      return
    }
    for (const [name, ids] of Object.entries(placed)) {
      setInput(name, ids)
    }
  }, [placed, setInput])
}

export function useAdsScreen(app: AppListing, seeds: AppSeeds): AdsScreenState {
  const formApp = useMemo(() => optionalApp(app), [app])
  const form = useAppForm(formApp, seeds)
  const values = form.values.inputs
  const bodyApp = useMemo(() => bodyAppFor(app, values), [app, values])
  const gate: AppForm = {
    ...form,
    validate: () => formProblemsOf(app, form.values).length === 0,
  }
  const start = pricedStart(useStartRun(bodyApp, gate))
  const runs = useAppRuns(app)
  const hosted = useAdsModels(app, form, runs.runs)
  const kind = kindOf(values)
  const barText = useBarText(app, form, kind)
  usePhotoOrder(app, form)
  const bar = useRef<HTMLDivElement | null>(null)
  const [isChecked, setChecked] = useState(false)
  const first = isChecked
    ? adsProblems(app, values, hosted.models)[0]
    : undefined
  const generate = (): void => {
    const problem = adsProblems(app, values, hosted.models)[0]
    if (problem === undefined) {
      setChecked(false)
      start.generate()
      return
    }
    setChecked(true)
    focusFor(bar.current, problem)?.focus()
  }
  return {
    app,
    form,
    start: { ...start, generate },
    hosted,
    kind,
    ...barText,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => form.fill(adsValuesOf(app, run)),
    bar,
    message: first === undefined ? null : tCatalog(first.key, first.values),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}
