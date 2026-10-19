import type {
  Background,
  Clothes,
  Framing,
  Glasses,
} from "#headshots/headshots-values"

export const leadWords =
  "Make a headshot of the person in the photo. Keep their face, hair, skin, age and expression exactly as they are. The person faces the camera in even, soft light."

export const framingWords: Readonly<Record<Framing, string>> = {
  close: "The head and neck fill the frame.",
  standard: "The frame shows the head and shoulders.",
  wide: "The frame shows the head, the shoulders and the upper chest.",
}

export const backgroundWords: Readonly<Record<Background, string>> = {
  white: "A plain white background.",
  grey: "A plain mid-grey background.",
  dark: "A plain dark charcoal background.",
  office: "An office behind the person, out of focus.",
  outdoor: "Trees and daylight behind the person, out of focus.",
}

export const clothesWords: Readonly<Record<Clothes, string>> = {
  keep: "The clothes stay as the photo shows them.",
  "plain-top": "The person wears a plain top in a muted color.",
  shirt: "The person wears a collared shirt in a muted color.",
  jacket: "The person wears a jacket over a collared shirt in a muted color.",
}

export const glassesWords: Readonly<Record<Glasses, string>> = {
  on: "",
  off: "The person wears no glasses.",
}

export type HeadshotChoices = {
  framing: Framing
  background: Background
  clothes: Clothes
  keepGlasses: Glasses
}

export function promptOf(choices: HeadshotChoices): string {
  return [
    leadWords,
    framingWords[choices.framing],
    backgroundWords[choices.background],
    clothesWords[choices.clothes],
    glassesWords[choices.keepGlasses],
  ]
    .filter((words) => words !== "")
    .join(" ")
}
