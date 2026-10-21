import { type CatalogModel, isHostedModelId } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { assetQuery } from "@/api/queries"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  type FieldProblem,
  heldProblemsOf,
  valuesFromRun,
} from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
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
import {
  type ClipLimit,
  clipLimitOf,
  clipProblemOf,
} from "@/studio/video-edit/clip-limit"
import {
  type ClipFacts,
  hasSameFormat,
  nearestRatio,
  useClipFacts,
} from "@/studio/video-edit/use-clip-facts"
import {
  aspectInput,
  bodyAppFor,
  modeInput,
  modelInput,
  ratioOfFormat,
  sourceInput,
  type VideoEditMode,
} from "@/studio/video-edit/video-edit-modes"
import {
  type ClipField,
  clipFieldOf,
  modelForTab,
  modelsOfTab,
  openingTabOf,
  tabDefaultsOf,
  tabOfRun,
} from "@/studio/video-edit/video-edit-tabs"

export type VideoEditState = {
  app: AppListing
  mode: VideoEditMode
  setMode: (mode: VideoEditMode) => void
  form: AppForm
  start: StartRun
  hosted: HostedState
  tabModels: readonly CatalogModel[]
  chooseModel: (id: string) => void
  clipField: ClipField
  clipLimit: ClipLimit
  clip: ClipFacts | null
  clipProblem: FieldProblem | undefined
  isSameFormat: boolean
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  register: (name: string, focus: () => void) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

type Checks = {
  clipField: ClipField
  clipLimit: ClipLimit
  clip: ClipFacts | null
  clipProblem: FieldProblem | undefined
  isSameFormat: boolean
}

function useClip(
  form: AppForm,
  app: AppListing,
  mode: VideoEditMode,
  chosen: CatalogModel | null
): Checks {
  const clipField = clipFieldOf(chosen)
  const clipLimit = clipLimitOf(chosen)
  const [first = null] = listOf(form.values.inputs[clipField.name])
  const clip = useClipFacts(first)
  const asset = useQuery({
    ...assetQuery(first ?? ""),
    enabled: first !== null,
  })
  const bytes = first === null ? null : (asset.data?.asset.bytes ?? null)
  const format = ratioOfFormat(form.values.inputs[aspectInput])
  const options =
    app.output.kind === "video" ? app.output.aspectRatios.options : []
  const ratio =
    mode === "reframe"
      ? format
      : clip === null
        ? null
        : nearestRatio(clip, options)
  const { setForm } = form
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm({ aspectRatio: ratio })
    }
  }, [current, ratio, setForm])
  return {
    clipField,
    clipLimit,
    clip,
    clipProblem: clipProblemOf(clipField.name, clip, bytes, clipLimit),
    isSameFormat:
      mode === "reframe" &&
      !clipField.isHosted &&
      clip !== null &&
      format !== null &&
      hasSameFormat(clip, format),
  }
}

function useClipCarry(form: AppForm, chosen: CatalogModel | null): void {
  const field = clipFieldOf(chosen).name
  const [held = null] = listOf(form.values.inputs[field])
  const [placed = null] = listOf(form.values.inputs[sourceInput])
  const last = useRef<{ model: string | null; clip: string | null }>({
    model: null,
    clip: null,
  })
  const model = chosen?.id ?? null
  const { setInput } = form
  useEffect(() => {
    const before = last.current
    if (held === null && model !== before.model) {
      const carried = placed ?? before.clip
      if (carried !== null) {
        setInput(field, [carried])
      }
      last.current = { model, clip: carried }
      return
    }
    last.current = { model, clip: held }
  }, [field, held, model, placed, setInput])
}

function useModeInForm(form: AppForm, mode: VideoEditMode): void {
  const { setInput } = form
  const current = form.values.inputs[modeInput]
  useEffect(() => {
    if (current !== mode) {
      setInput(modeInput, mode)
    }
  }, [current, mode, setInput])
}

type TabModels = {
  tabModels: CatalogModel[]
  chooseModel: (id: string) => void
  setMode: (mode: VideoEditMode) => void
}

