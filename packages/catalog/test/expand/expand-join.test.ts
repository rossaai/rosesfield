import { describe, expect, it } from "vitest"
import { type ExpandMode, expandWorkflows } from "#expand/comfy/expand-binding"
import {
  formatCheckOf,
  type Plan,
  planOf,
  type Shares,
  sidesCanvasOf,
  workingSizeOf,
} from "#expand/expand-plan"
import { findWorkflow } from "#list-workflows"
import { apiGraph } from "#workflow-entry.contract"

type ApiWorkflow = ReturnType<typeof apiGraph.parse>
type ApiNode = ApiWorkflow[string]
type Link = [string, number]
type Axis = "width" | "height"
type Line = {
  label: string
  before: number
  photo: number
  after: number
  across: number
  canvas: number
  working: number
}
type Sizes = ReadonlyMap<string, number>
type Step = (values: readonly number[]) => number[]
type Chain = { feathering: number; steps: Step[] }

const band = 40
const hardStep = 0.15
const exact = 1e-6

function isLink(value: unknown): value is Link {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function linkIn(node: ApiNode, name: string): Link {
  const value = node.inputs[name]
  if (!isLink(value)) {
    throw new Error(`${node.class_type}.${name} is no link`)
  }
  return value
}

function nodeAt(graph: ApiWorkflow, link: Link): ApiNode {
  const node = graph[link[0]]
  if (node === undefined) {
    throw new Error(`No node ${link[0]}`)
  }
  return node
}

function numberIn(node: ApiNode, name: string): number {
  const value = node.inputs[name]
  if (typeof value !== "number") {
    throw new Error(`${node.class_type}.${name} holds no number`)
  }
  return value
}

function padMask(line: Line, feathering: number): number[] {
  const { before, photo, after, across } = line
  const feathered =
    feathering > 0 && feathering * 2 < photo && feathering * 2 < across
  return Array.from({ length: before + photo + after }, (_, x) => {
    const j = x - before
    if (j < 0 || j >= photo) {
      return 1
    }
    const d = Math.min(
      before === 0 ? photo : j,
      after === 0 ? photo : photo - j
    )
    return feathered && d < feathering
      ? ((feathering - d) / feathering) ** 2
      : 0
  })
}

function grown(values: readonly number[], expand: number): number[] {
  const reach = Math.abs(expand)
  const pick = expand < 0 ? Math.min : Math.max
  return values.map((_, x) =>
    pick(...values.slice(Math.max(0, x - reach), x + reach + 1))
  )
}

function blurred(
  values: readonly number[],
  radius: number,
  sigma: number
): number[] {
  const taps = Array.from({ length: 2 * radius + 1 }, (_, i) =>
    Math.exp(-(((i - radius) / radius) ** 2) / (2 * sigma * sigma))
  )
  const total = taps.reduce((sum, tap) => sum + tap, 0)
  const last = values.length - 1
  const at = (x: number): number =>
    values[x < 0 ? -x : x > last ? 2 * last - x : x] ?? 0
  return values.map(
    (_, x) =>
      taps.reduce((sum, tap, i) => sum + tap * at(x + i - radius), 0) / total
  )
}

function areaScaled(values: readonly number[], size: number): number[] {
  const n = values.length
  return Array.from({ length: size }, (_, i) => {
    const window = values.slice(
      Math.floor((i * n) / size),
      Math.ceil(((i + 1) * n) / size)
    )
    return window.reduce((sum, value) => sum + value, 0) / window.length
  })
}

function bilinearScaled(values: readonly number[], size: number): number[] {
  const last = values.length - 1
  return Array.from({ length: size }, (_, i) => {
    const source = Math.max(0, ((i + 0.5) * values.length) / size - 0.5)
    const low = Math.min(Math.floor(source), last)
    const share = source - low
    const high = Math.min(low + 1, last)
    return (values[low] ?? 0) * (1 - share) + (values[high] ?? 0) * share
  })
}

function scaleStep(node: ApiNode, axis: Axis, sizes: Sizes): Step {
  const size = sizes.get(linkIn(node, axis)[0])
  const method = node.inputs.upscale_method
  if (size === undefined) {
    throw new Error("An ImageScale in the mask chain names an unknown size")
  }
  if (method === "area") {
    return (values) => areaScaled(values, size)
  }
  if (method === "bilinear") {
    return (values) => bilinearScaled(values, size)
  }
  throw new Error(`The mask chain scales by ${String(method)}`)
}

function chainOf(
  graph: ApiWorkflow,
  link: Link,
  scale: (node: ApiNode) => Step,
  steps: Step[] = []
): Chain {
  const node = nodeAt(graph, link)
  switch (node.class_type) {
    case "ImageToMask":
      return chainOf(graph, linkIn(node, "image"), scale, steps)
    case "MaskToImage":
      return chainOf(graph, linkIn(node, "mask"), scale, steps)
    case "ImageScale":
      return chainOf(graph, linkIn(node, "image"), scale, [
        scale(node),
        ...steps,
      ])
    case "GrowMask": {
      const expand = numberIn(node, "expand")
      const grow: Step = (values) => grown(values, expand)
      return chainOf(graph, linkIn(node, "mask"), scale, [grow, ...steps])
    }
    case "ImageBlur": {
      const radius = numberIn(node, "blur_radius")
      const sigma = numberIn(node, "sigma")
      const blur: Step = (values) => blurred(values, radius, sigma)
      return chainOf(graph, linkIn(node, "image"), scale, [blur, ...steps])
    }
    case "ImagePadForOutpaint":
      if (link[1] !== 1) {
        throw new Error("The mask chain reads the padded image, not its mask")
      }
      return { feathering: numberIn(node, "feathering"), steps }
    default:
      throw new Error(`The mask chain meets a ${node.class_type}`)
  }
}

function paddedComposite(graph: ApiWorkflow): ApiNode {
  const composites = Object.values(graph).filter((node) => {
    if (node.class_type !== "ImageCompositeMasked") {
      return false
    }
    let destination = nodeAt(graph, linkIn(node, "destination"))
    while (destination.class_type === "RepeatImageBatch") {
      destination = nodeAt(graph, linkIn(destination, "image"))
    }
    return destination.class_type === "ImagePadForOutpaint"
  })
  const [composite] = composites
  if (composite === undefined || composites.length > 1) {
    throw new Error("The graph holds no single composite onto the padding")
  }
  return composite
}

function compositeMask(graph: ApiWorkflow, line: Line, axis: Axis): number[] {
  const composite = paddedComposite(graph)
  const pad = linkIn(composite, "mask")
  const sampler = Object.entries(graph).find(
    ([, node]) =>
      node.class_type === "ImageScale" &&
      nodeAt(graph, linkIn(node, "image")).class_type === "ImagePadForOutpaint"
  )
  if (sampler === undefined) {
    throw new Error("No ImageScale takes the padded image to the working size")
  }
  const sizes = new Map([
    [linkIn(nodeAt(graph, linkIn(composite, "source")), axis)[0], line.canvas],
    [linkIn(sampler[1], axis)[0], line.working],
  ])
  const chain = chainOf(graph, pad, (node) => scaleStep(node, axis, sizes))
  return chain.steps.reduce<number[]>(
    (values, step) => step(values),
    padMask(line, chain.feathering)
  )
}

function joinProblems(graph: ApiWorkflow, line: Line, axis: Axis): string[] {
  const mask = compositeMask(graph, line, axis)
  const problems: string[] = []
  const end = line.before + line.photo
  const isNew = (x: number): boolean => x < line.before || x >= end
  const fromJoin = (x: number): number =>
    Math.min(
      line.before === 0 ? line.photo : x - line.before,
      line.after === 0 ? line.photo : end - 1 - x
    )
  const least = Math.min(...mask.filter((_, x) => isNew(x)))
  if (least < 1 - exact) {
    const share = ((1 - least) * 100).toFixed(1)
    problems.push(`${line.label}: the new area shows ${share}% of the padding`)
  }
  const steepest =
    (Math.max(
      ...mask.slice(1).map((value, x) => Math.abs(value - (mask[x] ?? 0)))
    ) *
      line.canvas) /
    line.working
  if (steepest > hardStep) {
    const change = steepest.toFixed(2)
    problems.push(`${line.label}: the mask jumps ${change} in one pixel`)
  }
  const past = mask.filter(
    (value, x) => !isNew(x) && fromJoin(x) >= band && value > exact
  )
  if (past.length > 0) {
    problems.push(`${line.label}: the fill covers the photo past ${band} px`)
  }
  return problems
}

function linesOf(label: string, plan: Plan): Line[] {
  const working = workingSizeOf(plan.canvas)
  const lines: Line[] = [
    {
      label: `${label}, across`,
      before: plan.pads.left,
      photo: plan.photo.width,
      after: plan.pads.right,
      across: plan.photo.height,
      canvas: plan.canvas.width,
      working: working.width,
    },
    {
      label: `${label}, down`,
      before: plan.pads.top,
      photo: plan.photo.height,
      after: plan.pads.bottom,
      across: plan.photo.width,
      canvas: plan.canvas.height,
      working: working.height,
    },
  ]
  return lines.filter((line) => line.before + line.after > 0)
}

const photos = [
  { width: 2048, height: 2048 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 4000, height: 3000 },
  { width: 1001, height: 657 },
  { width: 256, height: 256 },
  { width: 333, height: 1201 },
]

const formats = ["1:1", "4:3", "3:4", "16:9", "9:16"]

const shareSets: readonly Shares[] = [
  { top: 0, right: 0, bottom: 0, left: 50 },
  { top: 25, right: 25, bottom: 25, left: 25 },
  { top: 5, right: 0, bottom: 0, left: 0 },
  { top: 0, right: 35, bottom: 70, left: 15 },
]

function plansOf(mode: ExpandMode): Line[] {
  return photos.flatMap((photo) => {
    const size = `${photo.width} by ${photo.height}`
    if (mode === "sides") {
      return shareSets.flatMap((shares) =>
        linesOf(
          `${size} by ${Object.values(shares).join(" ")}`,
          planOf(photo, sidesCanvasOf(photo, shares), shares)
        )
      )
    }
    return formats.flatMap((format) => {
      const check = formatCheckOf(photo, format)
      return check.state === "fits"
        ? linesOf(`${size} at ${format}`, check.plan)
        : []
    })
  })
}

function graphOf(mode: ExpandMode): ApiWorkflow {
  return apiGraph.parse(findWorkflow(expandWorkflows[mode])?.graph)
}

function problemsOf(graph: ApiWorkflow, lines: readonly Line[]): string[] {
  return lines.flatMap((line) =>
    joinProblems(
      graph,
      line,
      line.label.endsWith("across") ? "width" : "height"
    )
  )
}

const runLine = linesOf("the square photo at 16:9", {
  canvas: { width: 1536, height: 864 },
  photo: { width: 864, height: 864 },
  pads: { top: 0, right: 336, bottom: 0, left: 336 },
  isScaled: true,
})

describe("the join of Expand's fill and the photo", () => {
  it.each(["format", "sides"] as const)(
    "%s fills all of the new area, blends a band and keeps the photo past it",
    (mode) => {
      const lines = plansOf(mode)
      expect(lines.length).toBeGreaterThan(10)
      expect(problemsOf(graphOf(mode), lines)).toEqual([])
    }
  )

  it("names a planted wide blur and a planted hard edge, the control", () => {
    const planted = graphOf("format")
    const blur = Object.values(planted).find(
      (node) => node.class_type === "ImageBlur"
    )
    if (blur === undefined) {
      throw new Error("The format graph holds no ImageBlur")
    }
    blur.inputs.blur_radius = 31
    expect(problemsOf(planted, runLine)).toEqual([
      "the square photo at 16:9, across: the new area shows 14.4% of the padding",
      "the square photo at 16:9, across: the fill covers the photo past 40 px",
    ])
    blur.inputs.blur_radius = 1
    expect(problemsOf(planted, runLine)).toEqual([
      "the square photo at 16:9, across: the mask jumps 0.45 in one pixel",
    ])
  })
})
