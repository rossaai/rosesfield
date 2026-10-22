import type { AppListing, InputDefinition, Run } from "@rosesfield/contract"
import { Badge } from "@rosesfield/ui/components/badge"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { CoinsIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { characterQuery } from "@/api/queries"
import { isAssetInput } from "@/catalog/app-facts"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { idsOf, inputValueText, isEmptyValue } from "@/pieces/run/run-facts"

type InputRow = { key: string; label: string; value: ReactNode }

export type RunValues = Pick<Run, "inputs" | "seed" | "count" | "aspectRatio">

export function CharacterName({
  characterId,
}: {
  characterId: string
}): ReactElement {
  const character = useQuery(characterQuery(characterId))
  if (character.data === undefined) {
    return <Skeleton className="h-s5 w-tile" />
  }
  return <span>{character.data.character.name}</span>
}

function InputValue({
  app,
  input,
  value,
}: {
  app: AppListing
  input: InputDefinition
  value: unknown
}): ReactNode {
  if (isAssetInput(input)) {
    return (
      <span className="flex flex-wrap gap-s2">
        {idsOf(value).map((assetId) => (
          <span key={assetId} className="size-thumb">
            <AssetTile assetId={assetId} shape="square" />
          </span>
        ))}
      </span>
    )
  }
  if (input.type === "character") {
    return idsOf(value).map((id) => <CharacterName key={id} characterId={id} />)
  }
  return (
    <span className="whitespace-pre-wrap">
      {inputValueText(app, input, value)}
    </span>
  )
}

function runValueOf(input: InputDefinition, run: RunValues): unknown {
  return input.type === "seed" ? run.seed : run.inputs[input.name]
}

function isShown(app: AppListing, input: InputDefinition, value: unknown) {
  if (isEmptyValue(value)) {
    return false
  }
  return (
    isAssetInput(input) ||
    input.type === "character" ||
    inputValueText(app, input, value) !== null
  )
}

export function shownInputsOf(
  app: AppListing,
  run: RunValues
): InputDefinition[] {
  return app.inputs.filter((input) =>
    isShown(app, input, runValueOf(input, run))
  )
}

function outputRows(
  app: AppListing,
  run: RunValues,
  shown: readonly InputDefinition[]
): InputRow[] {
  const output = app.output
  const rows: InputRow[] = []
  if (
    (output.kind === "image" || output.kind === "video") &&
    output.aspectRatios.options.length > 1 &&
    run.aspectRatio !== null
  ) {
    rows.push({
      key: "output.aspectRatio",
      label: t("field.aspect.label"),
      value: run.aspectRatio,
    })
  }
  if (
    output.count.max > 1 &&
    run.count > 1 &&
    !shown.some((input) => input.name === "count")
  ) {
    rows.push({
      key: "output.count",
      label: t("field.count.label"),
      value: formatNumber(run.count),
    })
  }
  return rows
}

export function inputRowsOf(app: AppListing, run: RunValues): InputRow[] {
  const shown = shownInputsOf(app, run)
  const inputs = shown.map((input) => ({
    key: input.name,
    label: tCatalog(input.labelKey),
    value: (
      <InputValue app={app} input={input} value={runValueOf(input, run)} />
    ),
  }))
  return [...inputs, ...outputRows(app, run, shown)]
}

export function RunInputs({
  app,
  run,
}: {
  app: AppListing | null
  run: RunValues
}): ReactElement {
  const rows = app === null ? [] : inputRowsOf(app, run)
  return (
    <dl className="flex flex-col gap-s3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-s1">
          <dt className="text-label text-ink-muted">{row.label}</dt>
          <dd className="text-body">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export type RunFact = { key: string; text: string }

export type RunFacts = {
  prompts: RunFact[]
  assetIds: string[]
  characterIds: string[]
  badges: RunFact[]
}

function badgeTextOf(
  app: AppListing,
  input: InputDefinition,
  value: unknown
): string | null {
  const text = inputValueText(app, input, value)
  if (text === null) {
    return null
  }
  return input.type === "number" || input.type === "seed"
    ? t("run.field", { caption: tCatalog(input.labelKey), value: text })
    : text
}

export function runFactsOf(app: AppListing, run: RunValues): RunFacts {
  const facts: RunFacts = {
    prompts: [],
    assetIds: [],
    characterIds: [],
    badges: [],
  }
  const shown = shownInputsOf(app, run)
  for (const input of shown) {
    const value = runValueOf(input, run)
    if (isAssetInput(input)) {
      facts.assetIds.push(...idsOf(value))
    } else if (input.type === "character") {
      facts.characterIds.push(...idsOf(value))
    } else if (input.type === "prompt") {
      facts.prompts.push({ key: input.name, text: String(value).trim() })
    } else {
      const text = badgeTextOf(app, input, value)
      if (text !== null) {
        facts.badges.push({ key: input.name, text })
      }
    }
  }
  for (const row of outputRows(app, run, shown)) {
    facts.badges.push({
      key: row.key,
      text:
        row.key === "output.count"
          ? t("run.field", { caption: row.label, value: String(row.value) })
          : String(row.value),
    })
  }
  return facts
}

export type FactsPrice = { amount: string; label: string }

export function RunFactsView({
  facts,
  price = null,
}: {
  facts: RunFacts
  price?: FactsPrice | null
}): ReactElement {
  const hasPrice = price !== null
  return (
    <div data-slot="run-facts-view" className="flex flex-col gap-s3">
      {facts.prompts.map((prompt) => (
        <p key={prompt.key} className="whitespace-pre-wrap text-body">
          {prompt.text}
        </p>
      ))}
      {facts.assetIds.length === 0 ? null : (
        <span className="flex flex-wrap gap-s2">
          {facts.assetIds.map((assetId) => (
            <span key={assetId} className="size-thumb">
              <AssetTile assetId={assetId} shape="square" />
            </span>
          ))}
        </span>
      )}
      {facts.characterIds.length === 0 ? null : (
        <span className="flex flex-wrap gap-s2 text-body">
          {facts.characterIds.map((id) => (
            <CharacterName key={id} characterId={id} />
          ))}
        </span>
      )}
      {facts.badges.length === 0 && !hasPrice ? null : (
        <span data-slot="run-fact-badges" className="flex flex-wrap gap-s1">
          {facts.badges.map((badge) => (
            <Badge key={badge.key} className="ms-0">
              {badge.text}
            </Badge>
          ))}
          {price === null ? null : (
            <span
              data-slot="run-fact-price"
              title={price.label}
              className="contents"
            >
              <Badge mark={<CoinsIcon aria-hidden="true" />} className="ms-0">
                {price.amount}
              </Badge>
            </span>
          )}
        </span>
      )}
    </div>
  )
}
