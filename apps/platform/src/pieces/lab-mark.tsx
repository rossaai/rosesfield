import { type ModelFactsFile, modelFactsData } from "@rosesfield/catalog/comfy"
import type { CSSProperties, ReactElement } from "react"

type LabMarkData = ModelFactsFile["marks"][string]

type LetterGround = ModelFactsFile["marksMissing"][string]

const defaultViewBox = "0 0 24 24"

export const weightsMaker = "Hugging Face"

export function labInitialOf(maker: string): string {
  const letter = /[\p{L}\p{N}]/u.exec(maker)?.[0]
  return letter === undefined ? "" : letter.toLocaleUpperCase()
}

export function labMarkOf(maker: string): LabMarkData | null {
  const marks = modelFactsData.marks
  return Object.hasOwn(marks, maker) ? (marks[maker] ?? null) : null
}

export function letterGroundOf(maker: string): LetterGround | null {
  const missing = modelFactsData.marksMissing
  return Object.hasOwn(missing, maker) ? (missing[maker] ?? null) : null
}

export function markColourOf(mark: { hex: string; hexDark: string }): string {
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
      viewBox={mark.viewBox ?? defaultViewBox}
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
      {mark.accent === undefined ? null : (
        <path
          data-slot="lab-mark-accent"
          d={mark.accent.path}
          style={{ color: markColourOf(mark.accent) }}
        />
      )}
    </svg>
  )
}

export function LabMark({ maker }: { maker: string }): ReactElement {
  const mark = labMarkOf(maker)
  if (mark === null) {
    const letter = letterGroundOf(maker)
    return (
      <span
        aria-hidden="true"
        data-slot="lab-mark"
        data-maker={maker}
        data-mark="letter"
        {...(letter === null ? {} : { "data-ground": "mark" })}
        className="flex size-4 shrink-0 items-center justify-center rounded-dense font-medium text-legal leading-none"
        {...(letter === null
          ? {}
          : {
              style: {
                backgroundColor: `#${letter.ground}`,
                color: `#${letter.ink}`,
              },
            })}
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
