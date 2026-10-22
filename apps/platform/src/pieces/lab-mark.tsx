import { type ModelFactsFile, modelFactsData } from "@rosesfield/catalog/comfy"
import type { CSSProperties, ReactElement } from "react"

type LabMarkData = ModelFactsFile["marks"][string]

export const weightsMaker = "Hugging Face"

export function labInitialOf(maker: string): string {
  const letter = /[\p{L}\p{N}]/u.exec(maker)?.[0]
  return letter === undefined ? "" : letter.toLocaleUpperCase()
}

export function labMarkOf(maker: string): LabMarkData | null {
  const marks = modelFactsData.marks
  return Object.hasOwn(marks, maker) ? (marks[maker] ?? null) : null
}

export function markColourOf(mark: LabMarkData): string {
  return `var(--if-light, #${mark.hex}) var(--if-dark, #${mark.hexDark})`
}

function groundStyleOf(ground: string): CSSProperties {
  return { backgroundColor: `#${ground}` }
}

function MarkPath({
  mark,
  className,
}: {
  mark: LabMarkData
  className: string
}): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ color: markColourOf(mark) }}
    >
      <path
        d={mark.path}
        {...(mark.fillRule === undefined
          ? {}
          : { fillRule: mark.fillRule, clipRule: mark.fillRule })}
      />
    </svg>
  )
}

export function LabMark({ maker }: { maker: string }): ReactElement {
  const mark = labMarkOf(maker)
  if (mark === null) {
    return (
      <span
        aria-hidden="true"
        data-slot="lab-mark"
        data-maker={maker}
        data-mark="letter"
        className="flex size-4 shrink-0 items-center justify-center font-medium text-legal leading-none"
      >
        {labInitialOf(maker)}
      </span>
    )
  }
  if (mark.ground !== undefined) {
    return (
      <span
        aria-hidden="true"
        data-slot="lab-mark"
        data-maker={maker}
        data-mark={mark.slug}
        data-ground="mark"
        className="flex size-4 shrink-0 items-center justify-center rounded-dense"
        style={groundStyleOf(mark.ground)}
      >
        <MarkPath mark={mark} className="size-2.5" />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      data-slot="lab-mark"
      data-maker={maker}
      data-mark={mark.slug}
      className="flex size-4 shrink-0 items-center justify-center"
    >
      <MarkPath mark={mark} className="size-4" />
    </span>
  )
}
