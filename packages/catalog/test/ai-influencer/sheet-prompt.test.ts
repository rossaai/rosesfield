import { describe, expect, it } from "vitest"
import {
  photoStart,
  sheetClose,
  sheetLayout,
  sheetOpening,
  sheetPrompt,
} from "#ai-influencer/sheet-prompt"
import { characterTypes } from "#ai-influencer/traits"

const frame = `${sheetOpening} ${sheetLayout}`

function sheetOf(character: string, stance: string): string {
  return `${frame} ${character} ${stance} ${sheetClose}`
}

const he =
  "He stands straight facing the camera, arms at his sides, hands empty, deadpan."

const she =
  "She stands straight facing the camera, arms at her sides, hands empty, deadpan."

const they =
  "They stand straight facing the camera, arms at their sides, hands empty, deadpan."

describe("the prompt of the four characters the operator chose as the bar", () => {
  it("compose the mantis: a red beehive, pearl earrings and a stage suit", () => {
    expect(
      sheetPrompt({
        characterType: "mantis",
        gender: "woman",
        hairstyle: "beehive",
        hairColor: "red",
        accessory: "earrings",
        outfit: "stage",
      })
    ).toBe(
      sheetOf(
        "A praying-mantis-headed woman: a real bright green praying mantis head with huge compound eyes and antennae, an enormous red curly bouffant beehive hairdo and pearl drop earrings, on a human body in a theatrical black velvet suit with a frilly white lace jabot blouse and shiny black heels.",
        she
      )
    )
  })

  it("compose the frog: a bleached mullet, a gold grill and a Y2K tracksuit", () => {
    expect(
      sheetPrompt({
        characterType: "frog",
        gender: "man",
        hairstyle: "mullet",
        hairColor: "bleached-blond",
        marks1: "gold-grill",
        outfit: "y2k",
      })
    ).toBe(
      sheetOf(
        "A frog-headed man: a real wide-mouthed green toad head with bulging golden eyes, a long bleached-blond mullet haircut and a shiny gold grill on his teeth, mouth slightly open, on a human body in a Y2K baby-blue velour tracksuit, a thick silver chain and chunky white sneakers.",
        he
      )
    )
  })

  it("compose the capybara: a black flat-top in a retro suit", () => {
    expect(
      sheetPrompt({
        characterType: "capybara",
        gender: "man",
        hairstyle: "flat-top",
        hairColor: "black",
        outfit: "retro",
      })
    ).toBe(
      sheetOf(
        "A capybara-headed man: a real capybara head with sleepy deadpan eyes and a tall perfectly flat black flat-top haircut, on a human body in a retro 1970s chocolate-brown suit with huge lapels, a cream turtleneck and brown platform shoes.",
        he
      )
    )
  })

  it("compose the absurd man: a giant jaw, a soft-serve swirl and an egg body", () => {
    expect(
      sheetPrompt({
        characterType: "absurd",
        gender: "man",
        headShape: "mega-jaw",
        features1: "unibrow",
        accessory: "glasses",
        facialHair: "pencil",
        hairstyle: "soft-serve",
        hairColor: "pastel-pink",
        proportions1: "egg-body",
        proportions2: "short-legs",
        outfit: "sporty",
      })
    ).toBe(
      sheetOf(
        "An absurd man with a gigantic square mega jaw, a thick unibrow, tiny round gold glasses, a pencil moustache and a towering pastel-pink soft-serve swirl hairdo like an ice cream cone, on an egg-shaped body with short legs, wearing a lime-green retro tracksuit with white stripes and white sneakers.",
        he
      )
    )
  })
})

const characterOf: Readonly<Record<string, string>> = {
  any: "A person.",
  person: "A person.",
  bold: "A bold-looking person.",
  absurd: "An absurd person.",
  mantis:
    "A praying-mantis-headed person: a real bright green praying mantis head with huge compound eyes and antennae, on a human body.",
  frog: "A frog-headed person: a real wide-mouthed green toad head with bulging golden eyes, on a human body.",
  cat: "A cat-headed person: a real ginger tabby cat head with round green eyes and long whiskers, on a human body.",
  pug: "A pug-headed person: a real wrinkly fawn pug head with big glossy dark eyes and a flat black snout, on a human body.",
  capybara:
    "A capybara-headed person: a real capybara head with sleepy deadpan eyes, on a human body.",
  goose:
    "A goose-headed person: a real white goose head with small black eyes and an orange beak, on a human body.",
}

describe("the prompt of each character type", () => {
  it.each(characterTypes)("compose %s on its own", (characterType) => {
    expect(sheetPrompt({ characterType })).toBe(
      sheetOf(characterOf[characterType] ?? "", they)
    )
  })
})

describe("the prompt around the character", () => {
  it("put a real animal head on a human body with a human hairstyle and clothes", () => {
    const prompt = sheetPrompt({
      characterType: "goose",
      gender: "woman",
      hairstyle: "bob",
      hairColor: "black",
      outfit: "everyday",
    })
    expect(prompt).toContain(
      "A goose-headed woman: a real white goose head with small black eyes, an orange beak and a sharp black bob haircut, on a human body in a plain white t-shirt"
    )
  })

  it("ask for the portrait on the left and the whole body on the right, on white, with no text", () => {
    const prompt = sheetPrompt({ characterType: "pug" })
    expect(prompt.startsWith(`${sheetOpening} ${sheetLayout}`)).toBe(true)
    expect(prompt.endsWith(sheetClose)).toBe(true)
    expect(sheetLayout).toContain("on the left a head-and-shoulders portrait")
    expect(sheetClose).toContain("no text")
  })

  it("start from the photo when one is given, and add the free text last", () => {
    const prompt = sheetPrompt({
      characterType: "person",
      references: ["0b6f4f1e-3c2a-4d5e-8f70-1a2b3c4d5e6f"],
      details: "holding nothing ",
    })
    expect(prompt).toBe(
      `${sheetOpening} ${photoStart} ${sheetLayout} A person. ${they} ${sheetClose} holding nothing`
    )
  })

  it("name each pick of a section that takes several once", () => {
    const prompt = sheetPrompt({
      characterType: "person",
      features1: "freckles",
      features2: "freckles",
      features3: "gap-teeth",
    })
    expect(prompt).toContain(
      "A person with freckles and a gap between the front teeth."
    )
  })

  it("leave the hair off an animal head that is bald, and keep it on a person", () => {
    expect(
      sheetPrompt({ characterType: "frog", hairstyle: "bald" })
    ).not.toContain("bald")
    expect(sheetPrompt({ hairstyle: "bald" })).toContain(
      "A person with a shiny bald head."
    )
  })

  it("ignore a value no section offers", () => {
    expect(sheetPrompt({ characterType: "dragon", outfit: "armor" })).toBe(
      sheetPrompt({})
    )
  })
})
