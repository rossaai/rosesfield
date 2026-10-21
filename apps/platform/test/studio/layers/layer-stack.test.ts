import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  type Arrangement,
  canvasRunsOf,
  chooseVersion,
  emptyArrangement,
  moveLayer,
  orderedLayers,
  pickStack,
  type Stack,
  type StackLayer,
  shownVersion,
  stackOf,
  toggled,
} from "@/studio/layers/layer-stack"
import { flux3 } from "./layers-fixtures"

const firstLayer = "0a1b2c3d-4e5f-4a6b-8c7d-8e9fa0b1c2d3"
const secondLayer = "1b2c3d4e-5f6a-4b7c-9d8e-9fa0b1c2d3e4"
const firstEdit = "2c3d4e5f-6a7b-4c8d-8e9f-a0b1c2d3e4f5"
const secondEdit = "3d4e5f6a-7b8c-4d9e-9fa0-b1c2d3e4f5a6"

function layersRun(options: {
  id: string
  minute: number
  inputs: Record<string, unknown>
  outputs: string[]
}): Run {
  const minute = String(options.minute).padStart(2, "0")
  return run.parse({
    id: options.id,
    appId: "layers",
    status: "done",
    inputs: options.inputs,
    count: options.outputs.length,
    aspectRatio: "1:1",
    seed: 7,
    outputs: options.outputs,
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: `2026-10-17T10:${minute}:00.000Z`,
    finishedAt: `2026-10-17T10:${minute}:30.000Z`,
  })
}

const split = layersRun({
  id: "7d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e",
  minute: 0,
  inputs: { mode: "split" },
  outputs: [firstLayer, secondLayer],
})

function editOf(id: string, minute: number, layer: string, output: string) {
  return layersRun({
    id,
    minute,
    inputs: { mode: "edit", layer: [layer], change: "a red hat" },
    outputs: [output],
  })
}

const firstEditRun = editOf(
  "8e2f3041-5b6c-4d7e-8f80-a12b3c4d5e6f",
  1,
  secondLayer,
  firstEdit
)

const secondEditRun = editOf(
  "9f304152-6c7d-4e8f-9091-b23c4d5e6f70",
  2,
  secondLayer,
  secondEdit
)

function layerOf(stack: Stack): StackLayer {
  const layer = stack.layers.find((candidate) => candidate.key === secondLayer)
  if (layer === undefined) {
    throw new Error("The second layer is missing from the stack")
  }
  return layer
}

describe("the version a layer shows", () => {
  it("shows the newest version when you picked none", () => {
    const stack = stackOf(split, [split, firstEditRun])
    expect(shownVersion(layerOf(stack), emptyArrangement(stack))).toBe(
      firstEdit
    )
  })

  it("keeps the earlier version you picked while no run adds one", () => {
    const stack = stackOf(split, [split, firstEditRun])
    const picked = chooseVersion(
      emptyArrangement(stack),
      layerOf(stack),
      secondLayer
    )
    expect(shownVersion(layerOf(stack), picked)).toBe(secondLayer)
  })

  it("shows a new run's output after you picked an earlier version", () => {
    const before = stackOf(split, [split, firstEditRun])
    const picked: Arrangement = chooseVersion(
      emptyArrangement(before),
      layerOf(before),
      secondLayer
    )
    const after = stackOf(split, [split, firstEditRun, secondEditRun])
    expect(layerOf(after).versions).toEqual([
      secondLayer,
      firstEdit,
      secondEdit,
    ])
    expect(shownVersion(layerOf(after), picked)).toBe(secondEdit)
  })

  it("shows a new run's output after you picked the newest version", () => {
    const before = stackOf(split, [split, firstEditRun])
    const picked = chooseVersion(
      emptyArrangement(before),
      layerOf(before),
      firstEdit
    )
    const after = stackOf(split, [split, firstEditRun, secondEditRun])
    expect(shownVersion(layerOf(after), picked)).toBe(secondEdit)
  })
})

describe("canvasRunsOf", () => {
  const split = layersRun({
    id: "4e5f6a7b-8c9d-4e0f-8a1b-c2d3e4f5a6b7",
    minute: 1,
    inputs: { mode: "split" },
    outputs: [firstLayer, secondLayer],
  })
  const failedSplit: Run = {
    ...layersRun({
      id: "5f6a7b8c-9d0e-4f1a-9b2c-d3e4f5a6b7c8",
      minute: 2,
      inputs: { mode: "split" },
      outputs: [firstEdit],
    }),
    outputs: [],
    status: "failed",
    failure: { code: "ENGINE_UNAVAILABLE", status: 502 },
  }

  it("keeps the run you started last out of the earlier runs, whatever its status", () => {
    const shown = canvasRunsOf([failedSplit, split], split.id)
    expect(shown.latest?.id).toBe(failedSplit.id)
    expect(shown.earlier).toEqual([])
  })

  it("lets the stack stand for the latest run when the latest run made it", () => {
    const shown = canvasRunsOf([split, failedSplit], split.id)
    expect(shown.latest).toBeNull()
    expect(shown.earlier.map((one) => one.id)).toEqual([failedSplit.id])
  })
})

describe("the order and the shown layers of a stack", () => {
  it("moves a layer up and down and keeps every layer once", () => {
    const stack = stackOf(split, [split])
    const order = emptyArrangement(stack).order
    const up = moveLayer(order, firstLayer, 1)
    expect(up).toEqual([secondLayer, firstLayer])
    expect(moveLayer(up, firstLayer, 1)).toEqual(up)
    const arranged = orderedLayers(stack, {
      ...emptyArrangement(stack),
      order: up,
    })
    expect(arranged.map((layer) => layer.key)).toEqual([
      secondLayer,
      firstLayer,
    ])
  })

  it("hides a layer and shows it again", () => {
    const hidden = toggled(new Set(), secondLayer)
    expect(hidden.has(secondLayer)).toBe(true)
    expect(toggled(hidden, secondLayer).has(secondLayer)).toBe(false)
  })
})

describe("a hosted edit on a layer", () => {
  const hostedEdit = layersRun({
    id: "6a7b8c9d-0e1f-4a2b-8c3d-e4f5a6b7c8d9",
    minute: 3,
    inputs: {
      mode: "edit",
      model: flux3.id,
      inputImage: [secondLayer],
      prompt: "a hat",
    },
    outputs: [secondEdit],
  })

  it("joins the row of versions of the layer it changed", () => {
    const stack = stackOf(split, [split, hostedEdit])
    expect(layerOf(stack).versions).toEqual([secondLayer, secondEdit])
  })

  it("never stands for the stack, with no catalog to read", () => {
    expect(pickStack([hostedEdit, split], null)?.id).toBe(split.id)
    expect(pickStack([hostedEdit], hostedEdit.id)).toBeNull()
  })

  it("control: a run that names no mode never stands for the stack either", () => {
    const { mode: _, ...rest } = hostedEdit.inputs
    const unnamed = { ...hostedEdit, inputs: rest }
    expect(pickStack([unnamed, split], null)?.id).toBe(split.id)
  })
})
