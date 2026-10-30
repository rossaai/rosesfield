import {
  anyValue,
  slotNamesOf,
  type TraitSection,
  traitSections,
} from "@rosesfield/catalog/ai-influencer"

type Inputs = Readonly<Record<string, unknown>>

export type TraitGroup = { key: string; sections: TraitSection[] }

const groupNames: ReadonlyArray<{ key: string; names: readonly string[] }> = [
  { key: "who", names: ["characterType", "gender", "age"] },
  { key: "hair", names: ["hairstyle", "hairColor", "facialHair"] },
  { key: "style", names: ["outfit", "accessory"] },
  {
    key: "face",
    names: ["headShape", "neck", "eyeShape", "eyeColor", "features", "marks"],
  },
  { key: "body", names: ["build", "stature", "proportions", "skin"] },
]

export const traitGroups: readonly TraitGroup[] = groupNames.map((group) => ({
  key: group.key,
  sections: traitSections.filter((section) =>
    group.names.includes(section.name)
  ),
}))

export function isMulti(section: TraitSection): boolean {
  return section.slots > 1
}

/** The values a person picked in a section that takes several, in the order of its slots. */
export function pickedOf(section: TraitSection, inputs: Inputs): string[] {
  return slotNamesOf(section).flatMap((name) => {
    const value = inputs[name]
    return typeof value === "string" && value !== anyValue ? [value] : []
  })
}

/** The slot values after a person turns one value of a section on or off: a picked value leaves, a new one takes the first free slot, and a full section stays as it was. */
export function togglePick(
  section: TraitSection,
  inputs: Inputs,
  value: string
): Record<string, string> {
  const picked = pickedOf(section, inputs)
  const isPicked = picked.includes(value)
  if (!isPicked && picked.length >= section.slots) {
    return {}
  }
  const next = isPicked
    ? picked.filter((one) => one !== value)
    : [...picked, value]
  return Object.fromEntries(
    slotNamesOf(section).map((name, index) => [name, next[index] ?? anyValue])
  )
}

function pickOne<Value>(
  values: readonly Value[],
  random: () => number
): Value | undefined {
  return values[Math.floor(random() * values.length)]
}

function shuffledSection(
  section: TraitSection,
  random: () => number
): Array<[string, string]> {
  const values = section.values.filter((value) => value !== anyValue)
  const names = slotNamesOf(section)
  const count = isMulti(section)
    ? Math.floor(random() * (section.slots + 1))
    : 1
  const chosen: string[] = []
  while (chosen.length < count) {
    const value = pickOne(
      values.filter((one) => !chosen.includes(one)),
      random
    )
    if (value === undefined) {
      break
    }
    chosen.push(value)
  }
  return names.map((name, index) => [name, chosen[index] ?? anyValue])
}

/** A new pick in every section, so one press of Shuffle gives a whole new character. */
export function shuffledTraits(random: () => number): Record<string, string> {
  return Object.fromEntries(
    traitSections.flatMap((section) => shuffledSection(section, random))
  )
}

export function randomUnit(): number {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1))
  return value / 2 ** 32
}
