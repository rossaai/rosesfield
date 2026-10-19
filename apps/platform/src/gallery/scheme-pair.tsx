import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"
import { type GalleryKey, t } from "@/gallery/copy.en"

type Scheme = "light" | "dark"

const schemes: ReadonlyArray<{ scheme: Scheme; label: GalleryKey }> = [
  { scheme: "light", label: "gallery.scheme.light" },
  { scheme: "dark", label: "gallery.scheme.dark" },
]

type SchemePairProps = {
  children: () => ReactNode
  width?: "pair" | "full"
  className?: string
}

export function SchemePair({
  children,
  width = "pair",
  className,
}: SchemePairProps): ReactElement {
  return (
    <div
      className={cn(
        "grid gap-s4",
        width === "pair" ? "@regular:grid-cols-2" : ""
      )}
    >
      {schemes.map(({ scheme, label }) => (
        <div
          key={scheme}
          data-theme={scheme}
          className="@container flex min-w-0 flex-col gap-s3 rounded-card bg-canvas p-s6 text-ink"
        >
          <p className="text-caption text-ink-muted">{t(label)}</p>
          <div className={cn("flex min-w-0 flex-col gap-s4", className)}>
            {children()}
          </div>
        </div>
      ))}
    </div>
  )
}

export type { Scheme }
export { schemes }
