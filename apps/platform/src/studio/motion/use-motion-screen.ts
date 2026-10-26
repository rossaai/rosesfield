import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition, Run } from "@rosesfield/contract"
import { useQueryClient } from "@tanstack/react-query"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { characterQuery } from "@/api/queries"
import { appName } from "@/catalog/app-facts"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  type FieldProblem,
  heldProblemsOf,
  valuesFromRun,
} from "@/screens/app/app-form"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { hostedProblems } from "@/screens/app/hosted/hosted-form"
import {
  type HostedState,
  useHostedModel,
} from "@/screens/app/hosted/use-hosted-model"
import { usePriceRefresh } from "@/screens/app/hosted/use-price-refresh"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import {
  type AppForm,
  type FormCheck,
  useAppForm,
} from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import { isLengthProblem } from "@/studio/motion/motion-checks"
import {
  type ClipRange,
  clipRangeOf,
  graphRestOf,
  heldWellsOf,
  inputsForModel,
  isGraph,
  isMotionTab,
  type MotionTab,
  modeInput,
  restFieldsOf,
  tabOfModel,
  tabsOfModel,
  type WellNames,
  wellNamesOf,
} from "@/studio/motion/motion-tabs"
import {
  type MotionChecks,
  useMotionChecks,
} from "@/studio/motion/use-motion-checks"

export type MotionState = {
  app: AppListing
  tab: MotionTab
  form: AppForm
  start: StartRun
  hosted: HostedState
  isGraph: boolean
  names: WellNames
  range: ClipRange | null
  checks: MotionChecks
  clipMessage: string | null
  photoMessage: string | null
  restFields: readonly ModelField[]
  graphRest: readonly InputDefinition[]
  lastSeed: number | null
  pickCharacter: (characterId: string) => void
  registerWell: (name: string, focus: () => void) => void
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

export function checkFor(
  app: AppListing,
  model: CatalogModel | null
): FormCheck {
  const fields = model?.form ?? null
  return fields === null
    ? (values) => heldProblemsOf(app, values)
    : (values) => hostedProblems(fields, values)
}

export function clipMessageOf(
  problem: FieldProblem | null,
  range: ClipRange | null,
  model: string
): string | null {
  if (problem === null) {
    return null
  }
  const key = "motion.input.clip.range"
  if (isLengthProblem(problem) && range !== null && hasCatalogText(key)) {
    return tCatalog(key, {
      model,
      min: range.min,
      max: range.max,
      seconds: problem.values.seconds ?? "",
    })
  }
  return t(problem.key, problem.values)
}

export function tabOf(
  form: Pick<AppForm, "values">,
  fallback: MotionTab
): MotionTab {
  const value = form.values.inputs[modeInput]
  return isMotionTab(value) ? value : fallback
}

function useModeHosted(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  tab: MotionTab
): HostedState {
  const { models, chosen } = hosted
  const choose = (id: string): void => {
    const next = models.find((one) => one.id === id)
    if (next !== undefined) {
      const wells = heldWellsOf(form.values.inputs, wellNamesOf(app, chosen))
      form.setForm({
        inputs: inputsForModel(
          app,
          next,
          form.values.inputs,
          tabOfModel(next, tab),
          wells
        ),
      })
    }
  }
  return { ...hosted, choose }
}

function useFocusers(): [
  (name: string) => void,
  (name: string, focus: () => void) => void,
] {
  const focusers = useRef(new Map<string, () => void>())
  const register = useCallback((name: string, focus: () => void) => {
    focusers.current.set(name, focus)
  }, [])
  return [(name) => focusers.current.get(name)?.(), register]
}

function useCharacterPhoto(
  form: AppForm,
  photo: string
): [(characterId: string) => void, boolean] {
  const client = useQueryClient()
  const [hasFailed, setFailed] = useState(false)
  const { setInput } = form
  const pick = (characterId: string): void => {
    setFailed(false)
    void client
      .fetchQuery(characterQuery(characterId))
      .then((found) => {
        const [first] = found.character.references
        if (first !== undefined) {
          setInput(photo, [first])
        }
      })
      .catch(() => setFailed(true))
  }
  return [pick, hasFailed]
}

function useTabOfModel(
  form: AppForm,
  chosen: CatalogModel | null,
  tab: MotionTab
): void {
  const { setInput } = form
  const served = tabOfModel(chosen, tab)
  useEffect(() => {
    if (served !== tab) {
      setInput(modeInput, served)
    }
  }, [served, tab, setInput])
}

function chosenFor(hosted: HostedState, tab: MotionTab): CatalogModel | null {
  const { chosen } = hosted
  return chosen !== null && tabsOfModel(chosen).includes(tab) ? chosen : null
}

function photoMessageOf(
  problem: FieldProblem | null,
  hasPickFailed: boolean
): string | null {
  if (hasPickFailed) {
    return t("characters.failed.title")
  }
  return problem === null ? null : t(problem.key, problem.values)
}

function blockedOf(checks: MotionChecks): string | null {
  return checks.readingInput ?? checks.clip?.name ?? checks.photo?.name ?? null
}

function guardedOf(
  base: StartRun,
  checks: MotionChecks,
  focus: (name: string) => void
): () => void {
  return () => {
    const blocked = blockedOf(checks)
    if (blocked === null) {
      base.generate()
      return
    }
    focus(blocked)
  }
}

function shortcutOf(
  generate: () => void
): (event: KeyboardEvent<HTMLElement>) => void {
  return (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      generate()
    }
  }
}

export function useMotionScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void,
  initialTab: MotionTab
): MotionState {
  const check = useRef<FormCheck | null>(null)
  const form = useAppForm(app, seeds, check)
  const runs = useAppRuns(app)
  const hosted = useHostedModel(app, form)
  usePriceRefresh(app.id, runs.runs)
  const tab = tabOf(form, initialTab)
  const chosen = chosenFor(hosted, tab)
  useTabOfModel(form, hosted.chosen, tab)
  check.current = checkFor(app, chosen)
  const names = wellNamesOf(app, chosen)
  const range = clipRangeOf(app, chosen)
  const checks = useMotionChecks(form, names, range)
  const modeHosted = useModeHosted(app, form, hosted, tab)
  const [pickCharacter, hasPickFailed] = useCharacterPhoto(form, names.photo)
  const [focus, registerWell] = useFocusers()
  const base = useStartRun(app, form, onStarted, { ...hosted, chosen })
  const generate = guardedOf(base, checks, focus)
  const model = chosen === null ? appName(app) : modelNameOf(chosen)
  return {
    app,
    tab,
    form,
    start: { ...base, generate },
    hosted: modeHosted,
    isGraph: chosen === null || isGraph(chosen),
    names,
    range,
    checks,
    clipMessage: clipMessageOf(checks.clip, range, model),
    photoMessage: photoMessageOf(checks.photo, hasPickFailed),
    restFields: restFieldsOf(chosen),
    graphRest: graphRestOf(app),
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    pickCharacter,
    registerWell,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    onShortcut: shortcutOf(generate),
  }
}
