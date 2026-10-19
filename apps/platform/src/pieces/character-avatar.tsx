import type { Character } from "@rosesfield/contract"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@rosesfield/ui/components/avatar"
import type { ReactElement } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { t } from "@/copy/t"

export function CharacterAvatar({
  character,
  size = "default",
}: {
  character: Character
  size?: "default" | "small"
}): ReactElement {
  const first = character.references[0] ?? ""
  const source = useAssetSource(first)
  return (
    <Avatar size={size}>
      {source.state === "ready" ? (
        <AvatarImage
          src={source.src}
          alt={t("characters.photo", { name: character.name })}
        />
      ) : null}
      <AvatarFallback>
        {character.name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
