import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { MediaBadge } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { RepeatIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { appLine, isAssetInput } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { runLabOf, runModel } from "@/pieces/run/run-facts"
import { inputRowsOf } from "@/pieces/run/run-inputs"
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
import {
  mediaOf,
  type ShowcaseItem,
  showcaseItems,
  showcaseOf,
} from "@/showcase/showcase"

export type StageKind = "bar" | "column"

export type AppSample = VisualEntry

export type HowStep = {
  id: "add" | "choose" | "get"
  title: string
  line: string
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

function PromptMedia({ prompt }: { prompt: string }): ReactElement {
  return (
    <div
      data-slot="how-prompt"
      className="flex size-full items-start p-s5 text-body text-ink-muted"
    >
      <p className="line-clamp-[8] @regular:line-clamp-[12]">{prompt}</p>
    </div>
  )
}

function SettingsMedia({
  app,
  item,
}: {
  app: AppListing
  item: ShowcaseItem
}): ReactElement {
  const model = runModel(item.run, app)
  const lab = runLabOf(item.run)
  const rows = inputRowsOf(app, item.run).filter((row) => {
    const input = app.inputs.find((one) => one.name === row.key)
    return (
      input === undefined ||
      (!isAssetInput(input) && input.type !== "prompt" && input.name !== "model")
    )
  })
  return (
    <div
      data-slot="how-settings"
      className="flex size-full flex-col items-center justify-center gap-s2 p-s5"
    >
      {model === null ? null : (
        <MediaBadge
          ground="plain"
          className="text-ink"
          {...(lab === null ? {} : { mark: <LabMark maker={lab} /> })}
        >
          {model}
        </MediaBadge>
      )}
      <dl className="flex flex-wrap justify-center gap-s1">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center gap-s1 rounded-full bg-canvas px-s2_5 py-s1 text-caption"
          >
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function inputStillOf(item: ShowcaseItem | undefined): string | null {
  return item?.input === undefined ? null : mediaOf(item.input)
}

function addMediaOf(item: ShowcaseItem | undefined): ReactNode {
  if (item === undefined) {
    return null
  }
  const input = inputStillOf(item)
  if (input !== null) {
    return <img src={input} alt="" className="size-full object-cover" />
  }
  const prompt = promptOf(item)
  return prompt === null ? null : <PromptMedia prompt={prompt} />
}

const stepCopy = {
  add: ["app.how.inputs.title", "app.how.inputs.line"],
  choose: ["app.how.model.title", "app.how.model.line"],
  get: ["app.how.result.title", "app.how.result.line"],
} as const

export function stepsOf(
  app: AppListing,
  samples: readonly AppSample[],
  showcase: readonly ShowcaseItem[] = showcaseOf(app.id)
): HowStep[] {
  const item = showcase[0]
  const result =
    (item === undefined
      ? undefined
      : samples.find((sample) => sample.key === `showcase-${item.file}`)) ??
    samples[0]
  const media = {
    add: addMediaOf(item),
    choose: item === undefined ? null : <SettingsMedia app={app} item={item} />,
    get: result === undefined ? null : <ResultMedia sample={result} />,
  }
  const forms = {
    add: inputStillOf(item) === null ? "words" : "picture",
    choose: "words",
    get: "picture",
  } as const
  return (["add", "choose", "get"] as const).map((id) => ({
    id,
    title: t(stepCopy[id][0]),
    line: t(stepCopy[id][1]),
    media: media[id],
    form: forms[id],
    ...(id === "get" && result !== undefined
      ? { action: <RecreateLink app={app} sample={result} /> }
      : {}),
  }))
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
      <div className="flex flex-col gap-s1 @regular:row-start-2">
        <h3 className="font-medium text-body text-ink">{step.title}</h3>
        <p className="text-body text-ink-muted">{step.line}</p>
      </div>
    </li>
  )
}

export function HowItWorks({ app }: { app: AppListing }): ReactElement {
  const published = useQuery(publishedQuery)
  const steps = stepsOf(app, samplesOf(published.data ?? [], app.id))
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
