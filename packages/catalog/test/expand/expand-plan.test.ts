import { describe, expect, it } from "vitest"
import { expandWorkflows } from "#expand/comfy/expand-binding"
import {
  formatCheckOf,
  type Plan,
  planOf,
  type Shares,
  sidesCanvasOf,
  sidesCheckOf,
  workingSizeOf,
} from "#expand/expand-plan"
import { findWorkflow } from "#list-workflows"
import { apiGraph } from "#workflow-entry.contract"

type PhotoSize = { width: number; height: number }

type ApiWorkflow = ReturnType<typeof apiGraph.parse>

const padNode = "21"

const functions: Readonly<Record<string, (...values: number[]) => number>> = {
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
}

type Token = { kind: "number" | "name" | "mark"; text: string }

function tokensOf(expression: string): Token[] {
  const found = expression.match(/\d+(\.\d+)?|[a-z]+|[-+*/(),]/g) ?? []
  return found.map((text) => ({
    kind: /^\d/.test(text) ? "number" : /^[a-z]/.test(text) ? "name" : "mark",
    text,
  }))
}

class Reader {
  private index = 0
  private readonly tokens: readonly Token[]
  private readonly names: Readonly<Record<string, number>>

  constructor(options: {
    tokens: readonly Token[]
    names: Readonly<Record<string, number>>
  }) {
    this.tokens = options.tokens
    this.names = options.names
  }

  read(): number {
    const value = this.sum()
    if (this.index !== this.tokens.length) {
      throw new Error("The expression has text past its end")
    }
    return value
  }

  private peek(): string | undefined {
    return this.tokens[this.index]?.text
  }

  private take(): Token {
    const token = this.tokens[this.index]
    if (token === undefined) {
      throw new Error("The expression ends early")
    }
    this.index += 1
    return token
  }

  private sum(): number {
    let value = this.product()
    while (this.peek() === "+" || this.peek() === "-") {
      value =
        this.take().text === "+"
          ? value + this.product()
          : value - this.product()
    }
    return value
  }

  private product(): number {
    let value = this.unit()
    while (this.peek() === "*" || this.peek() === "/") {
      value =
        this.take().text === "*" ? value * this.unit() : value / this.unit()
    }
    return value
  }

  private unit(): number {
    const token = this.take()
    if (token.kind === "number") {
      return Number(token.text)
    }
    if (token.text === "(") {
      const value = this.sum()
      this.take()
      return value
    }
    if (token.text === "-") {
      return -this.unit()
    }
    const call = functions[token.text]
    if (call !== undefined) {
      this.take()
      const values = [this.sum()]
      while (this.take().text === ",") {
        values.push(this.sum())
      }
      return call(...values)
    }
    const named = this.names[token.text]
    if (named === undefined) {
      throw new Error(
        `The expression names ${token.text}, which no input holds`
      )
    }
    return named
  }
}

function evaluate(
  expression: string,
  names: Readonly<Record<string, number>>
): number {
  return new Reader({ tokens: tokensOf(expression), names }).read()
}

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function linkValue(
  workflow: ApiWorkflow,
  link: readonly [string, number],
  photo: PhotoSize
): number {
  const node = workflow[link[0]]
  if (node === undefined) {
    throw new Error(`No node ${link[0]}`)
  }
  const input = (value: unknown): number => {
    if (isLink(value)) {
      return linkValue(workflow, value, photo)
    }
    if (typeof value !== "number") {
      throw new Error(`Node ${link[0]} holds no number`)
    }
    return value
  }
  switch (node.class_type) {
    case "GetImageSize":
      return link[1] === 0 ? photo.width : photo.height
    case "PrimitiveInt":
      return input(node.inputs.value)
    case "ComfyMathExpression": {
      const names: Record<string, number> = {}
      for (const [name, value] of Object.entries(node.inputs)) {
        if (name.startsWith("values.")) {
          names[name.slice("values.".length)] = input(value)
        }
      }
      const result = evaluate(String(node.inputs.expression), names)
      return link[1] === 1 ? Math.trunc(result) : result
    }
    default:
      throw new Error(`Node ${link[0]} is a ${node.class_type}`)
  }
}

