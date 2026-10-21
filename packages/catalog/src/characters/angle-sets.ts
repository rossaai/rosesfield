import {
  type AngleSet,
  angleSets as editAngleSets,
  type Height,
  type Side,
  setPoses,
  viewsPerSet,
} from "#angles/angle-views"

export type View = Side | Height

const namedBy: Readonly<Record<AngleSet, "side" | "height">> = {
  turnaround: "side",
  quarters: "side",
  heights: "height",
}

export const angleSets: readonly AngleSet[] = editAngleSets

export const viewsPerRun = viewsPerSet

export function viewsOf(angleSet: string): readonly View[] {
  const found = angleSets.find((set) => set === angleSet)
  if (found === undefined) {
    return []
  }
  return setPoses[found].map((pose) => pose[namedBy[found]])
}
