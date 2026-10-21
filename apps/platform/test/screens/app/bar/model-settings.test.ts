import { findApp } from "@rosesfield/catalog"
import { appListing, type InputDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { tCatalog } from "@/copy/t"
import {
  choiceSections,
  factsIdOf,
  modelInputName,
} from "@/screens/app/bar/model-settings"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function modelOf(id: string): ChoiceInput {
  const input = appListing
    .parse(findApp(id))
    .inputs.find((one) => one.name === modelInputName)
  if (input?.type !== "choice") {
    throw new Error(`${id} has no model choice`)
  }
  return input
}

function linesOf(model: ChoiceInput): Map<string, string | null> {
  const rows = choiceSections(model).flatMap((section) => section.rows)
  return new Map(rows.map((row) => [row.id, row.line]))
}

describe("the line of a row in a bar app's model picker", () => {
  it("reads a graph's line from its fact row and the hosted model's from its own row", () => {
    expect(factsIdOf("z-image-turbo")).toBe("graph/z-image-turbo")
    expect(factsIdOf("minimax/minimax-h3")).toBe("minimax/minimax-h3")
  })

  it("shows the sourced line of a graph whose fact row holds one", () => {
    expect(linesOf(modelOf("image")).get("z-image-turbo")).toContain(
      tCatalog("comfy.model.graphZImageTurbo.line")
    )
  })

  it("shows no line for a model whose fact row holds none, the control being the app's own line it showed before", () => {
    const lines = linesOf(modelOf("ads"))
    expect(lines.get("qwen-image-edit-2511")).toContain(
      tCatalog("comfy.model.graphQwenImageEdit2511.line")
    )
    for (const option of modelOf("ads").options) {
      expect(lines.get(option.value)).not.toBe(
        tCatalog(`${option.labelKey}.line`)
      )
    }
  })
})