function inputOf(
  workflow: ApiWorkflow,
  nodeId: string,
  name: string,
  photo: PhotoSize
): number {
  const value = workflow[nodeId]?.inputs[name]
  if (!isLink(value)) {
    throw new Error(`${nodeId}.${name} is no link`)
  }
  return linkValue(workflow, value, photo)
}

function graphPlan(
  workflow: ApiWorkflow,
  photo: PhotoSize
): Omit<Plan, "isScaled"> & { working: PhotoSize } {
  return {
    canvas: {
      width: inputOf(workflow, "43", "width", photo),
      height: inputOf(workflow, "43", "height", photo),
    },
    photo: {
      width: inputOf(workflow, "20", "width", photo),
      height: inputOf(workflow, "20", "height", photo),
    },
    pads: {
      top: inputOf(workflow, padNode, "top", photo),
      right: inputOf(workflow, padNode, "right", photo),
      bottom: inputOf(workflow, padNode, "bottom", photo),
      left: inputOf(workflow, padNode, "left", photo),
    },
    working: {
      width: inputOf(workflow, "24", "width", photo),
      height: inputOf(workflow, "24", "height", photo),
    },
  }
}

function fileGraph(mode: "format" | "sides"): ApiWorkflow {
  return apiGraph.parse(findWorkflow(expandWorkflows[mode])?.graph)
}

function formatGraph(format: string): ApiWorkflow {
  const [width = "1", height = "1"] = format.split(":")
  const workflow = fileGraph("format")
  setValue(workflow, "7", Number(width))
  setValue(workflow, "8", Number(height))
  return workflow
}

function sidesGraph(shares: Shares): ApiWorkflow {
  const workflow = fileGraph("sides")
  setValue(workflow, "3", shares.top)
  setValue(workflow, "4", shares.right)
  setValue(workflow, "5", shares.bottom)
  setValue(workflow, "6", shares.left)
  return workflow
}

function setValue(workflow: ApiWorkflow, nodeId: string, value: number): void {
  const node = workflow[nodeId]
  if (node === undefined) {
    throw new Error(`No node ${nodeId}`)
  }
  node.inputs.value = value
}

function fits(check: ReturnType<typeof formatCheckOf>): Plan {
  if (check.state !== "fits") {
    throw new Error(`The plan is ${check.state}`)
  }
  return check.plan
}

const photos: readonly PhotoSize[] = [
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 4000, height: 3000 },
  { width: 1001, height: 657 },
  { width: 256, height: 256 },
  { width: 1600, height: 900 },
  { width: 333, height: 1201 },
  { width: 3024, height: 4032 },
]

const formats = ["1:1", "4:3", "3:4", "16:9", "9:16"]

const shareSets: readonly Shares[] = [
  { top: 0, right: 0, bottom: 0, left: 50 },
  { top: 25, right: 25, bottom: 25, left: 25 },
  { top: 100, right: 100, bottom: 100, left: 100 },
  { top: 5, right: 0, bottom: 0, left: 0 },
  { top: 0, right: 35, bottom: 70, left: 15 },
]

