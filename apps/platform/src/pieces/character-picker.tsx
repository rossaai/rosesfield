import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { AtSignIcon, PlusIcon } from "lucide-react"
import type { ReactElement } from "react"
import { charactersQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { CharacterAvatar } from "@/pieces/character-avatar"
import { PopoverOrSheet } from "@/pieces/responsive-layer"

type CharacterPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement
  onPick: (characterId: string) => void
}

function CharacterRows({
  onPick,
}: {
  onPick: (characterId: string) => void
}): ReactElement {
  const characters = useQuery(charactersQuery)
  if (characters.data === undefined) {
    return <Skeleton className="h-button w-full" />
  }
  const list = characters.data.characters
  return (
    <div className="flex flex-col gap-s1">
      {list.length === 0 ? (
        <p className="px-s2 text-body text-ink-muted">
          {t("field.character.none")}
        </p>
      ) : null}
      {list.map((character) => (
        <Button
          key={character.id}
          tone="quiet"
          className="max-w-none justify-start px-s2"
          onClick={() => onPick(character.id)}
        >
          <CharacterAvatar character={character} size="small" />
          {character.name}
        </Button>
      ))}
      <Button
        tone="quiet"
        className="max-w-none justify-start px-s2"
        render={<Link to="/characters/new" />}
        nativeButton={false}
      >
        <PlusIcon aria-hidden="true" />
        {t("field.character.add")}
      </Button>
    </div>
  )
}

export function CharacterPicker(props: CharacterPickerProps): ReactElement {
  return (
    <PopoverOrSheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t("field.character.pick")}
      trigger={props.trigger}
    >
      <CharacterRows
        onPick={(characterId) => {
          props.onPick(characterId)
          props.onOpenChange(false)
        }}
      />
    </PopoverOrSheet>
  )
}

export function MentionPicker(
  props: Omit<CharacterPickerProps, "trigger">
): ReactElement {
  return (
    <CharacterPicker
      {...props}
      trigger={
        <IconButton label={t("bar.mention")} size="dense">
          <AtSignIcon aria-hidden="true" />
        </IconButton>
      }
    />
  )
}
