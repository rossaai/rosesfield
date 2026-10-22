import type { AppListing, Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { characterQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  type HostedState,
  useHostedModel,
} from "@/screens/app/hosted/use-hosted-model"
import { usePriceRefresh } from "@/screens/app/hosted/use-price-refresh"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import type { AppSeeds } from "@/screens/app/use-app-screen"
import {
  type HostedBodyOf,
  type StartRun,
  useStartRun,
} from "@/screens/app/use-start-run"
import { adsHostedBodyOf, countAppOf } from "@/studio/ads/ads-hosted"
import {
  type AdsKind,
  type AdsProblem,
  adsProblems,
  adsValuesOf,
  barTextInputs,
  barTextOf,
  bodyAppFor,
  characterInput,
  compactedPhotos,
  formProblemsOf,
  holdsBarText,
  kindOf,
  modelInput,
  optionalApp,
} from "@/studio/ads/ads-rules"

export type AdsScreenState = {
  app: AppListing
  countApp: AppListing
  form: AppForm
  start: StartRun
  hosted: HostedState
  kind: AdsKind
  text: string
  setText: (text: string) => void
  lastSeed: number | null
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

type CharacterPhoto = {
  photo: string | null
  isLoading: boolean
  error: Error | null
}

function useCharacterPhoto(form: AppForm, hosted: HostedState): CharacterPhoto {
  const value = form.values.inputs[characterInput]
  const [characterId] = Array.isArray(value) ? value : []
  const isAsked =
    (hosted.chosen?.form ?? null) !== null && characterId !== undefined
  const query = useQuery({
    ...characterQuery(characterId ?? ""),
    enabled: isAsked,
  })
  return {
    photo: isAsked ? (query.data?.character.references[0] ?? null) : null,
    isLoading: isAsked && query.isPending,
    error: isAsked ? query.error : null,
  }
}

function useHostedBody(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  character: CharacterPhoto
): HostedBodyOf {
  const fields = hosted.chosen?.form ?? []
  return (own) =>
    adsHostedBodyOf(app, form.values, fields, character.photo, own)
}

function useCountApp(
  app: AppListing,
  form: AppForm,
  hosted: HostedState
): AppListing {
  const fields = hosted.chosen?.form ?? null
  const countApp = useMemo(() => countAppOf(app, fields), [app, fields])
  const max = countApp.output.count.max
  const { values, setForm } = form
  useEffect(() => {
    if (values.count > max) {
      setForm({ count: max })
    }
  }, [values.count, max, setForm])
  return countApp
}

function useWaitedStart(
  start: StartRun,
  character: CharacterPhoto
): { start: StartRun; press: () => void } {
  const [isWaiting, setWaiting] = useState(false)
  useEffect(() => {
    if (!isWaiting || character.isLoading) {
      return
    }
    setWaiting(false)
    if (character.error === null) {
      start.generate()
    }
  }, [isWaiting, character.isLoading, character.error, start])
  const press = (): void => {
    if (character.isLoading) {
      setWaiting(true)
      return
    }
    start.generate()
  }
  return {
    start: {
      ...start,
      isPending: start.isPending || isWaiting,
      error: start.error ?? character.error,
    },
    press,
  }
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
  const runs = useAppRuns(app)
  const hosted = useAdsModels(app, form, runs.runs)
  const character = useCharacterPhoto(form, hosted)
  const hostedBody = useHostedBody(app, form, hosted, character)
  const started = useStartRun(bodyApp, gate, undefined, hosted, hostedBody)
  const { start, press } = useWaitedStart(started, character)
  const countApp = useCountApp(app, form, hosted)
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
      press()
      return
    }
    setChecked(true)
    focusFor(bar.current, problem)?.focus()
  }
  return {
    app,
    countApp,
    form,
    start: { ...start, generate },
    hosted,
    kind,
    ...barText,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
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
