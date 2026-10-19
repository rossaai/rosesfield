import type { Run } from "@rosesfield/contract"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { Link } from "@tanstack/react-router"
import { CircleAlertIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { isWorking } from "@/api/queries"
import { formatTime, joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { useRunEstimate } from "@/pieces/run/run-estimate"
import { runAppName, runPrice } from "@/pieces/run/run-facts"
import { RunHeadline } from "@/pieces/run/run-headline"
import { RunMenu } from "@/pieces/run/run-menu"

function StateCaption({ run }: { run: Run }): ReactNode {
  if (isWorking(run)) {
    return (
      <span className={cn("text-ink", motion.pulse)}>{t("state.working")}</span>
    )
  }
  if (run.status === "failed") {
    return <span className="text-bug-text">{t("state.failed")}</span>
  }
  if (run.status === "cancelled") {
    return <span>{t("state.stopped")}</span>
  }
  return null
}

function NoOutput({ run }: { run: Run }): ReactElement {
  if (isWorking(run)) {
    return (
      <span
        aria-hidden="true"
        className={cn("size-thumb rounded-cell bg-(--well)", motion.pulse)}
      />
    )
  }
  return (
    <span aria-hidden="true" className="flex size-thumb items-center">
      {run.status === "failed" ? (
        <span className="flex size-icon items-center justify-center rounded-full bg-bug-tint text-bug-text">
          <CircleAlertIcon className="glyph" />
        </span>
      ) : null}
    </span>
  )
}

function Thumbs({ run }: { run: Run }): ReactElement {
  const shown = run.outputs.slice(0, 4)
  return (
    <span className="flex shrink-0 gap-s1">
      {shown.length === 0 ? (
        <NoOutput run={run} />
      ) : (
        shown.map((id, index) => (
          <span
            key={id}
            className={
              index === 0 ? "size-thumb" : "hidden size-thumb @regular:block"
            }
          >
            <AssetTile
              assetId={id}
              shape="square"
              isStatic={true}
              isDemo={false}
            />
          </span>
        ))
      )}
    </span>
  )
}

export function HistoryRowSkeleton(): ReactElement {
  return (
    <li className="flex items-center gap-s3 border-b border-(--line) py-s3">
      <Skeleton className="size-thumb shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-s1">
        <Skeleton className="h-s3 w-tile" />
        <Skeleton className="h-s5 w-1/2" />
        <Skeleton className="h-s3 w-tile" />
      </span>
    </li>
  )
}

export function HistoryRow({ run }: { run: Run }): ReactElement {
  const isDemo = run.origin === "demo"
  const estimate = useRunEstimate(run)
  const price =
    run.status === "done" && !isDemo ? runPrice(run, estimate) : null
  return (
    <li className="flex items-center gap-s3 border-b border-(--line) py-s3">
      <Link
        to="/history/$runId"
        params={{ runId: run.id }}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-s3 rounded-cell",
          motion.tint
        )}
      >
        <Thumbs run={run} />
        <span className="flex min-w-0 flex-1 flex-col gap-s1">
          <span className="truncate text-label text-ink-muted">
            {runAppName(run)}
          </span>
          <span className="truncate text-body">
            <RunHeadline run={run} />
          </span>
          <span className="text-caption text-ink-muted">
            {joinParts([
              isDemo ? t("run.demoCaption") : null,
              formatTime(run.createdAt),
              price,
            ])}
            {run.status === "done" ? null : ", "}
            <StateCaption run={run} />
          </span>
        </span>
      </Link>
      <RunMenu run={run} />
    </li>
  )
}
