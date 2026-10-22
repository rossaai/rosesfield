import { labOfModel } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition, Run } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import type { ReactElement, ReactNode } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { KindFlow, MadeDiscs, TakenDiscs } from "@/pieces/kind-discs"
import { LabMark } from "@/pieces/lab-mark"
import { runLabOf, runModel } from "@/pieces/run/run-facts"
import { inputRowsOf } from "@/pieces/run/run-inputs"
import { mediaOf } from "@/showcase/showcase"

const cardFrame: MediaAspect = { width: 4, height: 5 }

const modelInputName = "model"

export function FileMedia({ file }: { file: string }): ReactElement | null {
  const src = mediaOf(file)
  if (src === null) {
    return null
  }
  return file.endsWith(".mp4") ? (
    <video
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      className="size-full object-cover"
    />
  ) : (
    <img src={src} alt="" className="size-full object-cover" />
  )
}

export function AssetMedia({ assetId }: { assetId: string }): ReactElement {
  return (
    <AssetTile
      assetId={assetId}
      shape="frame"
      aspectHint={cardFrame}
      isStatic={true}
      isBare={true}
      className="size-full rounded-none"
    />
  )
}

export function PromptMedia({ prompt }: { prompt: string }): ReactElement {
  return (
    <div
      data-slot="how-prompt"
      className="flex size-full items-start p-s5 text-body text-ink-muted"
    >
      <p className="line-clamp-[8] @regular:line-clamp-[12]">{prompt}</p>
    </div>
  )
}

type SettingRow = { key: string; label: string; value: ReactNode }

function ModelCard({
  model,
  lab,
  rows,
}: {
  model: string | null
  lab: string | null
  rows: readonly SettingRow[]
}): ReactElement {
  return (
    <div
      data-slot="how-settings"
      className="flex size-full flex-col justify-center gap-s5 p-s6"
    >
      {model === null ? null : (
        <div className="flex min-w-0 items-center gap-s3">
          {lab === null ? null : (
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-card bg-(--ground)"
            >
              <span className="flex scale-150">
                <LabMark maker={lab} />
              </span>
            </span>
          )}
          <span
            data-slot="how-model"
            className="min-w-0 text-title text-ink [overflow-wrap:anywhere]"
          >
            {model}
          </span>
        </div>
      )}
      {rows.length === 0 ? null : (
        <dl className="flex flex-col">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-baseline justify-between gap-s3 border-(--line) border-t py-s2 text-body"
            >
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className="min-w-0 truncate text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function isSettingInput(input: InputDefinition | undefined): boolean {
  return (
    input === undefined ||
    (!isAssetInput(input) &&
      input.type !== "prompt" &&
      input.name !== modelInputName)
  )
}

export function RunSettings({
  app,
  run,
}: {
  app: AppListing
  run: Run
}): ReactElement {
  const rows = inputRowsOf(app, run).filter((row) =>
    isSettingInput(app.inputs.find((one) => one.name === row.key))
  )
  return (
    <ModelCard
      model={runModel(run, app)}
      lab={runLabOf(run)}
      rows={rows.map((row) => ({
        key: row.key,
        label: row.label,
        value: row.value,
      }))}
    />
  )
}

export function DefaultSettings({ app }: { app: AppListing }): ReactElement {
  const input = app.inputs.find((one) => one.name === modelInputName)
  const option =
    input?.type === "choice"
      ? input.options.find((one) => one.value === input.default)
      : undefined
  return option === undefined ? (
    <div
      data-slot="how-settings"
      className="flex size-full items-center justify-center gap-s2 text-ink-muted"
    >
      <KindFlow app={app} />
    </div>
  ) : (
    <ModelCard
      model={tCatalog(option.labelKey)}
      lab={labOfModel(`graph/${option.value}`) ?? labOfModel(option.value)}
      rows={[]}
    />
  )
}

export function DiscMedia({
  app,
  side,
}: {
  app: AppListing
  side: "taken" | "made"
}): ReactNode {
  return (
    <div
      data-slot="how-discs"
      className="flex size-full items-center justify-center text-ink-muted"
    >
      {side === "taken" ? <TakenDiscs app={app} /> : <MadeDiscs app={app} />}
    </div>
  )
}
