import type { ReactElement } from "react"

export function labInitialOf(maker: string): string {
  const letter = /[\p{L}\p{N}]/u.exec(maker)?.[0]
  return letter === undefined ? "" : letter.toLocaleUpperCase()
}

export function LabMark({ maker }: { maker: string }): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-slot="lab-mark"
      data-maker={maker}
      className="flex size-4 shrink-0 items-center justify-center font-medium text-legal leading-none"
    >
      {labInitialOf(maker)}
    </span>
  )
}
