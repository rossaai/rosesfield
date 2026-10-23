import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { Progress } from "@rosesfield/ui/components/progress"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { WorkingPulse } from "@rosesfield/ui/components/working-pulse"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useQueries } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { assetQuery, isWorking } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { wordsForCode } from "@/copy/error-words"
import { formatDuration } from "@/copy/format"
import { t } from "@/copy/t"
import { AssetTile, aspectStyle } from "@/pieces/asset-tile"
import { OutputRow } from "@/pieces/run/output-row"
import { useCancelRun, useRepeatRun } from "@/pieces/run/run-actions"
import { runAspect, waitingAfterMs } from "@/pieces/run/run-facts"
import { useNow } from "@/pieces/use-now"
import { useShowSettings } from "@/shell/shell-dialogs"

export type ChromePlace = "over" | "under"

export type RunChromeOf = (place: ChromePlace) => ReactNode

type RunOutputsProps = {
  run: Run
  list?: readonly string[]
  chrome?: RunChromeOf | undefined
}

export function RunFrame({
  chrome,
  aspect,
  place = "over",
  children,
}: {
  chrome: RunChromeOf | undefined
  aspect?: MediaAspect | undefined
  place?: ChromePlace
  children: ReactNode
}): ReactNode {
  if (chrome === undefined) {
    return children
  }
  if (place === "under") {
    return (
      <div data-slot="run-frame" className="flex w-full flex-col gap-s1_5">
        {children}
        {chrome("under")}
      </div>
    )
  }
  return (
    <div
      data-slot="run-frame"
      className={cn(
        "relative w-full",
        aspect === undefined
          ? ""
          : "grid place-items-center rounded-cell bg-(--well) p-s4"
      )}
      style={aspectStyle(aspect)}
    >
      {children}
      {chrome("over")}
    </div>
  )
}

const meshAspect: MediaAspect = { width: 1, height: 1 }

function outputKindOf(run: Run): string {
  return findCatalogApp(run.appId)?.output.kind ?? "image"
}

export function outputAspectOf(run: Run): MediaAspect {
  return outputKindOf(run) === "mesh" ? meshAspect : runAspect(run)
}

function LandedTile({
  run,
  assetId,
  aspect,
  list,
  isBare,
}: {
  run: Run
  assetId: string
  aspect?: MediaAspect
  list: readonly string[]
  isBare: boolean
}): ReactElement {
  return (
    <AssetTile
      assetId={assetId}
      isDemo={run.origin === "demo"}
      isBare={isBare}
      list={list}
      className={motion.enter}
      {...(aspect === undefined ? {} : { aspectHint: aspect })}
    />
  )
}

function WorkingTiles({ run, list, chrome }: RunOutputsProps): ReactElement {
  const kind = outputKindOf(run)
  const aspect = outputAspectOf(run)
  const count = run.count
  const shown = list ?? run.outputs
  const isBare = chrome !== undefined
  if (kind === "audio" || kind === "text") {
    return (
      <RunFrame chrome={chrome} place="under">
        <div className="flex w-full flex-col gap-s2">
          {Array.from({ length: count }, (_, index) => {
            const assetId = run.outputs[index]
            return assetId === undefined ? (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: a working tile's place is its identity
                key={index}
                className={
                  kind === "audio"
                    ? "h-s12 w-full"
                    : "h-tile w-full max-w-prose-max"
                }
              />
            ) : (
              <LandedTile
                key={assetId}
                run={run}
                assetId={assetId}
                list={shown}
                isBare={isBare}
              />
            )
          })}
        </div>
      </RunFrame>
    )
  }
  return (
    <OutputRow
      aspects={Array.from({ length: count }, () => aspect)}
      overlay={chrome?.("over")}
    >
      {(index) => {
        const assetId = run.outputs[index]
        return assetId === undefined ? (
          <WorkingPulse
            aspect={aspect}
            label={t("run.working", { index: index + 1, count })}
          />
        ) : (
          <LandedTile
            run={run}
            assetId={assetId}
            aspect={aspect}
            list={shown}
            isBare={isBare}
          />
        )
      }}
    </OutputRow>
  )
}

