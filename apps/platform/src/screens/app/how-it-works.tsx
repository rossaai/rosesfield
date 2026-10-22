import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { type StepCard, StepCards } from "@rosesfield/ui/components/canvas"
import { HeroFan } from "@rosesfield/ui/components/hero"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { RepeatIcon } from "lucide-react"
import type { ReactElement } from "react"
import { settingsQuery } from "@/api/queries"
import { appLine, appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { taskAppOf } from "@/screens/app/hosted/task-app"
import {
  sharedEntries,
  showcaseEntries,
} from "@/screens/explore/explore-entries"
import { visualEntries } from "@/screens/explore/explore-rows"
import {
  recreateTargetOf,
  type VisualEntry,
} from "@/screens/explore/explore-tile"
import { publishedQuery, type SharedOutput } from "@/screens/explore/share-api"
import { type ShowcaseItem, showcaseItems } from "@/showcase/showcase"

export type StageKind = "bar" | "column"

export type AppSample = VisualEntry

const fanSize = 4

export function samplesOf(
  shares: readonly SharedOutput[],
  appId: string,
  showcase: readonly ShowcaseItem[] = showcaseItems
): AppSample[] {
  return visualEntries([
    ...showcaseEntries(showcase),
    ...sharedEntries(shares),
  ]).filter((entry) => entry.run.appId === appId)
}

function srcOf(sample: AppSample): string | null {
  return sample.source.kind === "own" ? null : sample.source.src
}

function SampleMedia({
  sample,
  isPlaying,
}: {
  sample: AppSample
  isPlaying: boolean
}): ReactElement | null {
  const src = srcOf(sample)
  if (src === null) {
    return null
  }
  if (sample.kind === "image") {
    return <img src={src} alt="" />
  }
  return (
    <video
      src={src}
      muted
      loop
      playsInline
      autoPlay={isPlaying}
      preload="metadata"
    />
  )
}

function RecreateLink({
  app,
  sample,
}: {
  app: AppListing
  sample: AppSample
}): ReactElement {
  const target = recreateTargetOf(sample)
  return (
    <Button
      tone="glass"
      size="recreate"
      nativeButton={false}
      render={
        "draft" in target ? (
          <Link
            to="/apps/$appId"
            params={{ appId: app.id }}
            state={{ draft: target.draft }}
          />
        ) : (
          <Link
            to="/apps/$appId"
            params={{ appId: app.id }}
            search={target.search}
          />
        )
      }
    >
      <RepeatIcon aria-hidden="true" />
      {t("run.useInputs")}
    </Button>
  )
}

const stepCopy = [
  ["inputs", "app.how.inputs.title", "app.how.inputs.line"],
  ["model", "app.how.model.title", "app.how.model.line"],
  ["result", "app.how.result.title", "app.how.result.line"],
] as const

export function stepsOf(
  app: AppListing,
  samples: readonly AppSample[]
): StepCard[] {
  const shown = stepCopy.slice(Math.max(0, stepCopy.length - samples.length))
  return shown.map(([id, title, line], index) => {
    const sample = samples[index]
    const isPlaying = id !== "inputs"
    return {
      id,
      title: t(title),
      line: t(line),
      media:
        sample === undefined ? null : (
          <SampleMedia key={sample.key} sample={sample} isPlaying={isPlaying} />
        ),
      ...(sample === undefined || !isPlaying
        ? {}
        : { action: <RecreateLink app={app} sample={sample} /> }),
    }
  })
}

function useModelName(app: AppListing): string {
  const taskApp = taskAppOf(app.id)
  const settings = useQuery(settingsQuery)
  const catalog = useQuery({
    ...modelCatalogQuery(app.id, settings.data?.engine.key ?? "unknown"),
    enabled: taskApp !== null,
  })
  const id = catalog.data?.defaultModel ?? taskApp?.defaultModel ?? null
  const model = catalog.data?.models.find((one) => one.id === id)
  return model === undefined ? appName(app) : modelNameOf(model)
}

function PromptFan({
  app,
  samples,
}: {
  app: AppListing
  samples: readonly AppSample[]
}): ReactElement {
  const model = useModelName(app)
  const pictures = samples
    .filter((sample) => sample.kind === "image")
    .flatMap((sample) => {
      const src = srcOf(sample)
      return src === null ? [] : [{ id: sample.key, src }]
    })
    .slice(0, fanSize)
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-6">
      <HeroFan
        pictures={pictures}
        headline={t("app.fan.headline")}
        model={model}
        line={appLine(app)}
      />
    </div>
  )
}

export function HowItWorks({
  app,
  kind,
}: {
  app: AppListing
  kind: StageKind
}): ReactElement {
  const published = useQuery(publishedQuery)
  const samples = samplesOf(published.data ?? [], app.id)
  if (kind === "bar") {
    return <PromptFan app={app} samples={samples} />
  }
  return (
    <StepCards
      title={appName(app)}
      line={appLine(app)}
      steps={stepsOf(app, samples)}
    />
  )
}
