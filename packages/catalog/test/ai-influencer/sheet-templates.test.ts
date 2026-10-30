import { describe, expect, it } from "vitest"
import { aiInfluencerCopy } from "#ai-influencer/copy.en"
import {
  findTemplate,
  readTemplates,
  type SheetTemplate,
  templateInputsOf,
  templateNameKeyOf,
  templates,
} from "#ai-influencer/templates/sheet-templates"
import { traitInputNames } from "#ai-influencer/traits"

const capybara = {
  characterType: "capybara",
  gender: "man",
  hairstyle: "flat-top",
  hairColor: "black",
  outfit: "retro",
}

const absurdMan = {
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
}

const frog = {
  characterType: "frog",
  gender: "man",
  hairstyle: "mullet",
  hairColor: "bleached-blond",
  marks1: "gold-grill",
  outfit: "y2k",
}

const mantis = {
  characterType: "mantis",
  gender: "woman",
  hairstyle: "beehive",
  hairColor: "red",
  accessory: "earrings",
  outfit: "stage",
}

function withTraits(traits: Record<string, string>): unknown[] {
  const [first] = templates
  return [{ ...first, traits }]
}

describe("the templates of AI Influencer's Library", () => {
  it("hold the four characters the operator chose as the bar, each with its exact traits", () => {
    expect(templates.map((template) => [template.id, template.traits])).toEqual(
      [
        ["capybara", capybara],
        ["absurd-man", absurdMan],
        ["frog", frog],
        ["mantis", mantis],
      ]
    )
  })

  it("record the model each preview was made on, so none claims a model it did not use", () => {
    expect(
      templates.map((template) => [
        template.id,
        template.preview.model,
        template.preview.settings,
      ])
    ).toEqual([
      ["capybara", "z-image-turbo", { resolution: "1k" }],
      ["absurd-man", "z-image-turbo", { resolution: "1k" }],
      ["frog", "z-image-turbo", { resolution: "1k" }],
      [
        "mantis",
        "openai/gpt-image-2.5-sunburst",
        { quality: "medium", size: "1536x1024" },
      ],
    ])
  })

  it("name each template in the copy", () => {
    const names = templates.map(
      (template): string | undefined =>
        Object.entries(aiInfluencerCopy).find(
          ([key]) => key === templateNameKeyOf(template.id)
        )?.[1]
    )
    expect(names.every((name) => typeof name === "string")).toBe(true)
  })

  it("fill every trait: the template's own picks, and any in every other", () => {
    const template = findTemplate("frog")
    const inputs = template === null ? {} : templateInputsOf(template)
    expect(Object.keys(inputs)).toEqual(traitInputNames)
    expect(inputs).toMatchObject(frog)
    expect(inputs.age).toBe("any")
    expect(inputs.marks2).toBe("any")
    expect(findTemplate("dragon")).toBeNull()
  })
})

describe("a template the app cannot fill", () => {
  it("is refused when a trait offers no such value", () => {
    expect(() =>
      readTemplates(withTraits({ characterType: "dragon" }))
    ).toThrow("characterType offers no dragon")
  })

  it("is refused when it names no trait of the app, or picks any", () => {
    expect(() => readTemplates(withTraits({ wings: "feathered" }))).toThrow(
      "wings is no trait of the app"
    )
    expect(() => readTemplates(withTraits({ outfit: "any" }))).toThrow(
      "outfit offers no any"
    )
  })

  it("is refused when two templates share an id, and the four as written pass", () => {
    const twice: SheetTemplate[] = [...templates, ...templates]
    expect(() => readTemplates(twice)).toThrow("an id of its own")
    expect(readTemplates(templates)).toEqual(templates)
  })
})
