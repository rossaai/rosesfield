export const autoValue = "auto"

export const relightLists = {
  direction: ["left", "right", "above", "front", "behind"],
  softness: ["soft", "hard"],
  color: ["warm", "neutral", "cool"],
} as const

export type RelightList = keyof typeof relightLists

export const brightnessSteps = [-2, -1, 0, 1, 2] as const

export const maxPhraseWords = 12

export const fixedInstruction = "Relight the photo"

export const directionAuto = "."

export const relightPhrases: Readonly<
  Record<RelightList, Readonly<Record<string, string>>>
> = {
  direction: {
    left: "with light from the left side of the picture.",
    right: "with light from the right side of the picture.",
    above: "with light from above.",
    front: "with light from the front, on the camera's side.",
    behind: "with light from behind the subject.",
  },
  softness: {
    soft: "Soft light with blurred shadows.",
    hard: "Hard light with sharp shadows.",
  },
  color: {
    warm: "Warm color.",
    neutral: "White light.",
    cool: "Cool color.",
  },
}

export const brightnessPhrases: Readonly<Record<string, string>> = {
  "-2": "Much dimmer light.",
  "-1": "Dimmer light.",
  "1": "Brighter.",
  "2": "Much brighter light.",
}

export function phraseOf(list: RelightList, value: string): string {
  if (value === autoValue) {
    return list === "direction" ? directionAuto : ""
  }
  const phrase = relightPhrases[list][value]
  if (phrase === undefined) {
    return ""
  }
  return ` ${phrase}`
}

export function brightnessPhraseOf(step: number): string {
  const phrase = brightnessPhrases[String(step)]
  return phrase === undefined ? "" : ` ${phrase}`
}

export type RelightChoices = {
  direction: string
  softness: string
  color: string
  brightness: number
  prompt: string
}

export function sentWords(choices: RelightChoices): string {
  const built = [
    fixedInstruction,
    phraseOf("direction", choices.direction),
    phraseOf("softness", choices.softness),
    phraseOf("color", choices.color),
    brightnessPhraseOf(choices.brightness),
  ].join("")
  return `${built} ${choices.prompt}`.replace(/\s+$/, "")
}

export function missingPhrases(
  values: readonly string[],
  phrases: Readonly<Record<string, string>>
): string[] {
  return values.filter((value) => {
    const phrase = phrases[value]
    return phrase === undefined || phrase.trim() === ""
  })
}

export function wordCount(phrase: string): number {
  return phrase.trim().split(/\s+/).length
}
