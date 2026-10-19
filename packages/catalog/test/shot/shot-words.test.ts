import { describe, expect, it } from "vitest"
import {
  closingPhrase,
  phraseOf,
  type ShotList,
  sentWords,
  shotListOrder,
  shotLists,
  shotPhrases,
} from "#shot/shot-words"

type Lists = Readonly<Record<string, readonly string[]>>
type Phrases = Readonly<Record<string, Readonly<Record<string, string>>>>

const maxWords = 12
const refused = /\b(Kubrick|Spielberg|ARRI|RED|Kodak|IMAX|Panavision)\b/

function gapsOf(lists: Lists, phrases: Phrases): string[] {
  return Object.entries(lists).flatMap(([list, values]) =>
    values
      .filter((value) => {
        const phrase = phrases[list]?.[value]
        return (
          phrase === undefined ||
          phrase.trim() === "" ||
          phrase.split(/\s+/).length > maxWords
        )
      })
      .map((value) => `${list}.${value}`)
  )
}

describe("the phrase table", () => {
  it("holds one phrase of at most 12 words for every value of every list", () => {
    expect(gapsOf(shotLists, shotPhrases)).toEqual([])
  })

  it("flags a value that has no phrase, the control", () => {
    const planted = { ...shotLists, movement: [...shotLists.movement, "orbit"] }
    expect(gapsOf(planted, shotPhrases)).toEqual(["movement.orbit"])
  })

  it("names no brand, person or film", () => {
    const phrases = Object.values(shotPhrases).flatMap(Object.values)
    expect(phrases.filter((phrase) => refused.test(phrase))).toEqual([])
    expect(refused.test("Shot on a Kodak stock.")).toBe(true)
  })
})

describe("sentWords", () => {
  const scene = "A woman crosses a rainy street at night"

  it("adds one sentence per chosen value, then the closing sentence", () => {
    const words = sentWords({
      scene,
      choices: {
        mood: "tense",
        color: "cool",
        light: "night",
        lens: "telephoto",
        movement: "push-in",
      },
      movementAsWords: true,
      closes: true,
    })
    expect(words).toBe(
      "A woman crosses a rainy street at night. The camera moves slowly toward the subject. Shot on a telephoto lens. Night lighting. Cool colors. A tense mood. One continuous shot."
    )
  })

  it("adds no words for auto", () => {
    const choices = Object.fromEntries(
      shotListOrder.map((list: ShotList) => [list, "auto"])
    )
    expect(
      sentWords({ scene, choices, movementAsWords: true, closes: false })
    ).toBe(`${scene}.`)
    expect(phraseOf("light", "auto")).toBe("")
  })

  it("keeps the movement out of the words when the model takes it as a camera input", () => {
    const words = sentWords({
      scene: "  A dog runs on a beach!  ",
      choices: { movement: "push-in", color: "warm" },
      movementAsWords: false,
      closes: false,
    })
    expect(words).toBe("A dog runs on a beach! Warm colors.")
    expect(words).not.toContain(closingPhrase)
  })
})
