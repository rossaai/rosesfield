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
import { Button, IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import {
  Field,
  FieldCaption,
  FieldMessage,
} from "@rosesfield/ui/components/field"
import { Input } from "@rosesfield/ui/components/input"
import { EllipsisIcon } from "lucide-react"
import { type FormEvent, type ReactElement, useState } from "react"
import type { Conversation } from "@/api/conversation-wire"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import { DialogOrSheet } from "@/pieces/responsive-layer"
import {
  useDeleteConversation,
  useUpdateConversation,
} from "@/screens/agent/conversation-queries"

export type ConversationDialog = "rename" | "delete" | null

const titleMax = 120

function RenameDialog({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: Conversation
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  const [title, setTitle] = useState(conversation.title ?? "")
  const [isEmpty, setEmpty] = useState(false)
  const update = useUpdateConversation(conversation.id)
  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (title.trim() === "") {
      setEmpty(true)
      return
    }
    update.mutate(
      { title: title.trim() },
      { onSuccess: () => onOpenChange(false) }
    )
  }
  const message = isEmpty
    ? t("agent.rename.required")
    : update.error === null
      ? null
      : wordsForError(update.error, { thing: "conversation" }).title
  return (
    <DialogOrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("agent.rename.title")}
    >
      <form onSubmit={save} className="flex flex-col gap-s4">
        <Field invalid={message !== null} className="max-w-none">
          <FieldCaption>{t("agent.rename.label")}</FieldCaption>
          <Input
            value={title}
            maxLength={titleMax}
            onChange={(event) => {
              setEmpty(false)
              setTitle(event.target.value)
            }}
            className="max-w-none"
          />
          {message === null ? null : <FieldMessage>{message}</FieldMessage>}
        </Field>
        <div className="flex justify-end gap-s2">
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("agent.rename.cancel")}
          </Button>
          <Button type="submit" tone="primary" busy={update.isPending}>
            {t("agent.rename.save")}
          </Button>
        </div>
      </form>
    </DialogOrSheet>
  )
}

function DeleteDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  const remove = useDeleteConversation(conversationId)
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("agent.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {remove.error === null
              ? t("agent.delete.body")
              : wordsForError(remove.error, { thing: "conversation" }).title}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("agent.delete.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            tone="danger"
            busy={remove.isPending}
            onClick={() =>
              remove.mutate(undefined, { onSuccess: () => onOpenChange(false) })
            }
          >
            {t("agent.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ConversationDialogs({
  conversation,
  dialog,
  onDialogChange,
}: {
  conversation: Conversation
  dialog: ConversationDialog
  onDialogChange: (dialog: ConversationDialog) => void
}): ReactElement {
  return (
    <>
      {dialog === "rename" ? (
        <RenameDialog
          conversation={conversation}
          open={true}
          onOpenChange={(open) => onDialogChange(open ? "rename" : null)}
        />
      ) : null}
      <DeleteDialog
        conversationId={conversation.id}
        open={dialog === "delete"}
        onOpenChange={(open) => onDialogChange(open ? "delete" : null)}
      />
    </>
  )
}

export function ConversationMenu({
  place = "header",
  onDialogChange,
}: {
  place?: "header" | "row"
  onDialogChange: (dialog: ConversationDialog) => void
}): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          place === "row" ? (
            <IconButton
              label={t("agent.more")}
              size="small"
              tone="quiet"
              className="bg-transparent hover:bg-(--well)"
            >
              <EllipsisIcon aria-hidden="true" />
            </IconButton>
          ) : (
            <IconButton label={t("agent.more")} tone="quiet">
              <EllipsisIcon aria-hidden="true" />
            </IconButton>
          )
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onDialogChange("rename")}>
          {t("agent.rename")}
        </DropdownMenuItem>
        <DropdownMenuItem
          tone="danger"
          onClick={() => onDialogChange("delete")}
        >
          {t("agent.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
