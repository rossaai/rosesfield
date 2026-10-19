export const traitValues = {
  gender: ["auto", "woman", "man", "androgynous"],
  age: ["auto", "young-adult", "adult", "middle-aged", "older"],
  skinTone: ["auto", "very-light", "light", "medium", "olive", "brown", "dark"],
  bodyType: ["auto", "slim", "average", "athletic", "broad"],
  hairLength: ["auto", "bald", "short", "medium", "long"],
  hairStyle: ["auto", "straight", "wavy", "curly", "coily", "braided"],
  hairColor: ["auto", "black", "brown", "blond", "red", "grey", "white"],
  eyeColor: ["auto", "brown", "hazel", "green", "blue", "grey"],
  outfit: ["auto", "casual", "formal", "sportswear", "workwear", "outdoor"],
} as const

export type TraitName = keyof typeof traitValues

export const traitNames: readonly TraitName[] = [
  "gender",
  "age",
  "skinTone",
  "bodyType",
  "hairLength",
  "hairStyle",
  "hairColor",
  "eyeColor",
  "outfit",
]

export const framingValues = ["portrait", "half-body", "full-body"] as const

export const traitsModels = [
  "flux-2-klein-4b",
  "z-image-turbo",
  "qwen-image-2512",
] as const

export const anglesModel = "qwen-image-edit-2511"

export const modes = ["traits", "angles"] as const

export type Mode = (typeof modes)[number]

export const portraitCounts = ["1", "2", "3", "4"] as const

export const defaultPortraitCount = "2"

export function camelOf(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, next: string) => next.toUpperCase())
}
