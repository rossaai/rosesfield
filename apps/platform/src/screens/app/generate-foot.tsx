import { Button } from "@rosesfield/ui/components/button"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import type { StartRun } from "@/screens/app/use-start-run"

type GenerateFootProps = {
  start: StartRun
  leading?: ReactNode
  className?: string
}

export function StartProblem({ start }: { start: StartRun }): ReactNode {
  if (start.error === null) {
    return null
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
    <div className={cn("flex flex-col gap-s2", className)}>
      <StartProblem start={start} />
      <div className="flex items-center gap-s3">
        {leading}
        <p className="min-w-0 flex-1 truncate text-caption text-ink-muted">
          {start.price}
        </p>
        <Button tone="primary" busy={start.isPending} onClick={start.generate}>
          {t("run.generate")}
        </Button>
      </div>
    </div>
  )
}
