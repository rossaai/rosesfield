import { IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { PaperclipIcon } from "lucide-react"
import type { ReactElement } from "react"
import { t } from "@/copy/t"

type AttachMenuProps = {
  label: string
  onUpload: () => void
  onFromLibrary: () => void
  disabled?: boolean
}

export function AttachMenu(props: AttachMenuProps): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={props.disabled === true}
        render={
          <IconButton label={props.label} size="dense">
            <PaperclipIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent>
        <DropdownMenuItem onClick={props.onUpload}>
          {t("bar.addMenu.upload")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={props.onFromLibrary}>
          {t("bar.addMenu.fromLibrary")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
