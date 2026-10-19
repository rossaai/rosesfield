import { describe, expect, it } from "vitest"
import { readWorkflows, type Workflow } from "#list-workflows"
import { workflowBinding } from "#workflow-binding"
import { sampleFiles } from "./sample-workflow"

const [sample] = readWorkflows([sampleFiles()])

function find(id: string): Workflow | null {
  return id === sample?.id ? sample : null
}

function nodesOf(graph: unknown): string[] {
  return typeof graph === "object" && graph !== null ? Object.keys(graph) : []
}

describe("workflowBinding", () => {
  it("binds app inputs to the workflow's inputs by their names", () => {
    const binding = workflowBinding({
      workflow: "sample-image",
      bindings: [
        { from: "input", name: "prompt", to: "prompt" },
        { from: "input", name: "references", index: 0, to: "reference" },
        { from: "seed", to: "seed" },
      ],
      outputsPerJob: "one",
      find,
    })
    expect(binding.adapter).toBe("comfy-workflow")
    expect(binding.config).toMatchObject({
      bindings: [
        { from: "input", name: "prompt", path: ["6", "inputs", "text"] },
        {
          from: "input",
          name: "references",
          index: 0,
          path: ["10", "inputs", "image"],
        },
        { from: "seed", path: ["3", "inputs", "seed"] },
      ],
      models: ["model.safetensors"],
      outputsPerJob: "one",
    })
    expect(binding.config.workflow).toEqual(sample?.graph)
  })

  it("refuses a workflow id no folder holds", () => {
    expect(() =>
      workflowBinding({ workflow: "missing-image", bindings: [], find })
    ).toThrow("no folder of workflows/ holds it")
  })

  it("refuses an input the workflow's input map lacks", () => {
    expect(() =>
      workflowBinding({
        workflow: "sample-image",
        bindings: [{ from: "input", name: "prompt", to: "negative" }],
        find,
      })
    ).toThrow("its input map has no negative")
  })

  it("patches a copy of the graph and refuses a patch that drops a bound node", () => {
    const patched = workflowBinding({
      workflow: "sample-image",
      bindings: [{ from: "seed", to: "seed" }],
      patch: (graph) => ({
        ...graph,
        "11": { class_type: "Note", inputs: {} },
      }),
      find,
    })
    expect(nodesOf(patched.config.workflow)).toContain("11")
    expect(nodesOf(sample?.graph)).not.toContain("11")
    expect(() =>
      workflowBinding({
        workflow: "sample-image",
        bindings: [{ from: "seed", to: "seed" }],
        patch: ({ "3": _, ...rest }) => rest,
        find,
      })
    ).toThrow("the patch removed node 3, which a binding uses")
  })
})
