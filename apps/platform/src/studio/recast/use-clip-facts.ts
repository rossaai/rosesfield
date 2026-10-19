import { AspectRatio } from "@rosesfield/kernel"
import { useMediaFacts } from "@/studio/motion/use-media-facts"

export type ClipFacts = {
  assetId: string
  seconds: number
  width: number
  height: number
}

export const shortestClipSeconds = 2
export const longestClipSeconds = 5

export function useClipFacts(assetId: string | null): ClipFacts | null {
  const reading = useMediaFacts(assetId, "video")
  if (assetId === null || reading.state !== "read") {
    return null
  }
  const { seconds, width, height } = reading.facts
  if (seconds === null || width === null || height === null) {
    return null
  }
  return { assetId, seconds, width, height }
}

const clipSecondsTolerance = 0.05

export function isClipInBounds(facts: Pick<ClipFacts, "seconds">): boolean {
  return (
    facts.seconds >= shortestClipSeconds - clipSecondsTolerance &&
    facts.seconds <= longestClipSeconds + clipSecondsTolerance
  )
}

export function nearestRatio(
  facts: Pick<ClipFacts, "width" | "height">,
  options: readonly string[]
): string | null {
  const ratio = facts.width / facts.height
  let best: string | null = null
  let bestGap = Number.POSITIVE_INFINITY
  for (const option of options) {
    if (!AspectRatio.isValid(option)) {
      continue
    }
    const parsed = AspectRatio.parse(option)
    const gap = Math.abs(Math.log(ratio / (parsed.width / parsed.height)))
    if (gap < bestGap) {
      best = option
      bestGap = gap
    }
  }
  return best
}
