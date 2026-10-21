import type { Run } from "@rosesfield/contract"

export type StackLayer = {
  key: string
  number: number
  versions: string[]
  working: number
}

export type Stack = {
  run: Run
  layers: StackLayer[]
}

export type ChosenVersion = {
  version: string
  versionCount: number
}

export type Arrangement = {
  order: readonly string[]
  hidden: ReadonlySet<string>
  chosen: Readonly<Record<string, ChosenVersion>>
}

export function isSplitRun(run: Run): boolean {
  return run.inputs.mode === "split"
}

export function runAssetsOf(run: Run): string[] {
  const named = run.inputs.layer
  if (Array.isArray(named)) {
    return [...named]
  }
  return Object.values(run.inputs).flatMap((value) =>
    Array.isArray(value) ? value : []
  )
}

function sourceLayerOf(
  run: Run,
  layers: readonly StackLayer[]
): StackLayer | undefined {
  for (const asset of runAssetsOf(run)) {
    const layer = layers.find((candidate) => candidate.versions.includes(asset))
    if (layer !== undefined) {
      return layer
    }
  }
  return undefined
}

export function stackOf(split: Run, runs: readonly Run[]): Stack {
  const layers: StackLayer[] = split.outputs.map((id, index) => ({
    key: id,
    number: index + 1,
    versions: [id],
    working: 0,
  }))
  const oldestFirst = [...runs].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  )
  for (const run of oldestFirst) {
    const layer =
      run.id === split.id || isSplitRun(run)
        ? undefined
        : sourceLayerOf(run, layers)
    if (layer === undefined) {
      continue
    }
    if (run.status === "queued" || run.status === "running") {
      layer.working += 1
    }
    if (run.status === "done") {
      layer.versions.push(...run.outputs)
    }
  }
  return { run: split, layers }
}

export function pickStack(
  runs: readonly Run[],
  preferred: string | null
): Run | null {
  const splits = runs.filter(
    (run) => isSplitRun(run) && run.status === "done" && run.outputs.length > 0
  )
  return splits.find((run) => run.id === preferred) ?? splits[0] ?? null
}

export function emptyArrangement(stack: Stack): Arrangement {
  return {
    order: stack.layers.map((layer) => layer.key),
    hidden: new Set(),
    chosen: {},
  }
}

export function orderedLayers(
  stack: Stack,
  arrangement: Arrangement
): StackLayer[] {
  const byKey = new Map(stack.layers.map((layer) => [layer.key, layer]))
  const placed = arrangement.order
    .map((key) => byKey.get(key))
    .filter((layer): layer is StackLayer => layer !== undefined)
  const missing = stack.layers.filter(
    (layer) => !arrangement.order.includes(layer.key)
  )
  return [...placed, ...missing]
}

export function shownVersion(
  layer: StackLayer,
  arrangement: Arrangement
): string {
  const chosen = arrangement.chosen[layer.key]
  if (
    chosen !== undefined &&
    chosen.versionCount === layer.versions.length &&
    layer.versions.includes(chosen.version)
  ) {
    return chosen.version
  }
  return layer.versions[layer.versions.length - 1] ?? layer.key
}

export function chooseVersion(
  arrangement: Arrangement,
  layer: StackLayer,
  version: string
): Arrangement {
  return {
    ...arrangement,
    chosen: {
      ...arrangement.chosen,
      [layer.key]: { version, versionCount: layer.versions.length },
    },
  }
}

export function moveLayer(
  order: readonly string[],
  key: string,
  step: -1 | 1
): string[] {
  const next = [...order]
  const from = next.indexOf(key)
  const to = from + step
  const other = next[to]
  if (from === -1 || other === undefined) {
    return next
  }
  next[to] = key
  next[from] = other
  return next
}

export function toggled(set: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(set)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  return next
}

export type CanvasRuns = {
  latest: Run | null
  earlier: Run[]
}

export function canvasRunsOf(
  runs: readonly Run[],
  stackRunId: string | null
): CanvasRuns {
  const [first] = runs
  const latest = first === undefined || first.id === stackRunId ? null : first
  return {
    latest,
    earlier: runs.filter(
      (run) => run.id !== stackRunId && run.id !== latest?.id
    ),
  }
}
