export const lightValues = ["left", "right", "top", "bottom"] as const

export const toneValues = ["auto", "warm", "cool"] as const

const keepShape =
  "Keep the shape, the outline, the pose and every detail of the subject."

function lightFrom(side: string, opposite: string): string {
  return ` with one light from the ${side} of the picture. The ${side} side of the subject is bright and the ${opposite} side is in shadow. ${keepShape}`
}

export const lightPhrases: Readonly<
  Record<(typeof lightValues)[number], string>
> = {
  left: lightFrom("left", "right"),
  right: lightFrom("right", "left"),
  top: lightFrom("top", "bottom"),
  bottom: lightFrom("bottom", "top"),
}

export const tonePhrases: Readonly<
  Record<(typeof toneValues)[number], string>
> = {
  auto: " Keep the colors of the subject.",
  warm: " The light is warm and orange, like a low evening sun.",
  cool: " The light is cool and blue, like daylight under a clear sky.",
}
