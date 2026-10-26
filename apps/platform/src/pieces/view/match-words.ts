import type { Run } from "@rosesfield/contract"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { runAppName, runHeadline, runModel } from "@/pieces/run/run-facts"

export function holdsEveryWord(
  texts: readonly string[],
  words: string
): boolean {
  const said = texts.join(" ").toLowerCase()
  return words
    .toLowerCase()
    .split(/\s+/)
    .every((word) => said.includes(word))
}

export function runHoldsWords(run: Run, words: string): boolean {
  return holdsEveryWord(
    [
      runHeadline(run),
      runAppName(run),
      runModel(run, findCatalogApp(run.appId)) ?? "",
    ],
    words
  )
}
