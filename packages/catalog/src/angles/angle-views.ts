export const modes = ["set", "single"] as const

export const angleSets = ["turnaround", "quarters", "heights"] as const

export const sides = [
  "front",
  "front-right",
  "right",
  "back-right",
  "back",
  "back-left",
  "left",
  "front-left",
] as const

export const heights = ["low", "eye-level", "elevated", "high"] as const

export const distances = ["close", "medium", "wide"] as const

export type Mode = (typeof modes)[number]
export type AngleSet = (typeof angleSets)[number]
export type Side = (typeof sides)[number]
export type Height = (typeof heights)[number]
export type Distance = (typeof distances)[number]

export type View = { side: Side; height: Height; distance: Distance }

type Pose = { side: Side; height: Height }

export const viewsPerSet = 4

export function viewCountOf(mode: Mode): number {
  return mode === "single" ? 1 : viewsPerSet
}

export const setPoses: Readonly<Record<AngleSet, readonly Pose[]>> = {
  turnaround: [
    { side: "front", height: "eye-level" },
    { side: "right", height: "eye-level" },
    { side: "back", height: "eye-level" },
    { side: "left", height: "eye-level" },
  ],
  quarters: [
    { side: "front-right", height: "eye-level" },
    { side: "back-right", height: "eye-level" },
    { side: "back-left", height: "eye-level" },
    { side: "front-left", height: "eye-level" },
  ],
  heights: [
    { side: "front", height: "low" },
    { side: "front", height: "eye-level" },
    { side: "front", height: "elevated" },
    { side: "front", height: "high" },
  ],
}

function pick<Value extends string>(
  list: readonly Value[],
  value: unknown,
  fallback: Value
): Value {
  return list.find((one) => one === value) ?? fallback
}

export function keyOf(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, next: string) => next.toUpperCase())
}

export function viewsOf(inputs: Readonly<Record<string, unknown>>): View[] {
  const distance = pick(distances, inputs.distance, "medium")
  if (pick(modes, inputs.mode, "set") === "single") {
    return [
      {
        side: pick(sides, inputs.side, "back"),
        height: pick(heights, inputs.height, "eye-level"),
        distance,
      },
    ]
  }
  const angleSet = pick(angleSets, inputs.angleSet, "turnaround")
  return setPoses[angleSet].map((pose) => ({ ...pose, distance }))
}
