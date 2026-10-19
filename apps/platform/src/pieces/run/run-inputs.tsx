import type { AppListing, InputDefinition, Run } from "@rosesfield/contract"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { characterQuery } from "@/api/queries"
import { isAssetInput } from "@/catalog/app-facts"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { idsOf, inputValueText, isEmptyValue } from "@/pieces/run/run-facts"

type InputRow = { key: string; label: string; value: ReactNode }

export type RunValues = Pick<Run, "inputs" | "seed" | "count" | "aspectRatio">

function CharacterName({ characterId }: { characterId: string }): ReactElement {
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

function outputRows(app: AppListing, run: RunValues): InputRow[] {
  const output = app.output
  const rows: InputRow[] = []
  if (
    (output.kind === "image" || output.kind === "video") &&
    output.aspectRatios.options.length > 1 &&
    run.aspectRatio !== null
  ) {
    rows.push({
      key: "aspectRatio",
      label: t("field.aspect.label"),
      value: run.aspectRatio,
    })
  }
  if (output.count.max > 1) {
    rows.push({
      key: "count",
      label: t("field.count.label"),
      value: formatNumber(run.count),
    })
  }
  return rows
}

export function inputRowsOf(app: AppListing, run: RunValues): InputRow[] {
  const inputs = shownInputsOf(app, run).map((input) => ({
    key: input.name,
    label: tCatalog(input.labelKey),
    value: (
      <InputValue app={app} input={input} value={runValueOf(input, run)} />
    ),
  }))
  return [...inputs, ...outputRows(app, run)]
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
