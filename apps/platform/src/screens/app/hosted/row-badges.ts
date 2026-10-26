import {
  type FactBadge,
  factBadgesOf,
  type ModelFacts,
  type ModelTag,
  type ScoreSource,
  weightsHost,
} from "@rosesfield/catalog/comfy"
import type { ModelBadge } from "@rosesfield/ui/components/model-picker"
import { formatDate, formatList } from "@/copy/format"
import { type CopyValues, hasCatalogText, t, tCatalog } from "@/copy/t"
import { labMarkOf, weightsMaker } from "@/pieces/lab-mark"
import { openModels } from "@/screens/welcome/open-weights"

export type CatalogWords = (key: string, values?: CopyValues) => string | null

function catalogWords(key: string, values?: CopyValues): string | null {
  return hasCatalogText(key) ? tCatalog(key, values) : null
}

const repoPattern = /^[\w.-]+\/[\w.-]+$/

export function weightsLinkOf(id: string): string | null {
  const model = openModels.find((one) => one.id === id)
  if (model === undefined) {
    return null
  }
  if (model.link.startsWith(weightsHost)) {
    return model.link
  }
  const repo = model.files.find(
    (file) => repoPattern.test(file) && !file.endsWith(".safetensors")
  )
  return repo === undefined ? null : `${weightsHost}${repo}`
}

export function rankNoteOf(
  sources: readonly ScoreSource[],
  taskBoards: readonly ScoreSource[]
): string | null {
  const named = sources.length > 0 ? sources : taskBoards
  const readOn = named
    .map((one) => one.readOn)
    .sort()
    .at(-1)
  return readOn === undefined
    ? null
    : t("model.picker.rankFrom", {
        boards: formatList(named.map((one) => one.board)),
        date: formatDate(`${readOn}T00:00:00`),
      })
}

function rankBadgeOf(
  rank: number,
  sources: readonly ScoreSource[],
  taskBoards: readonly ScoreSource[]
): ModelBadge {
  const note = rankNoteOf(sources, taskBoards)
  return {
    kind: "rank",
    label: t("model.picker.rank", { rank }),
    ...(note === null ? {} : { note }),
  }
}

function factBadgeOf(
  badge: FactBadge,
  taskBoards: readonly ScoreSource[],
  words: CatalogWords
): ModelBadge[] {
  switch (badge.kind) {
    case "rank":
      return [rankBadgeOf(badge.rank, badge.sources, taskBoards)]
    case "new": {
      const label = words("comfy.badge.new")
      return label === null ? [] : [{ kind: "new", label }]
    }
    case "value":
      return [{ kind: "value", label: t("model.picker.bestValue") }]
    case "open-weights":
      return []
  }
}

function weightsBadgeOf(
  id: string,
  tags: readonly ModelTag[],
  facts: ModelFacts | undefined
): ModelBadge[] {
  if (!tags.some((tag) => tag.kind === "open-weights")) {
    return []
  }
  return [openWeightsBadge(facts?.weights ?? weightsLinkOf(id))]
}

export function openWeightsBadge(href: string | null): ModelBadge {
  const mark = labMarkOf(weightsMaker)
  return {
    kind: "openWeights",
    label: t("model.tag.openWeights"),
    ...(href === null ? {} : { href }),
    ...(mark === null ? {} : { markColour: `#${mark.hex}` }),
  }
}

export type BadgeContext = {
  task: string | null
  today: string
  taskBoards: readonly ScoreSource[]
  words?: CatalogWords
}

export function badgesOf(
  id: string,
  tags: readonly ModelTag[],
  facts: ModelFacts | undefined,
  context: BadgeContext
): ModelBadge[] {
  const words = context.words ?? catalogWords
  return [
    ...factBadgesOf(facts, context.task, context.today).flatMap((badge) =>
      factBadgeOf(badge, context.taskBoards, words)
    ),
    ...weightsBadgeOf(id, tags, facts),
  ]
}
