import type { Asset } from "@rosesfield/contract"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useNavigate } from "@tanstack/react-router"
import { BoxIcon, FileAudioIcon, FileTextIcon } from "lucide-react"
import { type ReactElement, useRef } from "react"
import { joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { assetLabel, assetLength, useAssetName } from "@/pieces/asset-name"
import { useMeshStill, useSeen } from "@/studio/three-d/mesh-still"
import { useViewer } from "@/viewer/viewer-context"

type AssetThumbProps = {
  asset: Asset
  list: readonly string[]
  isDemo: boolean
  isStatic: boolean
}

const meshAppId = "three-d"

const captionClass =
  "max-w-full truncate whitespace-nowrap text-caption text-ink-muted"

function glyphOf(asset: Asset): typeof FileTextIcon {
  if (asset.kind === "mesh") {
    return BoxIcon
  }
  return asset.kind === "audio" ? FileAudioIcon : FileTextIcon
}

function useOpenAsset(
  asset: Asset,
  list: readonly string[]
): (origin: HTMLElement) => void {
  const viewer = useViewer()
  const navigate = useNavigate()
  if (asset.kind !== "mesh") {
    return (origin) => viewer.open(asset.id, origin, list)
  }
  return () =>
    void navigate({
      to: "/apps/$appId",
      params: { appId: meshAppId },
      search: { open: asset.id },
    })
}

export function AssetThumb(props: AssetThumbProps): ReactElement {
  const ref = useRef<HTMLButtonElement>(null)
  const isMesh = props.asset.kind === "mesh"
  const isSeen = useSeen(ref, isMesh)
  const still = useMeshStill(props.asset.id, isMesh && isSeen)
  const open = useOpenAsset(props.asset, props.list)
  const Icon = glyphOf(props.asset)
  const label = useAssetName(props.asset) ?? assetLabel(props.asset)
  const caption = joinParts([
    props.isDemo ? t("run.demoCaption") : null,
    props.isStatic ? null : (assetLength(props.asset) ?? null),
  ])
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-kind={props.asset.kind}
      disabled={props.isStatic}
      onClick={(event) => open(event.currentTarget)}
      className={cn(
        "relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-s1 overflow-hidden rounded-cell bg-(--well) p-s2",
        motion.press
      )}
    >
      {still === null ? null : (
        <img
          src={still}
          alt=""
          aria-hidden="true"
          data-slot="asset-thumb-still"
          className="absolute inset-0 size-full object-contain"
        />
      )}
      <span
        data-slot="asset-thumb-mark"
        className={cn(
          "flex size-icon items-center justify-center rounded-full bg-(--ground) [&_svg]:glyph",
          still === null ? null : "absolute top-s2 left-s2"
        )}
      >
        <Icon aria-hidden="true" />
      </span>
      {caption === "" ? null : (
        <span className={cn(captionClass, still === null ? null : "relative")}>
          {caption}
        </span>
      )}
    </button>
  )
}
