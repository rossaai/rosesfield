import { labOfModel } from "@rosesfield/catalog/comfy"
import type { Run } from "@rosesfield/contract"
import { interaction } from "@rosesfield/ui/components/interaction"
import { SkeletonRow } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { Link } from "@tanstack/react-router"
import { CircleAlertIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { isWorking } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { formatTime } from "@/copy/format"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { LabMark } from "@/pieces/lab-mark"
import { runAppName, runHeadline } from "@/pieces/run/run-facts"
import { RunMenu } from "@/pieces/run/run-menu"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { appIcon } from "@/shell/nav-rows"

export const rowThumb = "size-thumb"

export const listRowClass =
  "group/reveal relative flex min-w-0 items-center gap-s3 py-s3"

export function runLabOf(run: Run): string | null {
  const chosen = run.inputs.model
  if (typeof chosen !== "string" || chosen === "") {
    return null
  }
  return labOfModel(chosen) ?? labOfModel(`graph/${chosen}`)
}

export function RowLead({ run }: { run: Run }): ReactElement {
  const lab = runLabOf(run)
  if (lab !== null) {
    return <LabMark maker={lab} />
  }
  const app = findCatalogApp(run.appId)
  return (
    <span
      aria-hidden="true"
      data-slot="row-glyph"
      className="flex size-4 shrink-0 items-center justify-center text-ink-muted [&_svg]:size-4"
    >
      {app === null ? null : appIcon(app)}
    </span>
  )
}

export function RowWords({
  name,
  line,
  time,
}: {
  name: string
  line: ReactNode
  time: string
}): ReactElement {
  return (
    <>
      <span
        data-slot="row-name"
        className="max-w-[40%] shrink-0 truncate font-medium text-body text-ink"
      >
        {name}
      </span>
      <span
        data-slot="row-line"
        className="min-w-0 max-w-prose flex-1 truncate text-body text-ink-muted"
      >
        {line}
      </span>
      <span
        data-slot="row-time"
        className="ms-auto shrink-0 text-body text-ink-muted tabular-nums"
      >
        {time}
      </span>
    </>
  )
}

function StateWords({ run }: { run: Run }): ReactNode {
  if (isWorking(run)) {
    return (
      <span className={cn("text-ink", motion.pulse)}>{t("state.working")}</span>
    )
  }
  if (run.status === "failed") {
    return <span className="text-bug-text">{t("state.failed")}</span>
  }
  if (run.status === "cancelled") {
    return t("state.stopped")
  }
  return lineOf(run)
}

export function lineOf(run: Run): string {
  const headline = runHeadline(run)
  return headline === runAppName(run) ? "" : headline
}

function Thumb({ run }: { run: Run }): ReactElement {
  const [first] = run.outputs
  if (first !== undefined) {
    return (
      <span data-slot="history-thumb" className={cn("shrink-0", rowThumb)}>
        <AssetTile
          assetId={first}
          shape="square"
          isStatic={true}
          isDemo={false}
        />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      data-slot="history-thumb"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-cell bg-(--well)",
        rowThumb,
        isWorking(run) ? motion.pulse : ""
      )}
    >
      {run.status === "failed" ? (
        <CircleAlertIcon className="glyph text-bug-text" />
      ) : null}
    </span>
  )
}

export function HistoryRowSkeleton(): ReactElement {
  return (
    <li data-slot="history-row-skeleton">
      <SkeletonRow />
    </li>
  )
}

export function RowOptions({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const isRegular = useIsRegularWindow()
  return (
    <span
      data-slot="row-options"
      data-density="composer"
      className={cn(
        "flex shrink-0",
        isRegular ? cn(interaction.reveal, interaction.revealPointer) : ""
      )}
    >
      {children}
    </span>
  )
}

export function HistoryRow({ run }: { run: Run }): ReactElement {
  return (
    <li data-slot="history-row" className={listRowClass}>
      <Link
        to="/history/$runId"
        params={{ runId: run.id }}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-s3 rounded-cell",
          interaction.ring
        )}
      >
        <Thumb run={run} />
        <RowLead run={run} />
        <RowWords
          name={runAppName(run)}
          line={<StateWords run={run} />}
          time={formatTime(run.createdAt)}
        />
      </Link>
      <RowOptions>
        <RunMenu run={run} />
      </RowOptions>
    </li>
  )
}