export function WaitingLine({ run }: { run: Run }): ReactNode {
  const now = useNow(isWorking(run))
  const cancel = useCancelRun()
  const elapsed = now - Date.parse(run.createdAt)
  if (!isWorking(run) || elapsed < waitingAfterMs) {
    return null
  }
  const seconds = Math.floor(elapsed / 1000)
  return (
    <div className="flex flex-wrap items-center gap-s2">
      <p className="text-caption text-ink-muted">
        {run.status === "queued"
          ? t("state.waiting.queued", { duration: formatDuration(seconds) })
          : t("state.waiting.running", { duration: formatDuration(seconds) })}
      </p>
      <Button
        size="small"
        busy={cancel.isPending}
        onClick={() => cancel.mutate(run.id)}
      >
        {t("state.stop")}
      </Button>
    </div>
  )
}

function WorkingRun({ run, list, chrome }: RunOutputsProps): ReactElement {
  return (
    <div className="flex flex-col gap-s2">
      <WorkingTiles
        run={run}
        chrome={chrome}
        {...(list === undefined ? {} : { list })}
      />
      {run.progress === null ? null : (
        <Progress value={run.progress * 100} aria-label={t("state.working")} />
      )}
      <WaitingLine run={run} />
    </div>
  )
}

function useOutputAspects(run: Run): MediaAspect[] {
  const fallback = outputAspectOf(run)
  const assets = useQueries({
    queries: run.outputs.map((assetId) => assetQuery(assetId)),
  })
  return assets.map((one) => {
    const asset = one.data?.asset
    return asset === undefined || asset.width === null || asset.height === null
      ? fallback
      : { width: asset.width, height: asset.height }
  })
}

function DoneRun({ run, list, chrome }: RunOutputsProps): ReactElement {
  const aspect = outputAspectOf(run)
  const aspects = useOutputAspects(run)
  const kind = outputKindOf(run)
  const isBare = chrome !== undefined
  if (kind === "audio" || kind === "text") {
    return (
      <RunFrame chrome={chrome} place="under">
        <div className="flex w-full flex-col gap-s2">
          {run.outputs.map((assetId) => (
            <AssetTile
              key={assetId}
              assetId={assetId}
              isDemo={run.origin === "demo" && !isBare}
            />
          ))}
        </div>
      </RunFrame>
    )
  }
  return (
    <OutputRow aspects={aspects} overlay={chrome?.("over")}>
      {(index) => {
        const assetId = run.outputs[index]
        return assetId === undefined ? null : (
          <AssetTile
            assetId={assetId}
            aspectHint={aspects[index] ?? aspect}
            isDemo={run.origin === "demo"}
            isBare={isBare}
            list={list ?? run.outputs}
            className={motion.enter}
          />
        )
      }}
    </OutputRow>
  )
}

function FailedRun({ run }: { run: Run }): ReactElement {
  const repeat = useRepeatRun()
  const showSettings = useShowSettings()
  const app = findCatalogApp(run.appId)
  const words = wordsForCode(run.failure?.code ?? "RUN_FAILED", {
    minutes: Math.round((app?.limits.timeoutSeconds ?? 0) / 60),
    thing: "run",
  })
  const act = (): void => {
    if (words.action?.act === "settings") {
      showSettings()
    } else {
      repeat.mutate(run.id)
    }
  }
  return (
    <StateView
      kind="failed"
      density="compact"
      title={words.title}
      body={words.body}
      {...(words.action === null
        ? {}
        : {
            actions: (
              <Button busy={repeat.isPending} onClick={act}>
                {words.action.label}
              </Button>
            ),
          })}
    />
  )
}

export function RunOutputs({
  run,
  list,
  chrome,
}: RunOutputsProps): ReactElement {
  const shown = list === undefined ? {} : { list }
  switch (run.status) {
    case "queued":
    case "running":
      return <WorkingRun run={run} chrome={chrome} {...shown} />
    case "done":
      return <DoneRun run={run} chrome={chrome} {...shown} />
    case "failed":
      return (
        <RunFrame chrome={chrome} {...endedFrameOf(run)}>
          <FailedRun run={run} />
        </RunFrame>
      )
    case "cancelled":
      return (
        <RunFrame chrome={chrome} {...endedFrameOf(run)}>
          <p className="text-caption text-ink-muted">{t("state.stopped")}</p>
        </RunFrame>
      )
  }
}

function endedFrameOf(run: Run): {
  aspect?: MediaAspect
  place: ChromePlace
} {
  const kind = outputKindOf(run)
  return kind === "audio" || kind === "text"
    ? { place: "under" }
    : { aspect: outputAspectOf(run), place: "over" }
}
