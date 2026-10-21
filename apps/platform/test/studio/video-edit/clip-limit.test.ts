import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import {
  clipLimitOf,
  clipLimitsText,
  clipProblemOf,
} from "@/studio/video-edit/clip-limit"
import type { ClipFacts } from "@/studio/video-edit/use-clip-facts"
import { dreamina, fluxEdit, graphs } from "./video-edit-catalog"

function clipOf(seconds: number): ClipFacts {
  return { assetId: "clip", seconds, width: 1280, height: 720 }
}

describe("a model's clip limit", () => {
  it("is the longest length a hosted model's schema declares", () => {
    expect(clipLimitOf(dreamina)).toEqual({ min: 2, max: 15 })
  })

  it("is the graphs' 2 to 5 seconds for a graph and for a model with no length", () => {
    expect(clipLimitOf(graphs.background)).toEqual({ min: 2, max: 5 })
    expect(clipLimitOf(fluxEdit)).toEqual({ min: 2, max: 5 })
    expect(clipLimitOf(null)).toEqual({ min: 2, max: 5 })
  })

  it("shows in the clip well's line", () => {
    expect(clipLimitsText(clipLimitOf(dreamina))).toBe(
      "MP4, MOV or WebM, 2 to 15 seconds, up to 100 MB"
    )
  })
})

describe("a clip past the chosen model's limit", () => {
  it("names the model's limit on the clip well's input", () => {
    const problem = clipProblemOf(
      "video",
      clipOf(20),
      null,
      clipLimitOf(dreamina)
    )
    expect(problem).toEqual({
      name: "video",
      key: "field.asset.tooLong",
      values: { seconds: "20", max: 15 },
    })
    if (problem === undefined) {
      throw new Error("the clip raised no problem")
    }
    expect(t(problem.key, problem.values)).toBe(
      "This clip runs 20 seconds. Pick one of 15 seconds or less."
    )
  })

  it("holds a 12 second clip on Dreamina and refuses it on a graph", () => {
    expect(
      clipProblemOf("video", clipOf(12), null, clipLimitOf(dreamina))
    ).toBeUndefined()
    expect(
      clipProblemOf("source", clipOf(12), null, clipLimitOf(graphs.extend))
    ).toMatchObject({ name: "source", values: { max: 5 } })
  })

  it("refuses a clip shorter than 2 seconds and a file past 100 MB", () => {
    expect(
      clipProblemOf("source", clipOf(1), null, clipLimitOf(null))
    ).toMatchObject({ key: "field.asset.tooShort", values: { min: 2 } })
    expect(
      clipProblemOf("source", null, 120_000_000, clipLimitOf(null))
    ).toMatchObject({ key: "field.asset.tooLarge" })
    expect(
      clipProblemOf("source", clipOf(5), 1_000, clipLimitOf(null))
    ).toBeUndefined()
  })
})
