import { type ModelFactsFile, modelFactsData } from "@rosesfield/catalog/comfy"
import type { ReactElement } from "react"

type LabMarkData = ModelFactsFile["marks"][string]

export function labInitialOf(maker: string): string {
  const letter = /[\p{L}\p{N}]/u.exec(maker)?.[0]
  return letter === undefined ? "" : letter.toLocaleUpperCase()
}

export function labMarkOf(maker: string): LabMarkData | null {
  const marks = modelFactsData.marks
  return Object.hasOwn(marks, maker) ? (marks[maker] ?? null) : null
}

export function LabMark({ maker }: { maker: string }): ReactElement {
  const mark = labMarkOf(maker)
  return (
    <span
      aria-hidden="true"
      data-slot="lab-mark"
      data-maker={maker}
      data-mark={mark === null ? "letter" : mark.slug}
      className="flex size-4 shrink-0 items-center justify-center font-medium text-legal leading-none"
    >
      {mark === null ? (
        labInitialOf(maker)
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4"
        >
          <path d={mark.path} />
        </svg>
      )}
    </span>
  )
}
