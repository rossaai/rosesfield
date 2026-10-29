/** A step's price as the price route answers it. */
export type AskedPrice = { credits: number | null; source: string }

/** Where a part of a chain's price comes from: your own measured run, a run measured on a 4-second clip, an estimate, or nothing. */
export type PartSource = "yours" | "recorded" | "estimate" | "unknown"

export type PartPrice = { credits: number | null; source: PartSource }

/** The seconds of the clip the recorded runs were measured on. */
export const recordedSeconds = 4

/** The credits each step of your own video's chain cost on one run measured on Comfy Cloud for a 4-second clip. The plan and the read hold null, since no run measured them. */
export const recordedSteps = {
  plan: null,
  read: null,
  edit: 12.35,
  draft: 3.36,
  restore: 10.86,
} as const satisfies Readonly<Record<string, number | null>>

/** The credits of the final on the guided render, measured for a 4-second clip at each resolution. */
export const recordedFinals: Readonly<Record<string, number>> = {
  "480p": 3.36,
  "720p": 6.76,
  "1080p": 16.79,
}

/** The recorded credits of the lead and the draft, in the order the lead prices them. */
export const recordedDraftParts: readonly (number | null)[] = [
  recordedSteps.plan,
  recordedSteps.read,
  recordedSteps.edit,
  recordedSteps.draft,
]

/** One part's price: your own measured run first, then the recorded run, then an estimate. */
export function partPriceOf(
  asked: AskedPrice,
  recorded: number | null
): PartPrice {
  if (asked.credits !== null && asked.source === "measured") {
    return { credits: asked.credits, source: "yours" }
  }
  if (recorded !== null) {
    return { credits: recorded, source: "recorded" }
  }
  return asked.credits === null
    ? { credits: null, source: "unknown" }
    : { credits: asked.credits, source: "estimate" }
}

/** The price of the restore and the final at a resolution, the number the yes to a final shows. */
export function finalPartsOf(
  restore: AskedPrice,
  final: AskedPrice,
  resolution: string
): PartPrice[] {
  return [
    partPriceOf(restore, recordedSteps.restore),
    partPriceOf(final, recordedFinals[resolution] ?? null),
  ]
}

/** The sum of the parts that hold a price, or null when none does. */
export function knownCreditsOf(parts: readonly PartPrice[]): number | null {
  const known = parts.flatMap((part) =>
    part.credits === null ? [] : [part.credits]
  )
  return known.length === 0
    ? null
    : known.reduce((sum, credits) => sum + credits, 0)
}
