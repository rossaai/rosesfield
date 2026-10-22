import type { Run } from "@rosesfield/contract"
import type { ReactElement, ReactNode } from "react"
import { RunChrome } from "@/pieces/run/run-chrome"
import {
  type ChromePlace,
  type RunChromeOf,
  RunOutputs,
} from "@/pieces/run/run-outputs"

type RunCardProps = {
  run: Run
  list?: readonly string[]
  onUseInputs?: (run: Run) => void
  afterRun?: ((run: Run) => ReactNode) | undefined
  children?: (chrome: RunChromeOf) => ReactNode
}

export function RunCard({
  run,
  list,
  onUseInputs,
  afterRun,
  children,
}: RunCardProps): ReactElement {
  const chrome = (place: ChromePlace): ReactNode => (
    <RunChrome
      run={run}
      place={place}
      {...(onUseInputs === undefined ? {} : { onUseInputs })}
    />
  )
  return (
    <article
      data-slot="run-card"
      className="group/reveal flex min-w-0 flex-col gap-s2"
    >
      {children === undefined ? (
        <RunOutputs
          run={run}
          chrome={chrome}
          {...(list === undefined ? {} : { list })}
        />
      ) : (
        children(chrome)
      )}
      {afterRun?.(run)}
    </article>
  )
}

export function RunColumns({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <div
      data-slot="run-columns"
      className="grid grid-cols-1 items-start gap-x-s3 gap-y-s6 @regular:grid-cols-2"
    >
      {children}
    </div>
  )
}
