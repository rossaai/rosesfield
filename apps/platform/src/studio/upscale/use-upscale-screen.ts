import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, inputRulesOf, type Run } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  type FormValues,
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
  type FileLimits,
  type FileProblem,
  fileLimitsOf,
  isUpscaleMode,
  nearestRatioOf,
  readingProblemOf,
  type ScaleCheck,
  type Size,
  scaleCheckOf,
  sizeOf,
  type UpscaleMode,
} from "@/studio/upscale/upscale-limits"
import {
  factorOfScale,
  fileOf,
  inputsForModel,
  modeInput,
  modelForTab,
  modelInput,
  modelsOfTab,
  modeOfModel,
  restFieldsOf,
  type ScaleSpec,
  scaleOf,
  scaleValueOf,
  tabsOfModel,
  wellNameOf,
} from "@/studio/upscale/upscale-models"
import { useFileFacts } from "@/studio/upscale/use-file-facts"

export type UpscaleWell = {
  name: string
  limits: FileLimits
}

export type UpscaleScale = {
  spec: ScaleSpec | null
  value: string | number | null
  check: ScaleCheck
}

export type UpscaleState = {
  app: AppListing
  mode: UpscaleMode
  form: AppForm
  start: StartRun
  hosted: HostedState
  models: readonly CatalogModel[]
  well: UpscaleWell
  scale: UpscaleScale
  restFields: readonly ModelField[]
  fileMessage: string | null
  lastSeed: number | null
  hasRuns: boolean | null
  setMode: (mode: UpscaleMode) => void
  registerScale: (focus: () => void) => void
  registerWell: (focus: () => void) => void
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

export function bodyAppFor(app: AppListing, mode: UpscaleMode): AppListing {
  const applied = new Set(
    inputRulesOf(app, { [modeInput]: mode }).map((rule) => rule.input.name)
  )
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
  }
}

export function modeOf(value: unknown): UpscaleMode {
  return isUpscaleMode(value) ? value : "image"
}

export function messageOf(mode: UpscaleMode, problem: FileProblem): string {
  switch (problem.kind) {
    case "wrongKind":
      return t("field.asset.wrongKind", {
        kinds: tCatalog(`upscale.input.${mode}.kinds`),
      })
    case "unreadable":
      return tCatalog(`upscale.input.${mode}.unreadable`)
    case "tooLarge":
      return t("field.asset.tooLarge", {
        size: formatBytes(problem.bytes),
        limit: formatBytes(problem.limit),
      })
    case "tooSmall":
      return tCatalog(`upscale.input.${mode}.tooSmall`, {
        side: problem.side,
        min: problem.min,
      })
    case "tooLong":
      return t("field.asset.tooLong", {
        seconds: problem.seconds,
        max: problem.max,
      })
    case "tooShort":
      return t("field.asset.tooShort", {
        seconds: problem.seconds,
        min: problem.min,
      })
  }
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

export function runValuesOf(
  app: AppListing,
  run: Run,
  models: readonly CatalogModel[]
): FormValues {
  const values = valuesFromRun(app, run)
  const id = run.inputs[modelInput]
  const model = models.find((one) => one.id === id) ?? null
  const mode = modeOfModel(model, modeOf(values.inputs[modeInput]))
  return { ...values, inputs: { ...values.inputs, [modeInput]: mode } }
}

function useModeFromUse(form: AppForm, mode: UpscaleMode): void {
  const settled = useRef(false)
  const hasVideo = listOf(form.values.inputs.video).length > 0
  const hasImage = listOf(form.values.inputs.image).length > 0
  const { setInput } = form
  useEffect(() => {
    if (settled.current || !(hasVideo || hasImage)) {
      return
    }
    settled.current = true
    if (mode === "image" && hasVideo && !hasImage) {
      setInput(modeInput, "video")
    }
  }, [hasImage, hasVideo, mode, setInput])
}

function useModeOfModel(
  form: AppForm,
  chosen: CatalogModel | null,
  mode: UpscaleMode
): void {
  const { setInput } = form
  const served = chosen === null ? null : modeOfModel(chosen, mode)
  useEffect(() => {
    if (served !== null && served !== mode) {
      setInput(modeInput, served)
    }
  }, [mode, served, setInput])
}

function useRatioFromFile(form: AppForm, ratio: string | null): void {
  const { setForm } = form
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm({ aspectRatio: ratio })
    }
  }, [current, ratio, setForm])
}

function useScaleValue(form: AppForm, scale: UpscaleScale): void {
  const { setInput } = form
  const name = scale.spec?.name ?? null
  const held = name === null ? undefined : form.values.inputs[name]
  useEffect(() => {
    if (name !== null && scale.value !== null && held !== scale.value) {
      setInput(name, scale.value)
    }
  }, [name, held, scale.value, setInput])
}

