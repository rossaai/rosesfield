import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import {
  exampleInput,
  type LibraryExample,
  libraryExamples,
  ltx25GuideModel,
  ownVideo,
} from "@rosesfield/catalog/motion"
import type { AppListing, InputDefinition, Run } from "@rosesfield/contract"
import { useQueryClient } from "@tanstack/react-query"
import { type KeyboardEvent, useCallback, useRef, useState } from "react"
import { characterQuery } from "@/api/queries"
import { appName } from "@/catalog/app-facts"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  type FieldProblem,
  heldProblemsOf,
  heldValuesOf,
  valuesFromRun,
} from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
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
import { isLengthProblem, trimmedOf } from "@/studio/motion/motion-checks"
import {
  type ClipRange,
  clipRangeOf,
  graphRestOf,
  isGraph,
  isMotionTab,
  type MotionTab,
  modeInput,
  modelInput,
  restFieldsOf,
  tabOfTask,
  type WellNames,
  wellNamesOf,
} from "@/studio/motion/motion-tabs"
import {
  isOwnChain,
  type MotionChain,
  useMotionChain,
} from "@/studio/motion/use-motion-chain"
import {
  type MotionChecks,
  useMotionChecks,
} from "@/studio/motion/use-motion-checks"
import {
  useTabHosted,
  useTabMatchesModel,
} from "@/studio/motion/use-motion-tab"

export type MotionState = {
  app: AppListing
  example: LibraryExample | null
  chain: MotionChain | null
  isOwnChain: boolean
  useOwnVideo: () => void
  tab: MotionTab
  setTab: (tab: MotionTab) => void
  form: AppForm
  start: StartRun
  hosted: HostedState
  isGraph: boolean
  names: WellNames
  range: ClipRange | null
  checks: MotionChecks
  clipMessage: string | null
  clipNote: string | null
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

/** The clip's refusal: with a model's name for a model you picked, and in plain words of your video alone, with no model named, when the chain runs it. */
export function clipMessageOf(
  problem: FieldProblem | null,
  range: ClipRange | null,
  model: string | null
): string | null {
  if (problem === null) {
    return null
  }
  const key = "motion.input.clip.range"
  if (
    model !== null &&
    isLengthProblem(problem) &&
    range !== null &&
    hasCatalogText(key)
  ) {
    return tCatalog(key, {
      model,
      min: range.min,
      max: range.max,
      seconds: problem.values.seconds ?? "",
    })
  }
  return t(problem.key, problem.values)
}

export function exampleOfForm(
  form: Pick<AppForm, "values">,
  examples: readonly LibraryExample[] = libraryExamples
): LibraryExample | null {
  const value = form.values.inputs[exampleInput]
  return typeof value !== "string" || value === ownVideo
    ? null
    : (examples.find((example) => example.id === value) ?? null)
}

export function tabOf(
  form: Pick<AppForm, "values">,
  fallback: MotionTab
): MotionTab {
  const value = form.values.inputs[modeInput]
  return isMotionTab(value) ? value : fallback
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

function chosenFor(hosted: HostedState, tab: MotionTab): CatalogModel | null {
  const { chosen } = hosted
  return chosen !== null && tabOfTask(chosen) === tab ? chosen : null
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

function blockedOf(
  checks: Pick<MotionChecks, "readingInput" | "clip" | "photo">
): string | null {
  return checks.readingInput ?? checks.clip?.name ?? checks.photo?.name ?? null
}

export function guardedOf(
  base: Pick<StartRun, "generate">,
  checks: Pick<MotionChecks, "readingInput" | "clip" | "photo">,
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

function useExampleChecks(
  form: AppForm,
  names: WellNames,
  range: ClipRange | null
): [LibraryExample | null, MotionChecks] {
  const example = exampleOfForm(form)
  const checks = useMotionChecks(
    form,
    names,
    range,
    example?.preview?.aspectRatio ?? null
  )
  return [example, checks]
}

/** Generate runs the chain when one holds this form, and the one run otherwise, each only once your files are read and fit. */
function startOf(
  chain: MotionChain | null,
  base: StartRun,
  checks: MotionChecks,
  focus: (name: string) => void
): StartRun {
  return chain === null
    ? { ...base, generate: guardedOf(base, checks, focus) }
    : { ...chain.start, generate: guardedOf(chain.start, checks, focus) }
}

/** The one sentence that says which stretch Motion keeps of a clip longer than the model takes. */
export function clipNoteOf(
  seconds: number | null,
  range: ClipRange | null
): string | null {
  const trimmed = trimmedOf(seconds, range)
  return trimmed === null
    ? null
    : tCatalog("motion.input.clip.trimmed", trimmed)
}

function ownVideoOf(form: AppForm): () => void {
  return () =>
    form.setForm({
      inputs: {
        ...form.values.inputs,
        [exampleInput]: ownVideo,
        [modelInput]: ltx25GuideModel,
      },
    })
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
  const tabHosted = useTabHosted(app, form, hosted, tab)
  useTabMatchesModel(form, hosted.chosen, tab, tabHosted.setTab)
  check.current = checkFor(app, chosen)
  const names = wellNamesOf(app, chosen)
  const range = clipRangeOf(chosen, textOf(form.values.inputs[modelInput]))
  const [example, checks] = useExampleChecks(form, names, range)
  const [pickCharacter, hasPickFailed] = useCharacterPhoto(form, names.photo)
  const [focus, registerWell] = useFocusers()
  const held = { ...form, values: heldValuesOf(app, form.values) }
  const base = useStartRun(app, held, onStarted, { ...hosted, chosen })
  const chain = useMotionChain({ example, form, clipSize: checks.clipSize })
  const start = startOf(chain, base, checks, focus)
  const isOwn = isOwnChain(example, form)
  const model = chosen === null ? appName(app) : modelNameOf(chosen)
  return {
    app,
    example,
    chain,
    isOwnChain: isOwn,
    useOwnVideo: ownVideoOf(form),
    tab,
    setTab: tabHosted.setTab,
    form,
    start,
    hosted: tabHosted.hosted,
    isGraph: chosen === null || isGraph(chosen),
    names,
    range,
    checks,
    clipMessage: clipMessageOf(checks.clip, range, isOwn ? null : model),
    clipNote: clipNoteOf(checks.clipSeconds, range),
    photoMessage: photoMessageOf(checks.photo, hasPickFailed),
    restFields: restFieldsOf(chosen),
    graphRest: graphRestOf(app),
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    pickCharacter,
    registerWell,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    onShortcut: shortcutOf(start.generate),
  }
}
