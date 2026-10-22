import type { Run } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { joinParts } from "@/copy/format"
import { useRunEstimate } from "@/pieces/run/run-estimate"
import { runFacts } from "@/pieces/run/run-facts"
import { RunHeadline } from "@/pieces/run/run-headline"
import { RunMenu } from "@/pieces/run/run-menu"

type RunLineProps = {
  run: Run
  onUseInputs?: (run: Run) => void
}

export function RunLine({ run, onUseInputs }: RunLineProps): ReactElement {
  const caption = joinParts(runFacts(run, useRunEstimate(run)))
  return (
    <div className="flex min-w-0 items-start gap-s2">
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-body">
          <RunHeadline run={run} />
        </p>
        {caption === "" ? null : (
          <p className="text-caption text-ink-muted">{caption}</p>
        )}
      </div>
      <RunMenu
        run={run}
        {...(onUseInputs === undefined ? {} : { onUseInputs })}
      />
    </div>
  )
}
