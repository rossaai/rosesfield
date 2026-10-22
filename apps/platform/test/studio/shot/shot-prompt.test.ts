import { describe, expect, it } from "vitest"
import {
  choicesOf,
  sceneInput,
  sceneOf,
  splitWords,
  wordsOf,
} from "@/studio/shot/shot-prompt"

const scene = "A boat leaves the harbor"

describe("the words Shot sends", () => {
  it("adds no word for a choice left on Auto", () => {
    expect(wordsOf(scene, choicesOf({}))).toBe(`${scene}.`)
  })

  it("adds one phrase per picked choice, in the order of the 7 choices", () => {
    const words = wordsOf(
      scene,
      choicesOf({
        color: "black-and-white",
        movement: "push-in",
        light: "night",
      })
    )
    expect(words).toBe(
      `${scene}. The camera moves slowly toward the subject. Night lighting. Black and white, with no color.`
    )
  })

  it("changes when one choice changes", () => {
    const first = wordsOf(scene, choicesOf({ light: "night" }))
    const second = wordsOf(scene, choicesOf({ light: "golden-hour" }))
    expect(second).not.toBe(first)
    expect(second).toBe(`${scene}. Warm, low sunlight just before sunset.`)
  })

  it("sends nothing while the scene is empty", () => {
    expect(wordsOf("  ", choicesOf({ light: "night" }))).toBe("")
  })

  it("reads a value no list holds as Auto", () => {
    expect(choicesOf({ movement: "orbit" }).movement).toBe("auto")
  })
})

describe("the scene and choices read back from the words a run sent", () => {
  it("splits the words into the scene and every choice that made them", () => {
    const choices = choicesOf({
      movement: "crane-up",
      lens: "telephoto",
      mood: "eerie",
    })
    const words = wordsOf(scene, choices)
    expect(splitWords(words)).toEqual({ scene: `${scene}.`, choices })
  })

  it("gives the same words again from what it read back", () => {
    const words = wordsOf(scene, choicesOf({ focus: "shallow", color: "warm" }))
    const read = splitWords(words)
    expect(wordsOf(read.scene, read.choices)).toBe(words)
  })

  it("reads the form's own scene when the form holds one", () => {
    const shot = sceneOf(
      { [sceneInput]: scene, prompt: "other words", camera: "phone" },
      "prompt"
    )
    expect(shot.scene).toBe(scene)
    expect(shot.choices.camera).toBe("phone")
  })
})
