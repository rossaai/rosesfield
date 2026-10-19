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
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { useDeleteAssets } from "@/pieces/asset-actions"

type DeleteAssetDialogProps = {
  assetIds: readonly string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
  title: string
  body: string
}

export function DeleteAssetDialog(props: DeleteAssetDialogProps): ReactElement {
  const remove = useDeleteAssets()
  const confirm = (): void => {
    remove.mutate(props.assetIds, {
      onSuccess: () => {
        props.onOpenChange(false)
        props.onDeleted?.()
      },
    })
  }
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("viewer.delete.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            tone="danger"
            busy={remove.isPending}
            onClick={confirm}
          >
            {t("viewer.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
