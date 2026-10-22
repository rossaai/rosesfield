import { IconButton } from "@rosesfield/ui/components/button"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { useQuery } from "@tanstack/react-query"
import { AtSignIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { charactersQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"
import { useAssetThumbs, useCharacterThumbs } from "@/pieces/attachment-thumbs"
import { CharacterPicker } from "@/pieces/character-picker"
import { LibraryPicker } from "@/pieces/library-picker"
import type { DraftState } from "@/pieces/use-draft"

type DraftBarProps = {
  state: DraftState
  label: string
  placeholder: string
  submitLabel: string
  onSubmit: () => void
  chips?: ReactNode
  price?: ReactNode
  busy?: boolean
  className?: string
}

export type Mention = {
  isOpen: boolean
  setOpen: (open: boolean) => void
  onValueChange: (value: string) => void
  onPick: (characterId: string) => void
}

export function useMention(state: DraftState): Mention {
  const [isOpen, setOpen] = useState(false)
  const characters = useQuery(charactersQuery)
  const onValueChange = (value: string): void => {
    if (value.endsWith("@") && value.length > state.draft.prompt.length) {
      setOpen(true)
    }
    state.setPrompt(value)
  }
  const onPick = (characterId: string): void => {
    const name = characters.data?.characters.find(
      (one) => one.id === characterId
    )?.name
    const prompt = state.draft.prompt
    if (name !== undefined && prompt.endsWith("@")) {
      state.setPrompt(`${prompt}${name} `)
    }
    state.addCharacter(characterId)
  }
  return { isOpen, setOpen, onValueChange, onPick }
}

function DraftLeading({
  state,
  mention,
  openLibrary,
}: {
  state: DraftState
  mention: Mention
  openLibrary: () => void
}): ReactElement {
  return (
    <>
      <AttachMenu
        form="menu"
        label={t("bar.attach")}
        onUpload={() => void state.upload()}
        onFromLibrary={openLibrary}
      />
      <CharacterPicker
        open={mention.isOpen}
        onOpenChange={mention.setOpen}
        onPick={mention.onPick}
        trigger={
          <IconButton label={t("bar.mention")} size="dense">
            <AtSignIcon aria-hidden="true" />
          </IconButton>
        }
      />
    </>
  )
}

export function DraftBar(props: DraftBarProps): ReactElement {
  const { state } = props
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  const mention = useMention(state)
  const attachments = [
    ...useAssetThumbs(state.draft.assetIds),
    ...useCharacterThumbs(state.draft.characterIds),
  ]
  return (
    <>
      <PromptBar
        value={state.draft.prompt}
        onValueChange={mention.onValueChange}
        onSubmit={props.onSubmit}
        label={props.label}
        placeholder={props.placeholder}
        submitLabel={props.submitLabel}
        removeLabel={t("bar.attachment.remove")}
        attachments={attachments}
        onRemoveAttachment={state.removeAttachment}
        leading={
          <DraftLeading
            state={state}
            mention={mention}
            openLibrary={() => setLibraryOpen(true)}
          />
        }
        chips={props.chips}
        price={props.price}
        busy={props.busy === true || state.isUploading}
        {...(props.className === undefined
          ? {}
          : { className: props.className })}
      />
      <LibraryPicker
        open={isLibraryOpen}
        onOpenChange={setLibraryOpen}
        kind={null}
        max={16}
        title={t("bar.addMenu.fromLibrary")}
        onDone={state.addAssets}
      />
    </>
  )
}
