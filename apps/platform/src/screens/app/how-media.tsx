import { labOfModel } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import type { ReactElement, ReactNode } from "react"
import { tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { KindFlow, MadeDiscs, TakenDiscs } from "@/pieces/kind-discs"
import { LabMark } from "@/pieces/lab-mark"
import { chosenLabOf, modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { useOpeningModel } from "@/screens/app/hosted/use-hosted-model"
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
      <Tooltip>
        <TooltipTrigger
          render={
            <p
              data-slot="how-prompt-text"
              className="line-clamp-3 cursor-default"
            />
          }
        >
          {prompt}
        </TooltipTrigger>
        <TooltipContent className="max-w-prose-max">{prompt}</TooltipContent>
      </Tooltip>
    </div>
  )
}

function ModelCard({
  model,
  lab,
}: {
  model: string
  lab: string | null
}): ReactElement {
  return (
    <div
      data-slot="how-settings"
      className="flex size-full flex-col justify-center gap-s5 p-s6"
    >
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
          className="min-w-0 text-title text-ink wrap-break-word"
        >
          {model}
        </span>
      </div>
    </div>
  )
}

function listedModelOf(
  app: AppListing
): { name: string; lab: string | null } | null {
  const input = app.inputs.find((one) => one.name === modelInputName)
  const option =
    input?.type === "choice"
      ? input.options.find((one) => one.value === input.default)
      : undefined
  return option === undefined
    ? null
    : {
        name: tCatalog(option.labelKey),
        lab: labOfModel(`graph/${option.value}`) ?? labOfModel(option.value),
      }
}

export function DefaultSettings({ app }: { app: AppListing }): ReactElement {
  const opening = useOpeningModel(app)
  const shown = opening.isTaskApp
    ? opening.model === null
      ? null
      : { name: modelNameOf(opening.model), lab: chosenLabOf(opening.model) }
    : listedModelOf(app)
  return shown === null ? (
    <div
      data-slot="how-settings"
      className="flex size-full items-center justify-center gap-s2 text-ink-muted"
    >
      <KindFlow app={app} />
    </div>
  ) : (
    <ModelCard model={shown.name} lab={shown.lab} />
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
