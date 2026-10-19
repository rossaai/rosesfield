import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Progress } from "@rosesfield/ui/components/progress"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { WorkingPulse } from "@rosesfield/ui/components/working-pulse"
import { motion } from "@rosesfield/ui/motion"
import { useNavigate } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { isWorking } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { wordsForCode } from "@/copy/error-words"
import { formatDuration } from "@/copy/format"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { OutputRow } from "@/pieces/run/output-row"
import { useCancelRun, useRepeatRun } from "@/pieces/run/run-actions"
import { runAspect, waitingAfterMs } from "@/pieces/run/run-facts"
import { useNow } from "@/pieces/use-now"

type RunOutputsProps = {
  run: Run
  list?: readonly string[]
}

function outputKindOf(run: Run): string {
  return findCatalogApp(run.appId)?.output.kind ?? "image"
}

function WorkingTiles({ run }: { run: Run }): ReactElement {
  const kind = outputKindOf(run)
  const aspect = runAspect(run)
  const count = run.count
  if (kind === "audio" || kind === "text") {
    return (
      <div className="flex w-full flex-col gap-s2">
        {Array.from({ length: count }, (_, index) => (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: a working tile's place is its identity
            key={index}
            className={
              kind === "audio"
                ? "h-s12 w-full"
                : "h-tile w-full max-w-prose-max"
            }
          />
        ))}
      </div>
    )
  }
  return (
    <OutputRow aspects={Array.from({ length: count }, () => aspect)}>
      {(index) => (
        <WorkingPulse
          aspect={aspect}
          label={t("run.working", { index: index + 1, count })}
        />
      )}
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

function WorkingRun({ run }: { run: Run }): ReactElement {
  return (
    <div className="flex flex-col gap-s2">
      <WorkingTiles run={run} />
      {run.progress === null ? null : (
        <Progress value={run.progress * 100} aria-label={t("state.working")} />
      )}
      <WaitingLine run={run} />
    </div>
  )
}

function DoneRun({ run, list }: RunOutputsProps): ReactElement {
  const aspect = runAspect(run)
  const kind = outputKindOf(run)
  if (kind === "audio" || kind === "text") {
    return (
      <div className="flex w-full flex-col gap-s2">
        {run.outputs.map((assetId) => (
          <AssetTile
            key={assetId}
            assetId={assetId}
            isDemo={run.origin === "demo"}
          />
        ))}
      </div>
    )
  }
  return (
    <OutputRow aspects={run.outputs.map(() => aspect)}>
      {(index) => {
        const assetId = run.outputs[index]
        return assetId === undefined ? null : (
          <AssetTile
            assetId={assetId}
            aspectHint={aspect}
            isDemo={run.origin === "demo"}
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
  const navigate = useNavigate()
  const app = findCatalogApp(run.appId)
  const words = wordsForCode(run.failure?.code ?? "RUN_FAILED", {
    minutes: Math.round((app?.limits.timeoutSeconds ?? 0) / 60),
    thing: "run",
  })
  const act = (): void => {
    if (words.action?.act === "settings") {
      void navigate({ to: "/settings" })
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

export function RunOutputs({ run, list }: RunOutputsProps): ReactElement {
  switch (run.status) {
    case "queued":
    case "running":
      return <WorkingRun run={run} />
    case "done":
      return <DoneRun run={run} {...(list === undefined ? {} : { list })} />
    case "failed":
      return <FailedRun run={run} />
    case "cancelled":
      return <p className="text-caption text-ink-muted">{t("state.stopped")}</p>
  }
}
