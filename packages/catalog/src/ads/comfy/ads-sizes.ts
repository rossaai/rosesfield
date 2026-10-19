import type { WorkflowValueBinding } from "#workflow-binding"

export type ImageSize = {
  width: number
  height: number
}

export const adsRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const

export const adsSizes: Readonly<Record<(typeof adsRatios)[number], ImageSize>> =
  {
    "1:1": { width: 1024, height: 1024 },
    "4:3": { width: 1152, height: 864 },
    "3:4": { width: 864, height: 1152 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
  }

type Side = "width" | "height"

function sideMap(side: Side): Record<string, number> {
  return Object.fromEntries(
    Object.entries(adsSizes).map(([ratio, size]) => [ratio, size[side]])
  )
}

export function sizeBindings(
  width: string,
  height: string
): WorkflowValueBinding[] {
  return [
    { from: "aspectRatio", map: sideMap("width"), to: width },
    { from: "aspectRatio", map: sideMap("height"), to: height },
  ]
}
