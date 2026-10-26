import type {
  ModelFacts,
  ScoreSource,
  TaskScore,
} from "#comfy/model-catalog.contract"

export type FactBadge =
  | { kind: "rank"; rank: number; sources: readonly ScoreSource[] }
  | { kind: "new"; release: string }
  | { kind: "value" }
  | { kind: "open-weights"; href: string }

export const newForDays = 30

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

export function taskScoreOf(
  facts: ModelFacts | undefined,
  task: string | null
): TaskScore | null {
  if (facts === undefined || task === null) {
    return null
  }
  return Object.hasOwn(facts.scores, task) ? (facts.scores[task] ?? null) : null
}

export function factBadgesOf(
  facts: ModelFacts | undefined,
  task: string | null,
  today: string
): FactBadge[] {
  if (facts === undefined) {
    return []
  }
  const badges: FactBadge[] = []
  const score = taskScoreOf(facts, task)
  if (score?.rank !== null && score?.rank !== undefined) {
    badges.push({ kind: "rank", rank: score.rank, sources: score.sources })
  }
  if (facts.release !== null && isNewRelease(facts.release, today)) {
    badges.push({ kind: "new", release: facts.release })
  }
  if (score?.tiers.includes("bestValue") === true) {
    badges.push({ kind: "value" })
  }
  if (facts.weights !== null) {
    badges.push({ kind: "open-weights", href: facts.weights })
  }
  return badges
}
