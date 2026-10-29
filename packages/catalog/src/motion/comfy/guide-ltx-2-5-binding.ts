import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { type Graph, passThrough } from "#video/comfy/video-workflows"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"

export const ltx25GuideWorkflow = "motion-guide-ltx-2-5"

export const ltx25GuideInputs = {
  model: "model",
  photo: "photo",
  guide: "clip",
  mask: "mask",
  endKey: "endKey",
  scene: "scene",
  resolution: "resolution",
  seed: "seed",
} as const

export const ltx25ShortSides: Readonly<Record<string, number>> = {
  "480p": 512,
  "720p": 768,
}

export type RenderQuality = "draft" | "final"

/** The one render size of each pass: the draft at 480p, the final at 720p. */
export const renderResolutions: Readonly<Record<RenderQuality, string>> = {
  draft: "480p",
  final: "720p",
}

export const resultNode = "68"

export const lastFrameNode = "1011"

export const attentionNode = "115"

export const maskNodes: readonly string[] = Array.from(
  { length: 20 },
  (_, index) => String(950 + index)
)

export const endKeyGuides: readonly string[] = ["1001", "1003", "1004"]

export const endKeyImageNodes: readonly string[] = ["1002", "1005"]

export const lastFrameNodes: readonly string[] = ["1010", lastFrameNode]

const guideBindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: ltx25GuideInputs.photo, index: 0, to: "photo" },
  { from: "input", name: ltx25GuideInputs.guide, index: 0, to: "clip" },
  { from: "input", name: ltx25GuideInputs.scene, to: "scene" },
  {
    from: "input",
    name: ltx25GuideInputs.resolution,
    map: ltx25ShortSides,
    to: "shortSide",
  },
  { from: "seed", to: "seed" },
]

const maskBinding: WorkflowValueBinding = {
  from: "input",
  name: ltx25GuideInputs.mask,
  index: 0,
  to: "mask",
}

const endKeyBinding: WorkflowValueBinding = {
  from: "input",
  name: ltx25GuideInputs.endKey,
  index: 0,
  to: "endKey",
}

function removed(graph: Graph, ids: readonly string[]): Graph {
  for (const id of ids) {
    delete graph[id]
  }
  return graph
}

export function withoutMask(graph: Graph): Graph {
  const attention = graph[attentionNode]
  if (attention !== undefined) {
    delete attention.inputs.attention_mask
  }
  return removed(graph, maskNodes)
}

export function withoutEndKey(graph: Graph): Graph {
  for (const id of endKeyGuides) {
    passThrough(graph, id, ltx25GuideWorkflow)
  }
  return removed(graph, endKeyImageNodes)
}

export function withoutLastFrame(graph: Graph): Graph {
  return removed(graph, lastFrameNodes)
}

type Variant = { mask: boolean; endKey: boolean }

function variantGraph(variant: Variant) {
  return (workflow: Record<string, unknown>): Record<string, unknown> => {
    const graph: Graph = apiGraph.parse(workflow)
    const masked = variant.mask ? graph : withoutMask(graph)
    return variant.endKey ? withoutLastFrame(masked) : withoutEndKey(masked)
  }
}

function variantBinding(variant: Variant): EngineBinding {
  return workflowBinding({
    workflow: ltx25GuideWorkflow,
    bindings: [
      ...guideBindings,
      ...(variant.mask ? [maskBinding] : []),
      ...(variant.endKey ? [endKeyBinding] : []),
    ],
    results: [resultNode],
    patch: variantGraph(variant),
  })
}

function byEndKey(mask: boolean): EngineBinding {
  return selectBinding({
    input: ltx25GuideInputs.endKey,
    by: "filled",
    options: {
      filled: variantBinding({ mask, endKey: true }),
      empty: variantBinding({ mask, endKey: false }),
    },
  })
}

export const ltx25GuideEngine: EngineBinding = selectBinding({
  input: ltx25GuideInputs.mask,
  by: "filled",
  options: { filled: byEndKey(true), empty: byEndKey(false) },
})
