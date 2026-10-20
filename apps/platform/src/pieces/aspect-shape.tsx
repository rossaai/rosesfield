import { ScanIcon } from "lucide-react"
import type { ReactElement } from "react"

const box = 20
const longest = 14

function sidesOf(ratio: string): { width: number; height: number } | null {
  const [width, height] = ratio.split(":").map(Number)
  if (
    width === undefined ||
    height === undefined ||
    !(width > 0) ||
    !(height > 0)
  ) {
    return null
  }
  const scale = longest / Math.max(width, height)
  return { width: width * scale, height: height * scale }
}

export function AspectShape({ ratio }: { ratio: string }): ReactElement {
  const sides = sidesOf(ratio)
  if (sides === null) {
    return <ScanIcon aria-hidden="true" />
  }
  return (
    <svg
      aria-hidden="true"
      data-ratio={ratio}
      viewBox={`0 0 ${box} ${box}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect
        x={(box - sides.width) / 2}
        y={(box - sides.height) / 2}
        width={sides.width}
        height={sides.height}
        rx={2}
      />
    </svg>
  )
}
