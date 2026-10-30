import {
  type Animal,
  accessoryWords,
  ageWords,
  animals,
  bagWords,
  buildWords,
  colorWords,
  eggBody,
  eyeColorWords,
  eyeShapeWords,
  facialHairWords,
  featureWords,
  hairWords,
  halfHorse,
  headShapeWords,
  heightWords,
  markWords,
  neckWords,
  nouns,
  type Pronoun,
  personWords,
  pronouns,
  proportionWords,
  skinWords,
  styleWords,
} from "#ai-influencer/sheet-words"
import {
  anyValue,
  characterTypes,
  slotNamesOf,
  traitSections,
} from "#ai-influencer/traits"

type Inputs = Readonly<Record<string, unknown>>

type Words = Readonly<Record<string, string>>

export const photoInput = "references"

export const sheetOpening = "Hyperreal studio photo on a pure white background."

export const sheetLayout =
  "Two views of the same character side by side: on the left a head-and-shoulders portrait, on the right the whole body from head to feet."

export const photoStart =
  "Base the character on the person in the reference photo."

export const sheetClose =
  "Whole body from head to feet in frame on the right, sharp focus, no text."

function pick(inputs: Inputs, name: string): string {
  const value = inputs[name]
  return typeof value === "string" && value !== anyValue ? value : ""
}

function wordOf(words: Words, value: string): string {
  return Object.hasOwn(words, value) ? (words[value] ?? "") : ""
}

function word(words: Words, inputs: Inputs, name: string): string {
  return wordOf(words, pick(inputs, name))
}

function picksOf(inputs: Inputs, section: string): string[] {
  const found = traitSections.find((one) => one.name === section)
  const names = found === undefined ? [] : slotNamesOf(found)
  const values = names.map((name) => pick(inputs, name)).filter(Boolean)
  return [...new Set(values)]
}

function withArticle(phrase: string): string {
  return /^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function joinList(items: readonly string[]): string {
  const kept = items.filter((item) => item !== "")
  const last = kept.at(-1)
  if (last === undefined || kept.length === 1) {
    return last ?? ""
  }
  return `${kept.slice(0, -1).join(", ")} and ${last}`
}

function hairOf(inputs: Inputs, animal: Animal | undefined): string {
  const style = pick(inputs, "hairstyle")
  const color = word(colorWords, inputs, "hairColor")
  if (style === "bald") {
    return animal === undefined ? wordOf(hairWords, style) : ""
  }
  if (style === "") {
    return color === "" ? "" : `${color} hair`
  }
  return wordOf(hairWords, style).replace(
    "{color}",
    color === "" ? "" : `${color} `
  )
}

function eyesOf(inputs: Inputs, animal: Animal | undefined): string {
  const asked = [
    word(eyeShapeWords, inputs, "eyeShape"),
    word(eyeColorWords, inputs, "eyeColor"),
  ].filter(Boolean)
  return asked.length === 0 ? (animal?.eyes ?? "") : `${asked.join(" ")} eyes`
}

function faceOf(inputs: Inputs, pronoun: Pronoun): string[] {
  const accessory = pick(inputs, "accessory")
  return [
    word(headShapeWords, inputs, "headShape"),
    word(neckWords, inputs, "neck"),
    ...picksOf(inputs, "features").map((one) => wordOf(featureWords, one)),
    ...picksOf(inputs, "marks").map((one) =>
      wordOf(markWords, one).replace("{their}", pronoun.their)
    ),
    wordOf(accessoryWords, accessory),
    word(facialHairWords, inputs, "facialHair"),
  ]
}

function headListOf(
  inputs: Inputs,
  animal: Animal | undefined,
  pronoun: Pronoun
): string {
  const eyes = eyesOf(inputs, animal)
  const hair = hairOf(inputs, animal)
  const face = faceOf(inputs, pronoun)
  const [shape = "", ...rest] = face
  return animal === undefined
    ? joinList([shape, eyes, ...rest, hair])
    : joinList([eyes, animal.extra ?? "", hair, ...face])
}

function bodyOf(inputs: Inputs, animal: Animal | undefined): string {
  const shapes = picksOf(inputs, "proportions")
  const withs = joinList([
    ...shapes.map((one) => wordOf(proportionWords, one)),
    word(skinWords, inputs, "skin"),
  ])
  const tail = withs === "" ? "" : ` with ${withs}`
  if (pick(inputs, "build") === "half-horse") {
    return `on ${halfHorse}${withs === "" ? "" : `,${tail}`}`
  }
  const adjectives = [
    word(heightWords, inputs, "stature"),
    word(buildWords, inputs, "build"),
    shapes.includes(eggBody) ? "egg-shaped" : "",
  ].filter(Boolean)
  if (animal === undefined && adjectives.length === 0 && tail === "") {
    return ""
  }
  const noun = animal === undefined ? "body" : "human body"
  return `on ${withArticle([...adjectives, noun].join(" "))}${tail}`
}

function outfitOf(inputs: Inputs): string {
  const outfit = word(styleWords, inputs, "outfit")
  const bag = pick(inputs, "accessory") === "bag" ? bagWords : ""
  return joinList([outfit, bag])
}

function animalOf(type: string): Animal | undefined {
  const found = characterTypes.find((one) => one === type)
  return found === undefined ? undefined : animals[found]
}

function characterOf(inputs: Inputs, pronoun: Pronoun): string {
  const type = pick(inputs, "characterType")
  const animal = animalOf(type)
  const noun = wordOf(nouns, pick(inputs, "gender") || anyValue)
  const age = word(ageWords, inputs, "age")
  const head = headListOf(inputs, animal, pronoun)
  const body = bodyOf(inputs, animal)
  const outfit = outfitOf(inputs)
  if (animal !== undefined) {
    const lead = withArticle(
      [animal.headed, age, noun].filter(Boolean).join(" ")
    )
    const face = head === "" ? "" : ` with ${head}`
    const dressed = outfit === "" ? "" : ` in ${outfit}`
    return `${capitalized(lead)}: a real ${animal.head}${face}, ${body}${dressed}.`
  }
  const kind = wordOf(personWords, type)
  const lead = withArticle([kind, age, noun].filter(Boolean).join(" "))
  return [
    `${capitalized(lead)}${head === "" ? "" : ` with ${head}`}`,
    body,
    outfit === "" ? "" : `wearing ${outfit}`,
  ]
    .filter(Boolean)
    .join(", ")
    .concat(".")
}

function pronounOf(inputs: Inputs): Pronoun {
  const gender = pick(inputs, "gender") || anyValue
  return pronouns[gender] ?? { subject: "They", verb: "stand", their: "their" }
}

function stanceOf(pronoun: Pronoun): string {
  return `${pronoun.subject} ${pronoun.verb} straight facing the camera, arms at ${pronoun.their} sides, hands empty, deadpan.`
}

export function hasPhoto(inputs: Inputs): boolean {
  const photo = inputs[photoInput]
  return Array.isArray(photo) && photo.length > 0
}

/** The one prompt AI Influencer sends: one character sheet on white, a head-and-shoulders portrait on the left and the same character whole body on the right. */
export function sheetPrompt(inputs: Inputs): string {
  const pronoun = pronounOf(inputs)
  const details =
    typeof inputs.details === "string" ? inputs.details.trim() : ""
  return [
    sheetOpening,
    hasPhoto(inputs) ? photoStart : "",
    sheetLayout,
    characterOf(inputs, pronoun),
    stanceOf(pronoun),
    sheetClose,
    details,
  ]
    .filter(Boolean)
    .join(" ")
}
