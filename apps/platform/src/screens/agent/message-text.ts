import { t } from "@/copy/t"
import type { Draft } from "@/router-context"

export type SplitMessage = {
  prompt: string
  assetIds: string[]
  characterIds: string[]
}

const idsMark = "{ids}"

function prefixOf(text: string): string {
  return text.slice(0, text.indexOf(idsMark))
}

function attachedLines(): { assets: string; characters: string } {
  return {
    assets: prefixOf(t("agent.attached.assets", { ids: idsMark })),
    characters: prefixOf(t("agent.attached.characters", { ids: idsMark })),
  }
}

export function messageText(draft: Draft): string {
  const lines = [draft.prompt.trim()]
  if (draft.assetIds.length > 0) {
    lines.push(t("agent.attached.assets", { ids: draft.assetIds.join(", ") }))
  }
  if (draft.characterIds.length > 0) {
    lines.push(
      t("agent.attached.characters", { ids: draft.characterIds.join(", ") })
    )
  }
  return lines.filter((line) => line !== "").join("\n\n")
}

function idsAfter(line: string, prefix: string): string[] | null {
  if (prefix === "" || !line.startsWith(prefix)) {
    return null
  }
  return line
    .slice(prefix.length)
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "")
}

export function splitMessage(text: string): SplitMessage {
  const marks = attachedLines()
  const kept: string[] = []
  const assetIds: string[] = []
  const characterIds: string[] = []
  for (const line of text.split("\n")) {
    const assets = idsAfter(line, marks.assets)
    const characters = idsAfter(line, marks.characters)
    if (assets !== null) {
      assetIds.push(...assets)
    } else if (characters !== null) {
      characterIds.push(...characters)
    } else {
      kept.push(line)
    }
  }
  return { prompt: kept.join("\n").trim(), assetIds, characterIds }
}
