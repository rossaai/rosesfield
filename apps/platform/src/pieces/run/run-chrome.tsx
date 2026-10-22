import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { interaction } from "@rosesfield/ui/components/interaction"
import { MediaBadge } from "@rosesfield/ui/components/media-tile"
import { MediaChrome } from "@rosesfield/ui/components/result-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { RepeatIcon } from "lucide-react"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { useRunEstimate } from "@/pieces/run/run-estimate"
import { type RunBadge, runFacts } from "@/pieces/run/run-facts"
import { RunMenu, useRunInputs } from "@/pieces/run/run-menu"
import type { ChromePlace } from "@/pieces/run/run-outputs"

type RunChromeProps = {
  run: Run
  place: ChromePlace
  onUseInputs?: (run: Run) => void
}

function Badge({
  badge,
  ground,
}: {
  badge: RunBadge
  ground: "media" | "plain"
}): ReactElement {
  switch (badge.kind) {
    case "model":
      return (
        <MediaBadge
          ground={ground}
          {...(badge.lab === null
            ? {}
            : { mark: <LabMark maker={badge.lab} /> })}
        >
          {badge.label}
        </MediaBadge>
      )
    case "price":
      return (
        <MediaBadge ground={ground}>
          <span title={badge.label}>
            <CreditPrice amount={badge.amount} />
          </span>
        </MediaBadge>
      )
    default:
      return <MediaBadge ground={ground}>{badge.label}</MediaBadge>
  }
}

function Facts({
  run,
  ground,
}: {
  run: Run
  ground: "media" | "plain"
}): ReactElement {
  const badges = runFacts(run, useRunEstimate(run))
  return (
    <>
      {badges.map((badge) => (
        <Badge key={badge.kind} badge={badge} ground={ground} />
      ))}
    </>
  )
}

function Recreate({
  run,
  onUseInputs,
}: Omit<RunChromeProps, "place">): ReactElement {
  const useInputs = useRunInputs(run, onUseInputs)
  return (
    <Button tone="glass" onClick={useInputs}>
      <RepeatIcon aria-hidden="true" />
      {t("run.useInputs")}
    </Button>
  )
}

export function RunChrome({
  run,
  place,
  onUseInputs,
}: RunChromeProps): ReactElement {
  const shown = onUseInputs === undefined ? {} : { onUseInputs }
  if (place === "under") {
    return (
      <div data-slot="run-chrome" className="flex items-start gap-s2">
        <span
          data-slot="run-facts"
          className={cn("flex min-w-0 flex-1 flex-wrap gap-s1")}
        >
          <Facts run={run} ground="plain" />
        </span>
        <span
          data-slot="run-actions"
          className={cn(
            "flex shrink-0",
            interaction.reveal,
            interaction.revealPointer,
            "[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
          )}
        >
          <RunMenu run={run} form="card" {...shown} />
        </span>
      </div>
    )
  }
  return (
    <MediaChrome
      facts={
        <span data-slot="run-facts" className="contents">
          <Facts run={run} ground="media" />
        </span>
      }
      actions={<RunMenu run={run} form="card" {...shown} />}
      {...(run.status === "done"
        ? { action: <Recreate run={run} {...shown} /> }
        : {})}
    />
  )
}
