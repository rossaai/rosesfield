import type { AppListing } from "@rosesfield/contract"
import { appName } from "@/catalog/app-facts"
import { holdsEveryWord, runHoldsWords } from "@/pieces/view/match-words"
import { tileGap, tileStepOf } from "@/pieces/view/tile-scale"
import type { VisualEntry } from "@/screens/explore/explore-tile"

export type ExploreCells = { card: number; feed: number }

export function exploreCellsOf(
  available: number,
  size: number,
  isRegular: boolean
): ExploreCells {
  const step = tileStepOf(size)
  if (isRegular) {
    return { card: step.width, feed: step.width }
  }
  const room = Math.max(0, available)
  return {
    card: room === 0 ? step.width : Math.min(step.width, room),
    feed: Math.max(
      1,
      Math.floor((room + tileGap) / step.phoneColumns - tileGap)
    ),
  }
}

export function appsHoldingWords(
  apps: readonly AppListing[],
  words: string
): AppListing[] {
  return apps.filter((app) => holdsEveryWord([appName(app)], words))
}

export function entriesHoldingWords(
  entries: readonly VisualEntry[],
  words: string
): VisualEntry[] {
  return words === ""
    ? [...entries]
    : entries.filter((entry) => runHoldsWords(entry.run, words))
}
