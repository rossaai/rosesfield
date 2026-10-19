import type { Run } from "@rosesfield/contract"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { characterQuery } from "@/api/queries"
import { useAssetNameOf } from "@/pieces/asset-name"
import { headlineSource } from "@/pieces/run/run-facts"

function Placeholder(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-s5 w-tile rounded-cell bg-(--well) align-middle",
        motion.pulse
      )}
    />
  )
}

function AssetHeadline({ assetId }: { assetId: string }): ReactNode {
  const name = useAssetNameOf(assetId)
  return name === null ? <Placeholder /> : name
}

function CharacterHeadline({
  characterId,
}: {
  characterId: string
}): ReactNode {
  const character = useQuery(characterQuery(characterId))
  return character.data === undefined ? (
    <Placeholder />
  ) : (
    character.data.character.name
  )
}

export function RunHeadline({ run }: { run: Run }): ReactNode {
  const source = headlineSource(run)
  switch (source.kind) {
    case "asset":
      return <AssetHeadline assetId={source.assetId} />
    case "character":
      return <CharacterHeadline characterId={source.characterId} />
    case "text":
      return source.text
  }
}