describe("the Expand plan on the sample photos", () => {
  it("makes 1,368 by 768 from 1024 by 768 at 16:9 with the photo in the middle", () => {
    const plan = fits(formatCheckOf({ width: 1024, height: 768 }, "16:9"))
    expect(plan).toEqual({
      canvas: { width: 1368, height: 768 },
      photo: { width: 1024, height: 768 },
      pads: { top: 0, right: 172, bottom: 0, left: 172 },
      isScaled: false,
    })
  })

  it("refuses 9:16 for 1600 by 900 because it needs 3.2 times the height", () => {
    const check = formatCheckOf({ width: 1600, height: 900 }, "9:16")
    expect(check.state).toBe("tooFar")
    if (check.state === "tooFar") {
      expect(check.axis).toBe("height")
      expect(Math.round(check.times * 10) / 10).toBe(3.2)
    }
  })

  it("finds 1920 by 1080 already at 16:9", () => {
    expect(formatCheckOf({ width: 1920, height: 1080 }, "16:9")).toEqual({
      state: "same",
    })
  })

  it("scales 4000 by 3000 at 16:9 down to 1,536 by 864", () => {
    const plan = fits(formatCheckOf({ width: 4000, height: 3000 }, "16:9"))
    expect(plan.canvas).toEqual({ width: 1536, height: 864 })
    expect(plan.photo).toEqual({ width: 1152, height: 864 })
    expect(plan.isScaled).toBe(true)
  })

  it("makes 1,536 by 768 from 1024 by 768 with 50 on the left", () => {
    const check = sidesCheckOf(
      { width: 1024, height: 768 },
      { top: 0, right: 0, bottom: 0, left: 50 }
    )
    expect(check).toEqual({
      state: "fits",
      plan: {
        canvas: { width: 1536, height: 768 },
        photo: { width: 1024, height: 768 },
        pads: { top: 0, right: 0, bottom: 0, left: 512 },
        isScaled: false,
      },
    })
  })

  it("asks for space when all four sides are 0", () => {
    expect(
      sidesCheckOf(
        { width: 1024, height: 768 },
        { top: 0, right: 0, bottom: 0, left: 0 }
      )
    ).toEqual({ state: "noSpace" })
  })
})

describe("the workflow's plan nodes", () => {
  it("compute the same canvas, photo size and pads as the screen in To a format", () => {
    for (const photo of photos) {
      for (const format of formats) {
        const check = formatCheckOf(photo, format)
        if (check.state !== "fits") {
          continue
        }
        const { isScaled: _scaled, ...plan } = check.plan
        expect(graphPlan(formatGraph(format), photo)).toEqual({
          ...plan,
          working: workingSizeOf(plan.canvas),
        })
      }
    }
  })

  it("compute the same canvas, photo size and pads as the screen in By side", () => {
    for (const photo of photos) {
      for (const shares of shareSets) {
        const { isScaled: _scaled, ...plan } = planOf(
          photo,
          sidesCanvasOf(photo, shares),
          shares
        )
        expect(graphPlan(sidesGraph(shares), photo)).toEqual({
          ...plan,
          working: workingSizeOf(plan.canvas),
        })
      }
    }
  })

  it("keep every planned side on a multiple of 8 and within 1536 pixels", () => {
    for (const photo of photos) {
      for (const shares of shareSets) {
        const {
          canvas,
          pads,
          photo: placed,
        } = graphPlan(sidesGraph(shares), photo)
        expect(canvas.width % 8).toBe(0)
        expect(canvas.height % 8).toBe(0)
        expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(1536)
        expect(pads.left + placed.width + pads.right).toBe(canvas.width)
        expect(pads.top + placed.height + pads.bottom).toBe(canvas.height)
        expect(Math.min(...Object.values(pads))).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("names a changed expression: a planted rounding down shrinks the canvas", () => {
    const planted = formatGraph("16:9")
    const node = planted["10"]
    if (node === undefined) {
      throw new Error("No node 10")
    }
    node.inputs.expression = "floor(max(a, b * c / d) / 8) * 8"
    const photo = { width: 1024, height: 768 }
    expect(graphPlan(planted, photo).canvas.width).toBe(1360)
    expect(graphPlan(formatGraph("16:9"), photo).canvas.width).toBe(1368)
  })

  it("reads the plan from the nodes the workflow files hold", () => {
    expect(Object.keys(fileGraph("sides"))).not.toContain("7")
    expect(Object.keys(fileGraph("format"))).toContain("7")
  })
})
