import type { AppListing, Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import {
  type AppForm,
  type FormCheck,
  useAppForm,
} from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import type { LayerActions, LayerRow } from "@/studio/layers/layer-list"
import {
  type Arrangement,
  chooseVersion,
  emptyArrangement,
  type IsSplit,
  moveLayer,
  orderedLayers,
  pickStack,
  type Stack,
  shownVersion,
  stackOf,
  toggled,
} from "@/studio/layers/layer-stack"
import {
  checkOf,
  layersValuesOf,
  runModeOf,
} from "@/studio/layers/layers-models"
import {
  formAppFor,
  type LayersMode,
  layerInput,
  modeOf,
} from "@/studio/layers/layers-modes"
import {
  hasPaint,
  type PixelSize,
  sizeOfAsset,
} from "@/studio/layers/stack-images"
import { useLayersModels } from "@/studio/layers/use-layers-models"
import { useLayersStart } from "@/studio/layers/use-layers-start"

export type LayersState = {
  app: AppListing
  formApp: AppListing
  mode: LayersMode
  form: AppForm
  start: StartRun
  hosted: HostedState
  stack: Stack | null
  rows: LayerRow[]
  shown: string[]
  size: PixelSize | null
  actions: LayerActions
  brushCanvas: RefObject<HTMLCanvasElement | null>
  focusSource: RefObject<() => void>
  brushSize: number
  setBrushSize: (size: number) => void
  clearBrush: () => void
  onPaint: () => void
  maskMissing: boolean
  pickedNumber: number | null
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

function useArrangement(stack: Stack | null) {
  const [byStack, setByStack] = useState<Record<string, Arrangement>>({})
  const arrangement =
    stack === null ? null : (byStack[stack.run.id] ?? emptyArrangement(stack))
  const change = (update: (current: Arrangement) => Arrangement): void => {
    if (stack === null || arrangement === null) {
      return
    }
    setByStack((current) => ({
      ...current,
      [stack.run.id]: update(arrangement),
    }))
  }
  return { arrangement, change }
}

function rowsOf(
  stack: Stack | null,
  arrangement: Arrangement | null,
  picked: string | null
): LayerRow[] {
  if (stack === null || arrangement === null) {
    return []
  }
  const ordered = orderedLayers(stack, arrangement)
  return ordered
    .map((layer, index) => ({
      layer,
      shown: shownVersion(layer, arrangement),
      isHidden: arrangement.hidden.has(layer.key),
      isPicked: layer.key === picked,
      isTop: index === ordered.length - 1,
      isBottom: index === 0,
    }))
    .reverse()
}

function useStackSize(stack: Stack | null): PixelSize | null {
  const first = stack?.layers[0]?.key ?? ""
  const query = useQuery({
    queryKey: ["layers-size", first],
    queryFn: () => sizeOfAsset(first),
    enabled: first !== "",
    staleTime: Number.POSITIVE_INFINITY,
  })
  return query.data ?? null
}

function useBrush() {
  const brushCanvas = useRef<HTMLCanvasElement | null>(null)
  const [brushSize, setBrushSize] = useState(48)
  const [maskMissing, setMaskMissing] = useState(false)
  const clearBrush = useCallback(() => {
    const canvas = brushCanvas.current
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])
  return {
    brushCanvas,
    brushSize,
    setBrushSize,
    clearBrush,
    maskMissing,
    setMaskMissing,
    onPaint: () => setMaskMissing(false),
  }
}

type Change = (update: (current: Arrangement) => Arrangement) => void

function actionsOf(
  stack: Stack | null,
  change: Change,
  pick: (key: string) => void
): LayerActions {
  return {
    pick,
    toggle: (key) =>
      change((current) => ({
        ...current,
        hidden: toggled(current.hidden, key),
      })),
    move: (key, step) =>
      change((current) => ({
        ...current,
        order: moveLayer(current.order, key, step),
      })),
    choose: (key, version) => {
      const layer = stack?.layers.find((candidate) => candidate.key === key)
      if (layer !== undefined) {
        change((current) => chooseVersion(current, layer, version))
      }
    },
  }
}

function useStackState(
  runs: readonly Run[],
  preferred: string | null,
  isSplit: IsSplit
) {
  const split = pickStack(runs, preferred, isSplit)
  const stack = split === null ? null : stackOf(split, runs, isSplit)
  const { arrangement, change } = useArrangement(stack)
  const [picked, setPicked] = useState<string | null>(null)
  const rows = rowsOf(stack, arrangement, picked)
  return {
    stack,
    rows,
    pickedRow: rows.find((row) => row.isPicked) ?? null,
    size: useStackSize(stack),
    actions: actionsOf(stack, change, setPicked),
  }
}

function useModeForm(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  check: RefObject<FormCheck | null>
) {
  const [mode, setMode] = useState<LayersMode>("split")
  const formApp = useMemo(() => formAppFor(app, mode), [app, mode])
  const form = useAppForm(formApp, seeds, check)
  const formMode = modeOf(form.values)
  useEffect(() => setMode(formMode), [formMode])
  return { mode, formApp, form }
}

function useLayerValue(
  mode: LayersMode,
  version: string | null,
  form: AppForm
): void {
  const { setInput } = form
  useEffect(() => {
    if (mode !== "split") {
      setInput(layerInput, version === null ? [] : [version])
    }
  }, [mode, version, setInput])
}

type StartFor = {
  app: AppListing
  mode: LayersMode
  form: AppForm
  hosted: HostedState
  brush: ReturnType<typeof useBrush>
  size: PixelSize | null
  onStarted: (run: Run) => void
}

function useStartFor(options: StartFor): StartRun {
  const { brush, mode, size } = options
  return useLayersStart({
    app: options.app,
    mode,
    form: options.form,
    chosen: options.hosted.chosen,
    keyState: options.hosted.keyState,
    mask: () =>
      brush.brushCanvas.current === null || size === null
        ? null
        : { canvas: brush.brushCanvas.current, size },
    check: () => {
      const canvas = brush.brushCanvas.current
      const isMissing =
        mode === "fill" && (canvas === null || !hasPaint(canvas))
      brush.setMaskMissing(isMissing)
      return !isMissing
    },
    onStarted: (run) => {
      if (mode === "fill") {
        brush.clearBrush()
      }
      options.onStarted(run)
    },
  })
}

function shortcutOf(start: StartRun) {
  return (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      start.generate()
    }
  }
}

function useLayersCatalog(
  app: AppListing,
  form: AppForm,
  runs: readonly Run[],
  check: RefObject<FormCheck | null>
) {
  const formMode = modeOf(form.values)
  const models = useLayersModels(app, form, runs, formMode)
  check.current = checkOf(models.hosted.chosen, formMode)
  const isSplit = useCallback(
    (run: Run) => runModeOf(run, models.all) === "split",
    [models.all]
  )
  return { ...models, isSplit }
}

function shownOf(rows: readonly LayerRow[]): string[] {
  return [...rows]
    .reverse()
    .filter((row) => !row.isHidden)
    .map((row) => row.shown)
}

type Catalog = ReturnType<typeof useLayersCatalog>

function runActionsOf(options: {
  app: AppListing
  form: AppForm
  catalog: Catalog
  setPreferred: (id: string | null) => void
  onStarted: () => void
}) {
  const { app, form, catalog, setPreferred } = options
  return {
    onStarted: (run: Run): void => {
      if (catalog.isSplit(run)) {
        setPreferred(null)
      }
      options.onStarted()
    },
    useInputs: (run: Run): void => {
      form.fill(layersValuesOf(app, run, catalog.all))
      if (catalog.isSplit(run)) {
        setPreferred(run.id)
      }
    },
  }
}

export function useLayersScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): LayersState {
  const check = useRef<FormCheck | null>(null)
  const { mode, formApp, form } = useModeForm(app, seeds, check)
  const runs = useAppRuns(app)
  const catalog = useLayersCatalog(app, form, runs.runs, check)
  const [preferred, setPreferred] = useState<string | null>(seeds.from ?? null)
  const layers = useStackState(runs.runs, preferred, catalog.isSplit)
  const brush = useBrush()
  const focusSource = useRef<() => void>(() => undefined)
  useLayerValue(mode, layers.pickedRow?.shown ?? null, form)
  const actions = runActionsOf({ app, form, catalog, setPreferred, onStarted })
  const start = useStartFor({
    app,
    mode,
    form,
    hosted: catalog.hosted,
    brush,
    size: layers.size,
    onStarted: actions.onStarted,
  })
  return {
    app,
    formApp,
    mode,
    form,
    start,
    hosted: catalog.hosted,
    stack: layers.stack,
    rows: layers.rows,
    shown: shownOf(layers.rows),
    size: layers.size,
    actions: layers.actions,
    ...brush,
    focusSource,
    pickedNumber: layers.pickedRow?.layer.number ?? null,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: actions.useInputs,
    onShortcut: shortcutOf(start),
  }
}
