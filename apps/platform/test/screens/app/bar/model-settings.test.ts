import { findApp } from "@rosesfield/catalog"
import { appListing, type InputDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
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

function tagsOf(model: ChoiceInput): Map<string, string[]> {
  const rows = choiceSections(model).flatMap((section) => section.rows)
  return new Map(rows.map((row) => [row.id, row.tags.map((tag) => tag.label)]))
}

function rowsOf(model: ChoiceInput) {
  return choiceSections(model).flatMap((section) => section.rows)
}

describe("a row in a bar app's model picker", () => {
  it("reads a graph's facts from its fact row and the hosted model's from its own row", () => {
    expect(factsIdOf("z-image-turbo")).toBe("graph/z-image-turbo")
    expect(factsIdOf("minimax/minimax-h3")).toBe("minimax/minimax-h3")
  })

  it("names the graph's real lab, never the weights host's account", () => {
    const row = rowsOf(modelOf("image")).find(
      (one) => one.id === "z-image-turbo"
    )
    expect(row?.maker).toBe("Alibaba Tongyi-MAI")
  })

  it("shows a ranked graph's rank as #N with its release date, and orders the graphs by Top", () => {
    const rows = rowsOf(modelOf("image"))
    const zImage = rows.find((one) => one.id === "z-image-turbo")
    expect(zImage?.badges?.find((badge) => badge.kind === "rank")?.label).toBe(
      "#39"
    )
    expect(tagsOf(modelOf("image")).get("z-image-turbo")).toEqual([
      "Dec 2, 2025",
    ])
    const ranks = rows.flatMap((row) => {
      const label = row.badges?.find((badge) => badge.kind === "rank")?.label
      return label === undefined ? [] : [Number(label.slice(1))]
    })
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it("shows Open weights as a capability only where no weights badge says it, and never on a hosted model", () => {
    const rows = rowsOf(modelOf("video"))
    for (const row of rows) {
      const hasBadge = (row.badges ?? []).some(
        (badge) => badge.kind === "openWeights"
      )
      const hasTag = row.tags.some(
        (tag) => tag.label === t("model.tag.openWeights")
      )
      expect(hasBadge && hasTag).toBe(false)
    }
    expect(tagsOf(modelOf("video")).get("minimax/minimax-h3")).not.toContain(
      t("model.tag.openWeights")
    )
  })
})
