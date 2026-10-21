import { existsSync, readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { listWorkflows } from "#list-workflows"
import { apiGraph } from "#workflow-entry.contract"

const root = fileURLToPath(new URL("../../../../", import.meta.url))

const uiSlot = z.looseObject({
  name: z.string(),
  link: z.number().nullable().optional(),
})

const uiNode = z.looseObject({
  id: z.number(),
  type: z.string(),
  mode: z.number(),
  inputs: z.array(uiSlot).default([]),
  widgets_values: z.unknown().optional(),
  properties: z
    .looseObject({
      models: z
        .array(z.looseObject({ name: z.string(), url: z.string() }))
        .optional(),
    })
    .default({}),
})

const uiLink = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.string(),
])

const uiFile = z.looseObject({
  version: z.literal(0.4),
  nodes: z.array(uiNode),
  links: z.array(uiLink),
})

type UiFile = z.infer<typeof uiFile>
type ApiGraph = z.infer<typeof apiGraph>

function isUiOnly(node: z.infer<typeof uiNode>): boolean {
  return node.type === "MarkdownNote" || node.mode === 2 || node.mode === 4
}

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function pairProblems(ui: UiFile, api: ApiGraph): string[] {
  const problems: string[] = []
  const nodes = new Map(ui.nodes.map((node) => [String(node.id), node]))
  for (const node of ui.nodes) {
    const twin = api[String(node.id)]
    if (!isUiOnly(node) && twin?.class_type !== node.type) {
      problems.push(`UI node ${node.id} ${node.type} is not in the API file`)
    }
  }
  for (const [id, node] of Object.entries(api)) {
    if (nodes.get(id)?.type !== node.class_type) {
      problems.push(`API node ${id} ${node.class_type} is not in the UI file`)
    }
  }
  for (const [, origin, slot, target, targetSlot] of ui.links) {
    const node = nodes.get(String(target))
    const from = nodes.get(String(origin))
    if (node === undefined || from === undefined) {
      problems.push(`link ${origin} to ${target} names a missing node`)
      continue
    }
    if (isUiOnly(node) || isUiOnly(from)) {
      continue
    }
    const name = node.inputs[targetSlot]?.name ?? ""
    const sent = api[String(target)]?.inputs[name]
    if (!isLink(sent) || sent[0] !== String(origin) || sent[1] !== slot) {
      problems.push(
        `link ${origin}:${slot} to ${target}.${name} is not in the API file`
      )
    }
  }
  for (const [id, node] of Object.entries(api)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      const slot = nodes.get(id)?.inputs.find((one) => one.name === name)
      if (isLink(value) && (slot === undefined || slot.link === null)) {
        problems.push(`API link ${id}.${name} is not in the UI file`)
      }
    }
  }
  for (const node of ui.nodes) {
    const values = Array.isArray(node.widgets_values) ? node.widgets_values : []
    for (const model of node.properties.models ?? []) {
      if (!values.includes(model.name)) {
        problems.push(
          `node ${node.id} lists ${model.name}, which its widgets do not hold`
        )
      }
      if (!model.url.startsWith("https://huggingface.co/")) {
        problems.push(
          `node ${node.id} links ${model.name} outside Hugging Face`
        )
      }
    }
  }
  return problems
}

function read(path: string): unknown {
  return JSON.parse(readFileSync(`${root}${path}`, "utf8"))
}

const workflows = listWorkflows()

describe("each workflow pair in workflows/", () => {
  it("lists every folder of workflows/ that holds an entry", () => {
    const folders = readdirSync(`${root}workflows`, { withFileTypes: true })
      .filter((one) => one.isDirectory())
      .filter((one) => existsSync(`${root}workflows/${one.name}/entry.json`))
      .map((one) => one.name)
      .sort()
    expect(folders.length).toBeGreaterThan(0)
    expect(workflows.map((workflow) => workflow.id).sort()).toEqual(folders)
  })

  it.each(workflows.map((workflow) => ({ id: workflow.id, workflow })))(
    "$id keeps one graph in its UI file and its API file",
    ({ workflow }) => {
      const ui = uiFile.parse(read(workflow.files.ui))
      const api = apiGraph.parse(read(workflow.files.api))
      expect(pairProblems(ui, api)).toEqual([])
      expect(
        ui.nodes.filter((node) => node.type === "MarkdownNote")
      ).toHaveLength(1)
    }
  )

  it("finds a planted id, a planted link and a planted model name, the control", () => {
    const [first] = workflows
    if (first === undefined) {
      throw new Error("no workflow is listed")
    }
    const ui = uiFile.parse(read(first.files.ui))
    const api = apiGraph.parse(read(first.files.api))
    const planted = structuredClone(ui)
    const [link] = planted.links
    const loader = planted.nodes.find(
      (node) => (node.properties.models ?? []).length > 0
    )
    if (link === undefined || loader === undefined) {
      throw new Error("the first workflow has no link or no loader")
    }
    link[2] = 9
    const [model] = loader.properties.models ?? []
    if (model !== undefined) {
      model.name = "planted.safetensors"
    }
    planted.nodes.push({
      id: 9999,
      type: "KSampler",
      mode: 0,
      inputs: [],
      properties: {},
    })
    const problems = pairProblems(planted, api)
    expect(problems).toContain("UI node 9999 KSampler is not in the API file")
    expect(problems.some((one) => one.includes(`${link[1]}:9`))).toBe(true)
    expect(problems.some((one) => one.includes("planted.safetensors"))).toBe(
      true
    )
  })
})
