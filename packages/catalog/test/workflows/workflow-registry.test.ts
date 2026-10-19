import { describe, expect, it } from "vitest"
import { listWorkflows, readWorkflows } from "#list-workflows"
import { WorkflowInvalidError } from "#workflow-invalid.error"
import { sampleEntry, sampleFiles, sampleGraph } from "./sample-workflow"

function reasonOf(action: () => unknown): string {
  try {
    action()
  } catch (error) {
    if (error instanceof WorkflowInvalidError) {
      return error.message
    }
    throw error
  }
  return "no error"
}

describe("readWorkflows", () => {
  it("gives each workflow by id with its input map and its files", () => {
    const [workflow] = readWorkflows([sampleFiles()])
    expect(workflow?.id).toBe("sample-image")
    expect(workflow?.inputs.prompt?.path).toEqual(["6", "inputs", "text"])
    expect(workflow?.inputs.reference).toMatchObject({
      type: "cloud-asset",
      path: ["10", "inputs", "image"],
    })
    expect(workflow?.models).toEqual(["model.safetensors"])
    expect(workflow?.files).toEqual({
      ui: "workflows/sample-image/sample-image.json",
      api: "workflows/sample-image/sample-image.api.json",
    })
  })

  it("refuses an input that names a node the API file lacks", () => {
    const entry = sampleEntry()
    entry.inputBindings = {
      prompt: { nodeId: "7", inputName: "text", type: "scalar" },
    }
    expect(reasonOf(() => readWorkflows([sampleFiles(entry)]))).toContain(
      "the input prompt names node 7, which the API file lacks"
    )
  })

  it("refuses an input name the node does not take", () => {
    const entry = sampleEntry()
    entry.inputBindings = {
      prompt: { nodeId: "6", inputName: "words", type: "scalar" },
    }
    expect(reasonOf(() => readWorkflows([sampleFiles(entry)]))).toContain(
      "node 6 has no input words"
    )
  })

  it("refuses a graph with a subgraph's renamed nodes", () => {
    const graph = sampleGraph()
    graph["12:3"] = { class_type: "KSampler", inputs: {} }
    expect(
      reasonOf(() => readWorkflows([sampleFiles(sampleEntry(), graph)]))
    ).toContain("node 12:3 sits in a subgraph")
  })

  it("refuses a UI file in place of the API file", () => {
    const ui = { nodes: [{ id: 3, type: "KSampler" }], links: [], version: 0.4 }
    expect(
      reasonOf(() => readWorkflows([sampleFiles(sampleEntry(), ui)]))
    ).toContain("sample-image.api.json")
  })

  it("refuses a workflow that is not open source", () => {
    const entry = { ...sampleEntry(), openSource: false }
    expect(reasonOf(() => readWorkflows([sampleFiles(entry)]))).toContain(
      "entry.json"
    )
  })

  it("refuses a name that is not its folder and a folder listed twice", () => {
    const entry = { ...sampleEntry(), name: "other-image" }
    expect(reasonOf(() => readWorkflows([sampleFiles(entry)]))).toContain(
      "its name is other-image"
    )
    expect(
      reasonOf(() => readWorkflows([sampleFiles(), sampleFiles()]))
    ).toContain("another folder lists the same workflow")
  })

  it("refuses an output node the API file lacks", () => {
    const entry = {
      ...sampleEntry(),
      outputs: [{ nodeId: "99", key: "images", kind: "image" }],
    }
    expect(reasonOf(() => readWorkflows([sampleFiles(entry)]))).toContain(
      "the output node 99 is not in the API file"
    )
  })

  it("reads every folder of workflows/ the sync listed", () => {
    expect(() => listWorkflows()).not.toThrow()
  })
})
