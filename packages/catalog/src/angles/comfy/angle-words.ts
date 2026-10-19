import type { Distance, Height, Side } from "#angles/angle-views"

export const loraTrigger = "<sks>"

export const loraSideWords: Readonly<Record<Side, string>> = {
  front: "front view",
  "front-right": "front-right quarter view",
  right: "right side view",
  "back-right": "back-right quarter view",
  back: "back view",
  "back-left": "back-left quarter view",
  left: "left side view",
  "front-left": "front-left quarter view",
}

export const loraHeightWords: Readonly<Record<Height, string>> = {
  low: "low-angle shot",
  "eye-level": "eye-level shot",
  elevated: "elevated shot",
  high: "high-angle shot",
}

export const loraDistanceWords: Readonly<Record<Distance, string>> = {
  close: "close-up",
  medium: "medium shot",
  wide: "wide shot",
}

export function loraPromptOf(view: {
  side: Side
  height: Height
  distance: Distance
}): string {
  return [
    loraTrigger,
    loraSideWords[view.side],
    loraHeightWords[view.height],
    loraDistanceWords[view.distance],
  ].join(" ")
}
