import type { BoardRank, ModelFacts } from "#comfy/model-catalog.contract"

export type FactBadge =
  | { kind: "new"; release: string }
  | { kind: "top"; rank: BoardRank }
  | { kind: "premium"; rank: BoardRank }
  | { kind: "open-weights"; href: string }

export const newForDays = 30

export const topPositions = 5

const dayMs = 86_400_000

function daysBetween(from: string, to: string): number | null {
  const start = Date.parse(from)
  const end = Date.parse(to)
  return Number.isNaN(start) || Number.isNaN(end)
    ? null
    : Math.floor((end - start) / dayMs)
}

export function isNewRelease(release: string, today: string): boolean {
  const days = daysBetween(release, today)
  return days !== null && days >= 0 && days < newForDays
}

export function isTopRank(rank: BoardRank): boolean {
  return rank.position <= topPositions
}

export function isTopHalf(rank: BoardRank): boolean {
  return rank.position <= rank.size / 2
}

export function factBadgesOf(
  facts: ModelFacts | undefined,
  today: string
): FactBadge[] {
  if (facts === undefined) {
    return []
  }
  const badges: FactBadge[] = []
  const { release, rank, priceThird, weights } = facts
  if (release !== null && isNewRelease(release, today)) {
    badges.push({ kind: "new", release })
  }
  if (rank !== null && isTopRank(rank)) {
    badges.push({ kind: "top", rank })
  }
  if (rank !== null && priceThird === 3 && isTopHalf(rank)) {
    badges.push({ kind: "premium", rank })
  }
  if (weights !== null) {
    badges.push({ kind: "open-weights", href: weights })
  }
  return badges
}
