import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { XIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { characterQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { CharacterAvatar } from "@/pieces/character-avatar"
import { CharacterPicker } from "@/pieces/character-picker"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf } from "@/screens/app/fields/field-props"
import type { StoryboardState } from "@/studio/storyboard/use-storyboard-screen"

const referenceInput = "reference"
const characterInput = "character"

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
    <div className="flex items-center gap-s2 rounded-card bg-(--well) p-s3">
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

function CharacterButton({ state }: { state: StoryboardState }): ReactElement {
  const [isOpen, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const { register } = state
  useEffect(() => {
    register(characterInput)(() => trigger.current?.focus())
  }, [register])
  return (
    <CharacterPicker
      open={isOpen}
      onOpenChange={setOpen}
      onPick={(id) => state.form.setInput(characterInput, [id])}
      trigger={
        <Button ref={trigger} className="self-start">
          {t("field.character.pick")}
        </Button>
      }
    />
  )
}

export function ReferenceWell({
  state,
}: {
  state: StoryboardState
}): ReactElement {
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { register, form } = state
  useEffect(() => {
    register(referenceInput)(() => trigger.current?.focus())
  }, [register])
  const images = listOf(form.values.inputs[referenceInput])
  const [character] = listOf(form.values.inputs[characterInput])
  return (
    <FieldFrame
      caption={tCatalog("storyboard.input.reference.label")}
      isOptional
      note={null}
      problem={undefined}
      message={wellMessage ?? state.messages.get(referenceInput) ?? null}
    >
      {character === undefined ? (
        <div className="flex flex-col gap-s2">
          <DropWell
            kind="image"
            ids={images}
            max={1}
            onChange={(ids) => form.setInput(referenceInput, ids)}
            onMessage={setWellMessage}
            triggerRef={trigger}
            limits={tCatalog("storyboard.input.reference.note")}
          />
          {images.length === 0 ? <CharacterButton state={state} /> : null}
        </div>
      ) : (
        <PickedCharacter
          characterId={character}
          onRemove={() => form.setInput(characterInput, [])}
        />
      )}
    </FieldFrame>
  )
}
