export const effectValues = [
  "confetti-burst",
  "day-to-night",
  "frost-over",
  "ink-bloom",
  "living-photo",
  "overgrown",
  "rain",
  "weightless",
] as const

export type EffectValue = (typeof effectValues)[number]

export const reserveEffectValues = ["light-sweep"] as const

export type ReserveEffectValue = (typeof reserveEffectValues)[number]

export const defaultEffect: EffectValue = "confetti-burst"

export const openingRule =
  "For the first second the video matches the photo exactly."

export const closingRule =
  "The camera stays fixed. The subject keeps the same shape, face and clothes as in the photo."

export const effectPrompts: Readonly<Record<EffectValue, string>> = {
  "confetti-burst":
    "Two bursts of paper confetti in red, yellow, blue and white shoot up from below the frame and spread wide. The pieces hang in the air for a moment, then fall slowly past the subject in a soft shower, turning as they drop.",
  "day-to-night":
    "In fast time lapse, daylight fades to deep blue dusk and then to night. Lamps and windows switch on one by one with a warm glow, the sky darkens and a few stars appear.",
  "frost-over":
    "Pale frost grows inward from the edges of the frame and spreads over every surface in fine ice crystals. Thin snow starts to fall, the colours cool to blue and white, and the subject's breath shows as a small cloud of vapour.",
  "ink-bloom":
    "Black ink drops in from one corner and blooms outward like ink in water. As it spreads, every surface turns into a flat brush drawing in black and grey on cream paper, with soft ink edges.",
  "living-photo":
    "Only one small part of the scene moves, in a slow and even loop: hair or fabric in a light breeze, leaves on a branch, steam from a cup or ripples on water. Everything else in the frame stays perfectly still.",
  overgrown:
    "In fast time lapse, green vines, moss and wildflowers grow over the ground, the walls and every object in the scene. Leaves unfold, buds swell, and flowers open in white, yellow and pink. The plants grow around the subject and leave its face clear.",
  rain: "Rain starts to fall over the whole scene. Drops streak down past the subject, the ground turns dark and wet, puddles spread, and small splashes jump where the drops land. Every surface starts to shine with reflections.",
  weightless:
    "Gravity fades. Hair, loose clothing, leaves and small objects in the scene lift and drift upward in slow motion, turning gently as they rise. Dust and loose paper float up past the subject.",
}

export const reservePrompts: Readonly<Record<ReserveEffectValue, string>> = {
  "light-sweep":
    "A band of warm low sunlight sweeps slowly from left to right across the scene. Long soft shadows slide along the ground, dust glows in the beam, and one soft lens flare crosses the frame.",
}

export function effectKeyOf(value: EffectValue): string {
  return value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}
