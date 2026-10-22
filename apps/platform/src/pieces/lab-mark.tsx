import { type ModelFactsFile, modelFactsData } from "@rosesfield/catalog/comfy"
import type { CSSProperties, ReactElement } from "react"

type LabMarkData = ModelFactsFile["marks"][string]

type Scheme = "light" | "dark"

const markGrounds: Readonly<Record<Scheme, string>> = {
  light: "F1F1F1",
  dark: "191919",
}

const leastContrast = 1.5

export function labInitialOf(maker: string): string {
  const letter = /[\p{L}\p{N}]/u.exec(maker)?.[0]
  return letter === undefined ? "" : letter.toLocaleUpperCase()
}

export function labMarkOf(maker: string): LabMarkData | null {
  const marks = modelFactsData.marks
  return Object.hasOwn(marks, maker) ? (marks[maker] ?? null) : null
}

function channelOf(hex: string, at: number): number {
  const value = Number.parseInt(hex.slice(at, at + 2), 16) / 255
  return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminanceOf(hex: string): number {
  return (
    0.2126 * channelOf(hex, 0) +
    0.7152 * channelOf(hex, 2) +
    0.0722 * channelOf(hex, 4)
  )
}

export function contrastOf(first: string, second: string): number {
  const [high, low] = [luminanceOf(first), luminanceOf(second)].sort(
    (a, b) => b - a
  )
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

export function markColourOf(hex: string, scheme: Scheme): string | null {
  return contrastOf(hex, markGrounds[scheme]) >= leastContrast
    ? `#${hex}`
    : null
}

function colourStyleOf(mark: LabMarkData): CSSProperties {
  const light = markColourOf(mark.hex, "light") ?? "currentColor"
  const dark = markColourOf(mark.hex, "dark") ?? "currentColor"
  return { color: `var(--if-light, ${light}) var(--if-dark, ${dark})` }
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
          style={colourStyleOf(mark)}
        >
          <path d={mark.path} />
        </svg>
      )}
    </span>
  )
}
