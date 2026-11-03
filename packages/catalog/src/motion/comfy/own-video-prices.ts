/** A step's price as the price route answers it. */
export type AskedPrice = { credits: number | null; source: string }

/** Where a part of a chain's price comes from: your own measured run, a recorded run of what the step runs, an estimate, or nothing. */
export type PartSource = "yours" | "recorded" | "estimate" | "unknown"

export type PartPrice = { credits: number | null; source: PartSource }

/** The seconds of the clip the recorded prices are for. */
export const recordedSeconds = 4

/** The credits each step of your own video's chain cost on Comfy for a 4-second clip, each the costliest bill measured for what the step runs, rounded up to the cent. The plan and the read hold null, since no run measured them. The edit runs Qwen Image Edit 2511 at 1k on the first frame and one photo, and the draft renders at 480p with no end key on the graph with the temporal pass at 60 fps. */
export const recordedSteps = {
  plan: null,
  read: null,
  edit: 25.16,
  draft: 19.89,
  restore: 10.86,
} as const satisfies Readonly<Record<string, number | null>>

/** The credits of the final, measured for a 4-second clip on the graph with the temporal pass and the end key every final renders with. No such run was made at 480p, so 480p holds no row and takes the route's price. */
export const recordedFinals: Readonly<Record<string, number>> = {
  "720p": 21.49,
  "1080p": 51.66,
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

/** The sum of every part, or null when one part holds no price, so a final is never priced as its restore alone. */
export function everyPartCreditsOf(parts: readonly PartPrice[]): number | null {
  return parts.some((part) => part.credits === null)
    ? null
    : knownCreditsOf(parts)
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
