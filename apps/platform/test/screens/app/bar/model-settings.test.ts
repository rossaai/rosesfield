import { findApp } from "@rosesfield/catalog"
import { isHostedModelId } from "@rosesfield/catalog/comfy"
import { appListing, type InputDefinition } from "@rosesfield/contract"
import { isValidElement } from "react"
import { describe, expect, it } from "vitest"
import {
  choiceRowsOf,
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

describe("a row in a bar app's model picker", () => {
  it("reads a graph's facts from its fact row and the hosted model's from its own row", () => {
    expect(factsIdOf("z-image-turbo")).toBe("graph/z-image-turbo")
    expect(factsIdOf("minimax/minimax-h3")).toBe("minimax/minimax-h3")
  })

  it("names the graph's real lab in its mark, never the weights host's account", () => {
    const row = choiceRowsOf(modelOf("image")).find(
      (one) => one.id === "z-image-turbo"
    )
    const mark = row?.mark
    expect(
      isValidElement<{ maker: string }>(mark) ? mark.props.maker : null
    ).toBe("Alibaba Tongyi-MAI")
    expect(row?.keywords).toContain("Alibaba Tongyi-MAI")
  })

  it("shows a ranked graph's rank on its mark, no date in its caption, and orders the graphs by rank", () => {
    const rows = choiceRowsOf(modelOf("image"))
    const zImage = rows.find((one) => one.id === "z-image-turbo")
    expect(zImage?.rank).toMatchObject({ place: 39, label: "#39" })
    expect(zImage?.capabilities).toEqual([])
    const ranks = rows.flatMap((row) =>
      row.rank === undefined ? [] : [row.rank.place]
    )
    expect(ranks.length).toBeGreaterThan(1)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it("marks every open graph with the Open weights badge and no hosted model", () => {
    const rows = choiceRowsOf(modelOf("video"))
    for (const row of rows) {
      const isOpen = row.badges.some((badge) => badge.kind === "openWeights")
      expect(isOpen).toBe(!isHostedModelId(row.id))
      expect(row.capabilities.map((one) => one.label)).not.toContain(
        "Open weights"
      )
    }
    expect(rows.some((row) => isHostedModelId(row.id))).toBe(true)
  })
})