function useTabModels(
  app: AppListing,
  hosted: HostedState,
  mode: VideoEditMode,
  setModeState: (mode: VideoEditMode) => void
): TabModels {
  const held = useRef(new Map<VideoEditMode, string>())
  const tabModels = useMemo(
    () => modelsOfTab(hosted.models, app, mode),
    [hosted.models, app, mode]
  )
  const { choose, chosen, defaultModel, isLoading } = hosted
  const pick = useCallback(
    (next: VideoEditMode, models: readonly CatalogModel[]) => {
      const id = modelForTab(models, held.current.get(next) ?? null, [
        ...tabDefaultsOf(app, next, defaultModel),
      ])
      if (id !== null && id !== chosen?.id) {
        choose(id)
      }
    },
    [app, choose, chosen, defaultModel]
  )
  const isOutside =
    !isLoading &&
    tabModels.length > 0 &&
    (chosen === null || !tabModels.some((model) => model.id === chosen.id))
  useEffect(() => {
    if (isOutside) {
      pick(mode, tabModels)
    }
  }, [isOutside, mode, pick, tabModels])
  return {
    tabModels,
    chooseModel: (id) => {
      held.current.set(mode, id)
      choose(id)
    },
    setMode: (next) => {
      setModeState(next)
      pick(next, modelsOfTab(hosted.models, app, next))
    },
  }
}

function useGenerate(
  form: AppForm,
  started: StartRun,
  checks: Checks,
  focusers: Map<string, () => void>
): StartRun {
  return {
    ...started,
    generate: () => {
      const isFormValid = form.validate()
      if (!isFormValid) {
        return
      }
      if (checks.clipProblem !== undefined) {
        focusers.get(checks.clipField.name)?.()
        return
      }
      if (checks.isSameFormat) {
        focusers.get(aspectInput)?.()
        return
      }
      started.generate()
    },
  }
}

function useFormCheck(
  bodyApp: AppListing,
  hosted: HostedState,
  check: { current: FormCheck | null }
): void {
  const fields = hosted.fields
  check.current =
    fields === null
      ? (values) => heldProblemsOf(bodyApp, values)
      : (values) => hostedProblems(fields, values)
}

type Actions = Pick<VideoEditState, "useInputs" | "register" | "onShortcut">

function actionsOf(
  form: AppForm,
  hosted: HostedState,
  app: AppListing,
  setMode: (mode: VideoEditMode) => void,
  start: StartRun,
  focusers: Map<string, () => void>
): Actions {
  return {
    useInputs: (run) => {
      form.fill(valuesFromRun(app, run))
      const tab = tabOfRun(run.inputs, hosted.models, app)
      if (tab !== null) {
        setMode(tab)
      }
    },
    register: (name, focus) => {
      focusers.set(name, focus)
      form.register(name, focus)
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}

export function useVideoEditScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): VideoEditState {
  const check = useRef<FormCheck | null>(null)
  const form = useAppForm(app, seeds, check)
  const runs = useAppRuns(app)
  const hosted = useHostedModel(app, form, runs.runs)
  usePriceRefresh(app.id, runs.runs)
  const [mode, setModeState] = useState(() => openingTabOf(app))
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  useFormCheck(bodyApp, hosted, check)
  useSeededTab(form, hosted, app, setModeState)
  useModeInForm(form, mode)
  useClipCarry(form, hosted.chosen)
  const tabs = useTabModels(app, hosted, mode, setModeState)
  const started = useStartRun(bodyApp, form, onStarted, hosted)
  const checks = useClip(form, app, mode, hosted.chosen)
  const focusers = useRef(new Map<string, () => void>())
  const start = useGenerate(form, started, checks, focusers.current)
  return {
    app,
    mode,
    setMode: tabs.setMode,
    form,
    start,
    hosted,
    tabModels: tabs.tabModels,
    chooseModel: tabs.chooseModel,
    ...checks,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    ...actionsOf(form, hosted, app, setModeState, start, focusers.current),
  }
}

function useSeededTab(
  form: AppForm,
  hosted: HostedState,
  app: AppListing,
  setMode: (mode: VideoEditMode) => void
): void {
  const done = useRef(false)
  useEffect(() => {
    if (done.current || form.source !== "seed") {
      return
    }
    const model = form.values.inputs[modelInput]
    if (
      typeof model === "string" &&
      isHostedModelId(model) &&
      hosted.isLoading
    ) {
      return
    }
    done.current = true
    const tab = tabOfRun(form.values.inputs, hosted.models, app)
    if (tab !== null) {
      setMode(tab)
    }
  })
}
