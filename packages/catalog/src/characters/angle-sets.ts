import {
  type AngleSet,
  type Distance,
  angleSets as editAngleSets,
  type Height,
  type Side,
  setPoses,
  viewsPerSet,
} from "#angles/angle-views"

export type View = Side | Height

type Pose = (typeof setPoses)[AngleSet][number]

const namedBy: Readonly<Record<AngleSet, "side" | "height">> = {
  turnaround: "side",
  quarters: "side",
  heights: "height",
}

export const angleSets: readonly AngleSet[] = editAngleSets

export const viewsPerRun = viewsPerSet

export const viewDistance: Distance = "medium"

export function viewOf(angleSet: AngleSet, pose: Pose): View {
  return pose[namedBy[angleSet]]
}

export function viewsOf(angleSet: string): readonly View[] {
  const found = angleSets.find((set) => set === angleSet)
  if (found === undefined) {
    return []
  }
  return setPoses[found].map((pose) => viewOf(found, pose))
}

export const views: readonly View[] = [
  ...new Set(angleSets.flatMap((set) => viewsOf(set))),
]
