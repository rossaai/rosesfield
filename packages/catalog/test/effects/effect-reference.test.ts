import { describe, expect, it } from "vitest"
import {
  exampleOf,
  libraryExamples,
  readExamples,
} from "#motion/examples/library-examples"
import { keptRun } from "./passed-recipe"

const ledger = [keptRun("many-copies")]

function variant(change: Record<string, unknown>): Record<string, unknown> {
  return { ...exampleOf("many-copies"), ...change }
}

describe("the reference each effect recipe is designed from", () => {
  it("names the unit page and the family page by id and title alone, never a path", () => {
    for (const recipe of libraryExamples) {
      const text = JSON.stringify([recipe.design.unit, recipe.design.family])
      expect({ effect: recipe.id, path: /\/|\.md\b/.test(text) }).toEqual({
        effect: recipe.id,
        path: false,
      })
    }
  })

  it("names a reference by its title and never by a path, and refuses a unit page of another look", () => {
    const { design } = exampleOf("many-copies")
    for (const title of [
      "notes/unit-many-copies.md",
      "C:\\findings\\unit-many-copies.md",
    ]) {
      expect(() =>
        readExamples(
          {
            "many-copies": variant({
              design: { ...design, unit: { id: "many-copies", title } },
            }),
          },
          ledger
        )
      ).toThrow(/many-copies\.json is invalid: design\.unit\.title/)
    }
    expect(() =>
      readExamples(
        {
          "many-copies": variant({
            design: {
              ...design,
              unit: { id: "melt-away", title: "Unit: melt-away" },
            },
          }),
        },
        ledger
      )
    ).toThrow(/many-copies\.json is invalid: design\.unit\.id/)
    const { fit: _, ...unfitted } = design
    expect(() =>
      readExamples({ "many-copies": variant({ design: unfitted }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: design\.fit/)
  })
})
