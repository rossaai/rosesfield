import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { XIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { characterQuery } from "@/api/queries"
import type { CharacterInput } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { CharacterAvatar } from "@/pieces/character-avatar"
import { CharacterPicker } from "@/pieces/character-picker"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, listOf } from "@/screens/app/fields/field-props"
import {
  inputCaption,
  inputNote,
  isOptionalInput,
} from "@/screens/app/fields/input-copy"

function PickedCharacter({
  characterId,
  onRemove,
}: {
  characterId: string
  onRemove: () => void
}): ReactElement {
  const character = useQuery(characterQuery(characterId))
  if (character.data === undefined) {
    return <Skeleton className="h-icon w-full" />
  }
  return (
    <div className="flex items-center gap-s2">
      <CharacterAvatar character={character.data.character} />
      <span className="min-w-0 flex-1 truncate text-body">
        {character.data.character.name}
      </span>
      <IconButton
        label={t("field.character.remove")}
        size="small"
        tone="quiet"
        onClick={onRemove}
      >
        <XIcon aria-hidden="true" />
      </IconButton>
    </div>
  )
}

export function CharacterField(
  props: InputFieldProps<CharacterInput>
): ReactElement {
  const { input, register } = props
  const ids = listOf(props.value)
  const [isOpen, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    register(() => trigger.current?.focus())
  }, [register])
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={isOptionalInput(input)}
      note={inputNote(props.app, input)}
      problem={props.problem}
    >
      <div className="flex flex-col gap-s2 rounded-card bg-(--well) p-s3">
        {ids.map((id) => (
          <PickedCharacter
            key={id}
            characterId={id}
            onRemove={() => props.onChange(ids.filter((one) => one !== id))}
          />
        ))}
        {ids.length >= input.max ? null : (
          <CharacterPicker
            open={isOpen}
            onOpenChange={setOpen}
            onPick={(id) => props.onChange([...ids, id].slice(-input.max))}
            trigger={
              <Button ref={trigger} className="self-start">
                {t("field.character.pick")}
              </Button>
            }
          />
        )}
      </div>
    </FieldFrame>
  )
}
