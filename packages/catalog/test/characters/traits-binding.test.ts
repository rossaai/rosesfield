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

type Bound = { from?: unknown; name?: unknown; path?: unknown }

function boundOf(binding: EngineBinding): Bound[] {
  const { bindings } = binding.config
  if (!Array.isArray(bindings)) {
    throw new Error("The binding holds no list of bindings")
  }
  return bindings.filter(
    (one: unknown): one is Bound => typeof one === "object" && one !== null
  )
}

function valueBindingsOf(binding: EngineBinding): Bound[] {
  return boundOf(binding).filter((one) => one.from !== "input")
}

function graphOf(binding: EngineBinding): Record<string, unknown> {
  const { workflow } = binding.config
  if (typeof workflow !== "object" || workflow === null) {
    throw new Error("The binding holds no graph")
  }
  return { ...workflow }
}

function promptPathOf(binding: EngineBinding): string[] {
  const prompt = boundOf(binding).find(
    (one) => one.from === "input" && one.name === "prompt"
  )
  const path = prompt?.path
  if (!Array.isArray(path)) {
    throw new Error("Image binds no prompt")
  }
  return path.map(String)
}

function inputAt(graph: Record<string, unknown>, path: string[]): unknown {
  const [node, , field] = path
  const found = graph[node ?? ""]
  if (typeof found !== "object" || found === null || !("inputs" in found)) {
    return undefined
  }
  const { inputs } = found
  return typeof inputs === "object" && inputs !== null
    ? Object.entries(inputs).find(([name]) => name === field)?.[1]
    : undefined
}

const portraitGraphs = imageGraphs.filter(
  (model) => model.value !== referenceModel
)

const cases = portraitGraphs.map((graph) => ({ model: graph.value, graph }))

describe("the traits binding of each portrait graph", () => {
  it.each(cases)(
    "fills the seed, the count and the size of $model where Image's own binding fills them",
    ({ graph }) => {
      const image = graph.bind(smallestSizesOf(graph))
      expect(valueBindingsOf(traitsBinding(graph))).toEqual(
        valueBindingsOf(image)
      )
    }
  )

  it.each(cases)(
    "feeds the prompt of $model from the trait words and keeps every node of Image's graph",
    ({ graph }) => {
      const image = graph.bind(smallestSizesOf(graph))
      const traits = traitsBinding(graph)
      const path = promptPathOf(image)
      expect(Object.keys(graphOf(traits))).toEqual(
        expect.arrayContaining(Object.keys(graphOf(image)))
      )
      const fed = inputAt(graphOf(traits), path)
      const [wordNode] = Array.isArray(fed) ? fed : []
      expect(typeof wordNode).toBe("string")
      expect(graphOf(traits)).toHaveProperty(String(wordNode))
      expect(inputAt(graphOf(image), path)).not.toEqual(fed)
      expect(
        boundOf(traits).some(
          (one) => one.from === "input" && one.name === "prompt"
        )
      ).toBe(false)
    }
  )

  it("refuses an image graph whose binding fills no prompt", () => {
    const turbo = portraitGraphs.find((one) => one.value === "z-image-turbo")
    if (turbo === undefined) {
      throw new Error("Characters lacks Z-Image Turbo")
    }
    const silent: ImageModel = {
      ...turbo,
      sizes: { "1k": sizesAt1k },
      bind: (table) => {
        const bound = zImageTurbo(table)
        return {
          ...bound,
          config: {
            ...bound.config,
            bindings: valueBindingsOf(bound),
          },
        }
      },
    }
    expect(() => traitsBinding(silent)).toThrow(
      "Characters writes the prompt, which Image binds to no one node"
    )
  })
})
