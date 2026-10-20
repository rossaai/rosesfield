import { GenerateButton } from "@rosesfield/ui/components/generate-button"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import {
  isModelNoticeCode,
  ModelNotice,
} from "@/screens/app/hosted/model-notice"
import type { StartRun } from "@/screens/app/use-start-run"

type GenerateFootProps = {
  start: StartRun
  leading?: ReactNode
  className?: string
}

export type SubmitPrice = {
  submitValue?: string
  submitName?: string
}

export function submitPriceOf(start: StartRun): SubmitPrice {
  const value = start.priceValue ?? null
  const name = start.priceName ?? null
  return {
    ...(value === null ? {} : { submitValue: value }),
    ...(name === null ? {} : { submitName: name }),
  }
}

export function StartProblem({ start }: { start: StartRun }): ReactNode {
  if (start.error === null) {
    return null
  }
  if (isModelNoticeCode(start.error)) {
    return <ModelNotice error={start.error} />
  }
  const words = wordsForError(start.error, { thing: "app" })
  return (
    <p role="alert" className="text-label text-bug-text">
      {words.title}. {words.body}
    </p>
  )
}

export function GenerateFoot({
  start,
  leading,
  className,
}: GenerateFootProps): ReactElement {
  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      {leading}
      <GenerateButton
        form="bar"
        label={t("run.generate")}
        price={start.priceValue ?? undefined}
        busy={start.isPending}
        onClick={start.generate}
        aria-label={start.priceName ?? undefined}
        className="min-w-0 flex-1"
      />
    </div>
  )
}
