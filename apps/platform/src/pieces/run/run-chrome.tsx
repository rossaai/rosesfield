import type { Run } from "@rosesfield/contract"
import { interaction } from "@rosesfield/ui/components/interaction"
import { MediaBadge } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"
import { useRunEstimate } from "@/pieces/run/run-estimate"
import { runFacts } from "@/pieces/run/run-facts"
import { RunHeadline } from "@/pieces/run/run-headline"
import { RunMenu } from "@/pieces/run/run-menu"
import type { ChromePlace } from "@/pieces/run/run-outputs"

type RunChromeProps = {
  run: Run
  place: ChromePlace
  onUseInputs?: (run: Run) => void
}

const touchShown =
  "[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"

function Facts({
  run,
  place,
  className,
}: {
  run: Run
  place: ChromePlace
  className: string
}): ReactElement {
  const facts = runFacts(run, useRunEstimate(run))
  return (
    <span
      data-slot="run-facts"
      className={cn("flex flex-wrap gap-s1", interaction.reveal, className)}
    >
      {facts.map((fact) => (
        <MediaBadge key={fact} ground={place === "over" ? "media" : "plain"}>
          {fact}
        </MediaBadge>
      ))}
    </span>
  )
}

function Actions({
  run,
  onUseInputs,
  className,
}: Omit<RunChromeProps, "place"> & { className: string }): ReactElement {
  return (
    <span
      data-slot="run-actions"
      className={cn(
        "flex",
        interaction.reveal,
        interaction.revealPointer,
        touchShown,
        className
      )}
    >
      <RunMenu
        run={run}
        form="card"
        {...(onUseInputs === undefined ? {} : { onUseInputs })}
      />
    </span>
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
        <Facts run={run} place="under" className="min-w-0 flex-1" />
        <Actions run={run} {...shown} className="shrink-0" />
      </div>
    )
  }
  return (
    <>
      <Facts
        run={run}
        place="over"
        className="pointer-events-none absolute top-s2 left-s2 z-20 max-w-[calc(100%-var(--spacing)*13)]"
      />
      <Actions run={run} {...shown} className="absolute top-s2 right-s2 z-20" />
      <p
        data-slot="run-prompt"
        className={cn(
          "material pointer-events-none absolute inset-x-s2 bottom-s2 z-20 line-clamp-2 rounded-cell px-s2 py-s1 text-caption text-ink",
          interaction.reveal
        )}
      >
        <RunHeadline run={run} />
      </p>
    </>
  )
}
