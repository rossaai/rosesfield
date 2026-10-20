import type { Asset } from "@rosesfield/contract"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { FileAudioIcon, FileTextIcon } from "lucide-react"
import type { ReactElement } from "react"
import { joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { assetLabel, assetLength, useAssetName } from "@/pieces/asset-name"
import { useViewer } from "@/viewer/viewer-context"

type AssetThumbProps = {
  asset: Asset
  list: readonly string[]
  isDemo: boolean
  isStatic: boolean
}

const captionClass =
  "max-w-full truncate whitespace-nowrap text-caption text-ink-muted"

export function AssetThumb(props: AssetThumbProps): ReactElement {
  const viewer = useViewer()
  const Icon = props.asset.kind === "audio" ? FileAudioIcon : FileTextIcon
  const label = useAssetName(props.asset) ?? assetLabel(props.asset)
  const caption = joinParts([
    props.isDemo ? t("run.demoCaption") : null,
    props.isStatic ? null : (assetLength(props.asset) ?? null),
  ])
  return (
    <button
      type="button"
      aria-label={label}
      disabled={props.isStatic}
      onClick={(event) =>
        viewer.open(props.asset.id, event.currentTarget, props.list)
      }
      className={cn(
        "relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-s1 rounded-cell bg-(--well) p-s2",
        interaction.light
      )}
    >
      <span className="flex size-icon items-center justify-center rounded-full bg-(--ground) [&_svg]:glyph">
        <Icon aria-hidden="true" />
      </span>
      {caption === "" ? null : <span className={captionClass}>{caption}</span>}
    </button>
  )
}
