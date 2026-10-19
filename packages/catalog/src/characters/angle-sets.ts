export const angleSetViews = {
  turnaround: ["front", "right", "back", "left"],
  quarters: ["front-right", "back-right", "back-left", "front-left"],
  heights: ["low", "eye-level", "elevated", "high"],
} as const

export type AngleSet = keyof typeof angleSetViews

export type View = (typeof angleSetViews)[AngleSet][number]

export const angleSets: readonly AngleSet[] = [
  "turnaround",
  "quarters",
  "heights",
]

export const viewsPerRun = 4

export function viewsOf(angleSet: string): readonly View[] {
  const found = angleSets.find((set) => set === angleSet)
  return found === undefined ? [] : angleSetViews[found]
}
