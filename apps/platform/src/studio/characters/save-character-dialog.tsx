import { type Run, routes } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Input } from "@rosesfield/ui/components/input"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type ReactElement, useState } from "react"
import { callRoute } from "@/api/call-route"
import { wordsForError } from "@/copy/error-words"
import { t, tCatalog } from "@/copy/t"
import { DialogOrSheet } from "@/pieces/responsive-layer"
import { SelectableTile } from "@/pieces/selectable-tile"
import { FieldFrame } from "@/screens/app/fields/field-frame"

const maxName = 60

function useCreateCharacter() {
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

function toggled(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((one) => one !== id) : [...list, id]
}

function SaveForm({ run }: { run: Run }): ReactElement {
  const [picked, setPicked] = useState<string[]>([...run.outputs])
  const [name, setName] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const create = useCreateCharacter()
  const save = (): void => {
    if (name.trim() === "") {
      setMessage(t("characters.new.name.required"))
      return
    }
    if (picked.length === 0) {
      setMessage(tCatalog("characters.studio.pick"))
      return
    }
    setMessage(null)
    create.mutate({ name: name.trim(), references: picked })
  }
  return (
    <div className="flex flex-col gap-s4">
      <FieldFrame
        caption={t("characters.new.name.label")}
        isOptional={false}
        note={null}
        problem={undefined}
        message={message}
      >
        <Input
          value={name}
          maxLength={maxName}
          onChange={(event) => setName(event.target.value)}
        />
      </FieldFrame>
      <p className="text-label text-ink-muted">
        {tCatalog("characters.studio.picked", { count: picked.length })}
      </p>
      <MediaGrid>
        {run.outputs.map((id) => (
          <SelectableTile
            key={id}
            assetId={id}
            isSelected={picked.includes(id)}
            onToggle={() => setPicked((current) => toggled(current, id))}
          />
        ))}
      </MediaGrid>
      {create.error === null ? null : (
        <p role="alert" className="text-label text-bug-text">
          {wordsForError(create.error, { thing: "character" }).title}
        </p>
      )}
      <Button
        tone="primary"
        className="self-end"
        busy={create.isPending}
        onClick={save}
      >
        {t("characters.new.save")}
      </Button>
    </div>
  )
}

export function SaveCharacterButton({ run }: { run: Run }): ReactElement {
  const [isOpen, setOpen] = useState(false)
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        {t("characters.new.saveOutputs")}
      </Button>
      <DialogOrSheet
        open={isOpen}
        onOpenChange={setOpen}
        title={tCatalog("characters.studio.saveTitle")}
      >
        {isOpen ? <SaveForm run={run} /> : null}
      </DialogOrSheet>
    </>
  )
}
