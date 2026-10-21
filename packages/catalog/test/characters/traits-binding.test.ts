import type { EngineBinding } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  smallestSizesOf,
  traitsBinding,
} from "#characters/comfy/traits-binding"
import { sizesAt1k } from "#image/comfy/image-sizes"
import { zImageTurbo } from "#image/comfy/open-weights"
import {
  type ImageModel,
  imageGraphs,
  referenceModel,
} from "#image/image-models"
import { findWorkflow, type Workflow } from "#list-workflows"

function valueBindingsOf(binding: EngineBinding): unknown[] {
  const { bindings } = binding.config
  if (!Array.isArray(bindings)) {
    throw new Error("The binding holds no list of bindings")
  }
  return bindings.filter(
    (one: unknown) =>
      typeof one === "object" &&
      one !== null &&
      "from" in one &&
      one.from !== "input"
  )
}

function workflowOf(id: string): Workflow {
  const workflow = findWorkflow(id)
  if (workflow === null) {
    throw new Error(`No folder of workflows/ holds ${id}`)
  }
  return workflow
}

const portraitGraphs = imageGraphs.filter(
  (model) => model.value !== referenceModel
)

const cases = portraitGraphs.map((graph) => ({ model: graph.value, graph }))

describe("the traits binding of each portrait graph", () => {
  it.each(cases)(
    "fills the seed, the count and the size of $model at the targets Image names",
    ({ graph }) => {
      const image = graph.bind(smallestSizesOf(graph))
      expect(valueBindingsOf(traitsBinding(graph))).toEqual(
        valueBindingsOf(image)
      )
    }
  )

  it("leaves an input whose name only looks like a size at the graph's own value", () => {
    const turbo = workflowOf("image-z-image-turbo")
    const width = turbo.inputs.width
    if (width === undefined) {
      throw new Error("Z-Image Turbo names no width")
    }
    const grown: Workflow = {
      ...turbo,
      inputs: {
        ...turbo.inputs,
        upscaleWidth: { ...width, path: ["13", "inputs", "upscale_width"] },
      },
    }
    const model = portraitGraphs.find((one) => one.workflow === turbo.id)
    if (model === undefined) {
      throw new Error("Characters lacks Z-Image Turbo")
    }
    const binding = traitsBinding(model, () => grown)
    expect(JSON.stringify(valueBindingsOf(binding))).not.toContain(
      "upscale_width"
    )
  })

  it("refuses a graph it names no size targets for", () => {
    const other: ImageModel = {
      value: "other-image",
      labelKey: "image.model.zImageTurbo",
      workflow: "image-other-image",
      sizes: { "1k": sizesAt1k },
      bind: zImageTurbo,
    }
    const turbo = workflowOf("image-z-image-turbo")
    expect(() =>
      traitsBinding(other, () => ({ ...turbo, id: other.workflow }))
    ).toThrow("Characters names no size targets for this graph")
  })
})
