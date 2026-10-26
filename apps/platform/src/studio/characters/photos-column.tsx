import { characterPhotoLimit, routes } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Input } from "@rosesfield/ui/components/input"
import { InputPanel } from "@rosesfield/ui/components/input-panel"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useRef, useState } from "react"
import { callRoute } from "@/api/call-route"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"

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

type PhotosForm = ReturnType<typeof usePhotosForm>

function PhotosFields({ form }: { form: PhotosForm }): ReactElement {
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { message } = form
  return (
    <>
      <FieldFrame
        caption={t("characters.new.name.label")}
        isOptional={false}
        note={null}
        problem={undefined}
        message={message?.field === "name" ? message.text : null}
      >
        <Input
          ref={form.nameField}
          value={form.name}
          maxLength={80}
          onChange={(event) => form.setName(event.target.value)}
        />
      </FieldFrame>
      <FieldFrame
        caption={t("characters.new.photos.label")}
        isOptional={false}
        note={null}
        problem={undefined}
        message={message?.field === "photos" ? message.text : wellMessage}
      >
        <DropWell
          kind="image"
          ids={form.photos}
          max={characterPhotoLimit}
          onChange={form.setPhotos}
          onMessage={setWellMessage}
          limits={t("characters.new.photos.note", { max: characterPhotoLimit })}
        />
      </FieldFrame>
      {form.save.error === null ? null : (
        <p role="alert" className="text-label text-bug-text">
          {wordsForError(form.save.error, { thing: "character" }).title}
        </p>
      )}
    </>
  )
}

export function PhotosColumn({
  label,
  tabs,
}: {
  label: string
  tabs?: ReactNode
}): ReactElement {
  const form = usePhotosForm()
  return (
    <div
      data-slot="column-row"
      className="flex h-full min-h-0 flex-1 gap-2 px-4 pt-2 pb-4"
    >
      <InputPanel
        label={label}
        tabs={tabs}
        className="w-full @regular:w-80"
        footer={
          <Button
            tone="primary"
            className="w-full"
            busy={form.save.isPending}
            onClick={form.submit}
          >
            {t("characters.new.save")}
          </Button>
        }
      >
        <PhotosFields form={form} />
      </InputPanel>
    </div>
  )
}
