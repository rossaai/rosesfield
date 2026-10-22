import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { cn } from "@rosesfield/ui/lib/cn"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { RepeatIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { appLine, promptInputOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import {
  AssetMedia,
  DefaultSettings,
  DiscMedia,
  FileMedia,
  PromptMedia,
  RunSettings,
} from "@/screens/app/how-media"
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
import { useRecentRuns } from "@/shell/use-working-runs"
import {
  type ShowcaseItem,
  showcaseItems,
  showcaseOf,
} from "@/showcase/showcase"
import { inputAssetIdsOf } from "@/viewer/result-panel"

export type StageKind = "bar" | "column"

export type AppSample = VisualEntry

export type HowStep = {
  id: "add" | "choose" | "get"
  title: string
  media: ReactNode
  form: "picture" | "words"
  action?: ReactNode
}

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

function ResultMedia({ sample }: { sample: AppSample }): ReactNode {
  const src = srcOf(sample)
  if (src === null) {
    return null
  }
  if (sample.kind === "image") {
    return <img src={src} alt="" className="size-full object-cover" />
  }
  return (
    <video
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      className="size-full object-cover"
    />
  )
}

function OwnRecreate({
  app,
  run,
}: {
  app: AppListing
  run: Run
}): ReactElement {
  return (
    <Button
      tone="glass"
      size="small"
      nativeButton={false}
      render={
        <Link
          to="/apps/$appId"
          params={{ appId: app.id }}
          search={{ from: run.id }}
        />
      }
    >
      <RepeatIcon aria-hidden="true" />
      {t("run.useInputs")}
    </Button>
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
      size="small"
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

function promptOf(item: ShowcaseItem): string | null {
  return item.prompt === null || item.prompt === "" ? null : item.prompt
}

function inputFileOf(item: ShowcaseItem): string | null {
  return item.input ?? item.from ?? null
}

function promptOfRun(app: AppListing, run: Run): string | null {
  const input = promptInputOf(app)
  const value = input === null ? undefined : run.inputs[input.name]
  return typeof value === "string" && value !== "" ? value : null
}

const stepTitles = {
  add: "app.how.inputs.title",
  choose: "app.how.model.title",
  get: "app.how.result.title",
} as const

type StepMedia = {
  media: Record<HowStep["id"], ReactNode>
  forms: Record<HowStep["id"], HowStep["form"]>
  action: ReactNode | null
}

function showcaseMedia(
  app: AppListing,
  item: ShowcaseItem,
  result: AppSample | undefined
): StepMedia {
  const file = inputFileOf(item)
  const prompt = promptOf(item)
  return {
    media: {
      add:
        file !== null ? (
          <FileMedia file={file} />
        ) : prompt === null ? (
          <DiscMedia app={app} side="taken" />
        ) : (
          <PromptMedia prompt={prompt} />
        ),
      choose: <RunSettings app={app} run={item.run} />,
      get:
        result === undefined ? (
          <DiscMedia app={app} side="made" />
        ) : (
          <ResultMedia sample={result} />
        ),
    },
    forms: {
      add: file === null ? "words" : "picture",
      choose: "words",
      get: "picture",
    },
    action:
      result === undefined ? null : <RecreateLink app={app} sample={result} />,
  }
}

function ownMedia(app: AppListing, run: Run): StepMedia {
  const [input] = inputAssetIdsOf(run)
  const [output] = run.outputs
  const prompt = promptOfRun(app, run)
  return {
    media: {
      add:
        input !== undefined ? (
          <AssetMedia assetId={input} />
        ) : prompt === null ? (
          <DiscMedia app={app} side="taken" />
        ) : (
          <PromptMedia prompt={prompt} />
        ),
      choose: <RunSettings app={app} run={run} />,
      get:
        output === undefined ? (
          <DiscMedia app={app} side="made" />
        ) : (
          <AssetMedia assetId={output} />
        ),
    },
    forms: {
      add: input === undefined ? "words" : "picture",
      choose: "words",
      get: "picture",
    },
    action: <OwnRecreate app={app} run={run} />,
  }
}

function plainMedia(app: AppListing): StepMedia {
  return {
    media: {
      add: <DiscMedia app={app} side="taken" />,
      choose: <DefaultSettings app={app} />,
      get: <DiscMedia app={app} side="made" />,
    },
    forms: { add: "words", choose: "words", get: "words" },
    action: null,
  }
}

export function stepsOf(
  app: AppListing,
  samples: readonly AppSample[],
  showcase: readonly ShowcaseItem[] = showcaseOf(app.id),
  own: Run | null = null
): HowStep[] {
  const item = showcase[0]
  const result =
    (item === undefined
      ? undefined
      : samples.find((sample) => sample.key === `showcase-${item.file}`)) ??
    samples[0]
  const shown =
    item !== undefined
      ? showcaseMedia(app, item, result)
      : own !== null
        ? ownMedia(app, own)
        : plainMedia(app)
  return (["add", "choose", "get"] as const).map((id) => ({
    id,
    title: t(stepTitles[id]),
    media: shown.media[id],
    form: shown.forms[id],
    ...(id === "get" && shown.action !== null ? { action: shown.action } : {}),
  }))
}

export function ownExampleOf(
  app: AppListing,
  runs: readonly Run[]
): Run | null {
  return (
    runs.find(
      (one) =>
        one.appId === app.id &&
        one.status === "done" &&
        one.origin === "live" &&
        one.outputs.length > 0
    ) ?? null
  )
}

function StepCard({ step }: { step: HowStep }): ReactElement {
  const hasMedia = step.media !== null
  return (
    <li
      data-slot="how-step"
      data-step={step.id}
      className="flex min-w-0 flex-col gap-s3 @regular:row-span-2 @regular:grid @regular:grid-rows-subgrid"
    >
      {hasMedia ? (
        <div
          data-slot="how-step-media"
          data-form={step.form}
          className={cn(
            "relative w-full overflow-hidden rounded-card bg-(--well)",
            step.form === "picture"
              ? "aspect-4/5"
              : "min-h-[calc(4*var(--spacing-s12))] @regular:aspect-4/5"
          )}
        >
          {step.media}
          {step.action === undefined ? null : (
            <span className="absolute end-s3 bottom-s3 flex" data-density="row">
              {step.action}
            </span>
          )}
        </div>
      ) : null}
      <h3 className="font-medium text-body text-ink @regular:row-start-2">
        {step.title}
      </h3>
    </li>
  )
}

export function HowItWorks({ app }: { app: AppListing }): ReactElement {
  const published = useQuery(publishedQuery)
  const runs = useRecentRuns()
  const steps = stepsOf(
    app,
    samplesOf(published.data ?? [], app.id),
    showcaseOf(app.id),
    ownExampleOf(app, runs)
  )
  return (
    <div
      data-slot="how-it-works"
      className="flex min-h-full items-center justify-center py-s8 @regular:px-s8"
    >
      <div className="flex w-full max-w-(--spacing-feed-window) flex-col gap-s8">
        <h2 className="text-display text-ink">{appLine(app)}</h2>
        <ol
          className={cn(
            "grid grid-cols-1 gap-s8 @regular:grid-cols-3 @regular:gap-x-s12 @regular:gap-y-s3"
          )}
        >
          {steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </ol>
      </div>
    </div>
  )
}
