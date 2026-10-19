import { describe, expect, it } from "vitest"
import {
  brightnessPhrases,
  brightnessSteps,
  maxPhraseWords,
  missingPhrases,
  relightLists,
  relightPhrases,
  sentWords,
  wordCount,
} from "#relight/relight-words"

const brandWords = /\b(film|movie|cinema|studio|rembrandt|hollywood)\b/i

describe("the words Relight sends", () => {
  it("holds one phrase for every value of every list", () => {
    for (const list of ["direction", "softness", "color"] as const) {
      expect(missingPhrases(relightLists[list], relightPhrases[list])).toEqual(
        []
      )
    }
    const steps = brightnessSteps.filter((step) => step !== 0).map(String)
    expect(missingPhrases(steps, brightnessPhrases)).toEqual([])
  })

  it("names a value that has no phrase", () => {
    expect(
      missingPhrases(["left", "sideways"], relightPhrases.direction)
    ).toEqual(["sideways"])
  })

  it("keeps every phrase at 12 words or fewer and free of names", () => {
    const phrases = [
      ...Object.values(relightPhrases).flatMap((table) => Object.values(table)),
      ...Object.values(brightnessPhrases),
    ]
    for (const phrase of phrases) {
      expect(wordCount(phrase)).toBeLessThanOrEqual(maxPhraseWords)
      expect(phrase).not.toMatch(brandWords)
    }
    expect(
      wordCount(
        "one two three four five six seven eight nine ten eleven twelve thirteen"
      )
    ).toBeGreaterThan(maxPhraseWords)
  })

  it("builds the instruction in order", () => {
    expect(
      sentWords({
        direction: "left",
        softness: "soft",
        color: "warm",
        brightness: 1,
        prompt: "",
      })
    ).toBe(
      "Relight the photo with light from the left side of the picture. Soft light with blurred shadows. Warm color. Brighter."
    )
    expect(
      sentWords({
        direction: "auto",
        softness: "auto",
        color: "auto",
        brightness: 0,
        prompt: "A candle on the table.",
      })
    ).toBe("Relight the photo. A candle on the table.")
  })
})