function useFocuser(): [() => void, (focus: () => void) => void] {
  const focuser = useRef<() => void>(() => undefined)
  const register = useCallback((focus: () => void) => {
    focuser.current = focus
  }, [])
  return [() => focuser.current(), register]
}

function ratioOptionsOf(app: AppListing): readonly string[] {
  return app.output.kind === "image" || app.output.kind === "video"
    ? app.output.aspectRatios.options
    : []
}

function useTabHosted(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  mode: UpscaleMode
): [HostedState, (mode: UpscaleMode) => void] {
  const { models, chosen, defaultModel } = hosted
  const choose = (id: string): void => {
    const next = models.find((one) => one.id === id)
    if (next === undefined) {
      return
    }
    const file = fileOf(form.values.inputs, chosen, mode)
    form.setForm({
      inputs: inputsForModel(app, next, form.values.inputs, mode, file),
    })
  }
  const setMode = (next: UpscaleMode): void => {
    const model = modelForTab(modelsOfTab(models, next), [
      chosen?.id ?? null,
      defaultModel,
    ])
    if (model === null) {
      form.setInput(modeInput, next)
      return
    }
    const kept = {
      ...form.values.inputs,
      [mode]: fileOf(form.values.inputs, chosen, mode),
    }
    const file = fileOf(kept, model, next)
    form.setForm({ inputs: inputsForModel(app, model, kept, next, file) })
  }
  const tabModels = useMemo(() => modelsOfTab(models, mode), [models, mode])
  return [{ ...hosted, models: tabModels, choose }, setMode]
}

export function useUpscaleScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): UpscaleState {
  const check = useRef<FormCheck | null>(null)
  const form = useAppForm(app, seeds, check)
  const runs = useAppRuns(app)
  const hosted = useHostedModel(app, form)
  usePriceRefresh(app.id, runs.runs)
  const mode = modeOf(form.values.inputs[modeInput])
  const chosen =
    hosted.chosen !== null && tabsOfModel(hosted.chosen).includes(mode)
      ? hosted.chosen
      : null
  check.current = checkFor(app, chosen)
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  const [tabHosted, setMode] = useTabHosted(app, form, hosted, mode)
  useModeOfModel(form, hosted.chosen, mode)
  useModeFromUse(form, mode)
  const start = useStartRun(bodyApp, form, onStarted, {
    ...hosted,
    chosen,
  })
  const { view, generate } = useUpscaleView(app, form, chosen, mode, start)
  return {
    ...view,
    app,
    mode,
    form,
    start: { ...start, generate },
    hosted: tabHosted,
    models: hosted.models,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    setMode,
    useInputs: (run) => form.fill(runValuesOf(app, run, hosted.models)),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}

type UpscaleView = Pick<
  UpscaleState,
  | "well"
  | "scale"
  | "restFields"
  | "fileMessage"
  | "registerScale"
  | "registerWell"
>

export function scaleFor(
  spec: ScaleSpec | null,
  form: Pick<AppForm, "values">,
  size: Size | null
): UpscaleScale {
  const held = spec === null ? undefined : form.values.inputs[spec.name]
  return {
    spec,
    value: spec === null ? null : scaleValueOf(spec, held),
    check: scaleCheckOf(
      size,
      factorOfScale(spec, held),
      spec?.maxLongSide ?? null
    ),
  }
}

function useUpscaleView(
  app: AppListing,
  form: AppForm,
  chosen: CatalogModel | null,
  mode: UpscaleMode,
  start: StartRun
): { view: UpscaleView; generate: () => void } {
  const isGraph = chosen === null || chosen.form === null
  const well: UpscaleWell = {
    name: wellNameOf(chosen, mode),
    limits: fileLimitsOf(mode, isGraph),
  }
  const [assetId = null] = listOf(form.values.inputs[well.name])
  const reading = useFileFacts(assetId, mode)
  const size = sizeOf(reading.state === "read" ? reading.facts : null)
  const problem = readingProblemOf(mode, reading, well.limits)
  const scale = scaleFor(scaleOf(chosen, app), form, size)
  useScaleValue(form, scale)
  const ratio = size === null ? null : nearestRatioOf(ratioOptionsOf(app), size)
  useRatioFromFile(form, ratio)
  const [focusScale, registerScale] = useFocuser()
  const [focusWell, registerWell] = useFocuser()
  const generate = (): void => {
    if (reading.state === "reading" || problem !== null) {
      focusWell()
      return
    }
    if (scale.check.state === "tooBig") {
      focusScale()
      return
    }
    start.generate()
  }
  return {
    view: {
      well,
      scale,
      restFields: restFieldsOf(chosen),
      fileMessage: problem === null ? null : messageOf(mode, problem),
      registerScale,
      registerWell,
    },
    generate,
  }
}
