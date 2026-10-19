import { Slider } from "@rosesfield/ui/components/slider"
import { prefersReducedMotion } from "@rosesfield/ui/motion"
import { type ReactElement, useState } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { joinParts } from "@/copy/format"
import { t } from "@/copy/t"

type CompareDividerProps = {
  inputId: string
  outputId: string
  kind: "image" | "video"
  isDemo: boolean
}

const pillClass =
  "material absolute top-s2 max-w-[calc(50%-2*var(--spacing-s2))] truncate whitespace-nowrap rounded-full px-s2 py-hairline text-caption text-ink"

function Layer({
  assetId,
  label,
  kind,
  clip,
}: {
  assetId: string
  label: string
  kind: "image" | "video"
  clip: string | undefined
}): ReactElement | null {
  const source = useAssetSource(assetId)
  if (source.state !== "ready") {
    return null
  }
  const className = "absolute inset-0 size-full object-contain"
  const style = clip === undefined ? undefined : { clipPath: clip }
  return kind === "video" ? (
    <video
      src={source.src}
      aria-label={label}
      muted
      loop
      playsInline
      autoPlay={!prefersReducedMotion()}
      className={className}
      style={style}
    />
  ) : (
    <img src={source.src} alt={label} className={className} style={style} />
  )
}

export function CompareDivider(props: CompareDividerProps): ReactElement {
  const [split, setSplit] = useState(50)
  const yours = t("viewer.compare.yours")
  const output = joinParts([
    t("viewer.compare.output"),
    props.isDemo ? t("run.demoCaption") : null,
  ])
  return (
    <div
      data-slot="compare-divider"
      className="relative size-full overflow-hidden bg-(--well)"
    >
      <Layer
        assetId={props.outputId}
        label={output}
        kind={props.kind}
        clip={undefined}
      />
      <Layer
        assetId={props.inputId}
        label={yours}
        kind={props.kind}
        clip={`inset(0 ${100 - split}% 0 0)`}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-px bg-ink"
        style={{ left: `${split}%` }}
      />
      <span className={`${pillClass} left-s2`}>{yours}</span>
      <span className={`${pillClass} right-s2`}>{output}</span>
      <div className="material absolute inset-x-s4 bottom-s2 rounded-full px-s3 py-s1">
        <Slider
          className="max-w-none"
          value={split}
          min={0}
          max={100}
          aria-label={t("viewer.compare.divider")}
          onValueChange={(value) =>
            setSplit(typeof value === "number" ? value : (value[0] ?? 50))
          }
        />
      </div>
    </div>
  )
}
