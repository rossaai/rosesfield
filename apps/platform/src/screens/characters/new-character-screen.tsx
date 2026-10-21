import { characterPhotoLimit, routes } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Input } from "@rosesfield/ui/components/input"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { type ReactElement, useRef, useState } from "react"
import { callRoute } from "@/api/call-route"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { AppHistoryIcon, AppHistoryLink } from "@/screens/app/app-header"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { noSeeds } from "@/screens/app/use-app-screen"
import { ScreenHeader } from "@/shell/screen-header"
import { ModeView } from "@/studio/characters/screen"

type Mode = "photos" | "traits"

const modes: SegmentedItem<Mode>[] = [
  { value: "photos", label: t("characters.new.mode.photos") },
  { value: "traits", label: t("characters.new.mode.traits") },
]

function useSaveCharacter() {
  const client = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (body: { name: string; references: string[] }) =>
      callRoute(routes.createCharacter, { body: { ...body, notes: "" } }),
    onSuccess: (answer) => {
      void client.invalidateQueries({ queryKey: ["characters"] })
      void navigate({
        to: "/characters/$characterId",
        params: { characterId: answer.character.id },
      })
    },
  })
}

type FormMessage = { field: "name" | "photos"; text: string } | null

function usePhotosForm() {
  const [name, setName] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [message, setMessage] = useState<FormMessage>(null)
  const nameField = useRef<HTMLInputElement>(null)
  const save = useSaveCharacter()
  const submit = (): void => {
    if (name.trim() === "") {
      setMessage({ field: "name", text: t("characters.new.name.required") })
      nameField.current?.focus()
      return
    }
    if (photos.length === 0) {
      setMessage({ field: "photos", text: t("characters.new.photos.required") })
      return
    }
    setMessage(null)
    save.mutate({ name: name.trim(), references: photos })
  }
  return { name, setName, photos, setPhotos, message, nameField, save, submit }
}

function FromPhotos(): ReactElement {
  const { name, setName, photos, setPhotos, message, nameField, save, submit } =
    usePhotosForm()
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  return (
    <div className="flex w-full max-w-field-max flex-col gap-s4">
      <FieldFrame
        caption={t("characters.new.name.label")}
        isOptional={false}
        note={null}
        problem={undefined}
        message={message?.field === "name" ? message.text : null}
      >
        <Input
          ref={nameField}
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
        />
      </FieldFrame>
      <FieldFrame
        caption={t("characters.new.photos.label")}
        isOptional={false}
        note={t("characters.new.photos.note", { max: characterPhotoLimit })}
        problem={undefined}
        message={message?.field === "photos" ? message.text : wellMessage}
      >
        <DropWell
          kind="image"
          ids={photos}
          max={characterPhotoLimit}
          onChange={setPhotos}
          onMessage={setWellMessage}
        />
      </FieldFrame>
      {save.error === null ? null : (
        <p role="alert" className="text-label text-bug-text">
          {wordsForError(save.error, { thing: "character" }).title}
        </p>
      )}
      <Button
        tone="primary"
        className="self-start"
        busy={save.isPending}
        onClick={submit}
      >
        {t("characters.new.save")}
      </Button>
    </div>
  )
}

export function NewCharacterScreen(): ReactElement {
  const search = useSearch({ from: "/_shell/characters/new" })
  const navigate = useNavigate({ from: "/characters/new" })
  const traitsApp = findCatalogApp("characters")
  const mode: Mode =
    traitsApp !== null && search.mode === "traits" ? "traits" : "photos"
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("characters.new.title")}
        {...(mode === "traits" && traitsApp !== null
          ? {
              actions: <AppHistoryLink app={traitsApp} />,
              phoneAction: <AppHistoryIcon app={traitsApp} />,
            }
          : {})}
      />
      {traitsApp === null ? null : (
        <div className="px-s5 pb-s4">
          <SegmentedControl
            items={modes}
            value={mode}
            onValueChange={(next) =>
              void navigate({ search: { mode: next }, replace: true })
            }
            label={t("characters.new.mode.label")}
          />
        </div>
      )}
      {mode === "traits" && traitsApp !== null ? (
        <div className="min-h-0 flex-1">
          <ModeView app={traitsApp} mode="traits" seeds={noSeeds} />
        </div>
      ) : (
        <div className="px-s5 pb-s12">
          <FromPhotos />
        </div>
      )}
    </div>
  )
}
