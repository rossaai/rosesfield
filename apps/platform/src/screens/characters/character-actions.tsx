import { type Character, routes } from "@rosesfield/contract"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rosesfield/ui/components/alert-dialog"
import { Button } from "@rosesfield/ui/components/button"
import { Input } from "@rosesfield/ui/components/input"
import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type ReactElement, useState } from "react"
import { callRoute } from "@/api/call-route"
import { t } from "@/copy/t"
import { DialogOrSheet } from "@/pieces/responsive-layer"

type Change = { name?: string; references?: string[] }

export function useUpdateCharacter(
  characterId: string
): UseMutationResult<Character, Error, Change> {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (changes: Change) =>
      (
        await callRoute(routes.updateCharacter, {
          params: { characterId },
          body: changes,
        })
      ).character,
    onSuccess: (character) => {
      client.setQueryData(["character", characterId], { character })
      void client.invalidateQueries({ queryKey: ["characters"] })
    },
  })
}

export function RenameDialog({
  character,
  open,
  onOpenChange,
}: {
  character: Character
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  const [name, setName] = useState(character.name)
  const update = useUpdateCharacter(character.id)
  const save = (): void => {
    if (name.trim() !== "") {
      update.mutate(
        { name: name.trim() },
        { onSuccess: () => onOpenChange(false) }
      )
    }
  }
  return (
    <DialogOrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("characters.rename.title")}
    >
      <Input
        aria-label={t("characters.new.name.label")}
        value={name}
        maxLength={80}
        onChange={(event) => setName(event.target.value)}
        className="max-w-none"
      />
      <div className="flex justify-end gap-s2">
        <Button onClick={() => onOpenChange(false)}>
          {t("characters.rename.cancel")}
        </Button>
        <Button tone="primary" busy={update.isPending} onClick={save}>
          {t("characters.rename.save")}
        </Button>
      </div>
    </DialogOrSheet>
  )
}

export function DeleteCharacterDialog({
  characterId,
  open,
  onOpenChange,
}: {
  characterId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  const client = useQueryClient()
  const navigate = useNavigate()
  const remove = useMutation({
    mutationFn: () =>
      callRoute(routes.deleteCharacter, { params: { characterId } }),
    onSuccess: () => {
      client.removeQueries({ queryKey: ["character", characterId] })
      void client.invalidateQueries({ queryKey: ["characters"] })
      void navigate({ to: "/characters" })
    },
  })
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("characters.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("characters.delete.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("characters.delete.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            tone="danger"
            busy={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {t("characters.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
