import { describe, expect, it } from "vitest"
import { traitsWords } from "@/studio/characters/traits-words"
import { traitFragments } from "../../../../../packages/catalog/src/characters/comfy/traits-prompt"

const { framing, traits, background, sourceReady } = traitFragments

describe("the traits become words", () => {
  it("names each chosen trait in the order of a portrait, then the framing's subject, the background and the source finish", () => {
    const words = traitsWords({
      framing: "portrait",
      gender: "woman",
      age: "adult",
      hairLength: "long",
      hairStyle: "curly",
      hairColor: "red",
      eyeColor: "green",
      outfit: "formal",
      plainBackground: "on",
    })
    expect(words).toBe(
      [
        framing.portrait,
        traits.gender.woman,
        traits.age.adult,
        traits.hairLength.long,
        traits.hairStyle.curly,
        traits.hairColor.red,
        traits.eyeColor.green,
        traits.outfit.formal,
        background.on,
        sourceReady,
      ].join("")
    )
  })

  it("adds no words for auto and frames half the body on a plain background by default", () => {
    expect(traitsWords({ gender: "auto", age: "auto" })).toBe(
      `${framing["half-body"]}${background.on}${sourceReady}`
    )
  })

  it("drops the hair style and color of a bald head", () => {
    const words = traitsWords({
      hairLength: "bald",
      hairStyle: "curly",
      hairColor: "red",
    })
    expect(words).toContain(traits.hairLength.bald)
    expect(words).not.toContain(traits.hairStyle.curly)
    expect(words).not.toContain(traits.hairColor.red)
  })

  it("ends with your details and ignores a value no trait knows", () => {
    const words = traitsWords({
      gender: "robot",
      plainBackground: "off",
      details: "  round glasses ",
    })
    expect(words).toBe(
      `${framing["half-body"]}${background.off}${sourceReady}. round glasses`
    )
  })
})
