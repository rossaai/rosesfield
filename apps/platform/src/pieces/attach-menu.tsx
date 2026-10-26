import { IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { ReferenceTile } from "@rosesfield/ui/components/upload-zone"
import { PlusIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"

type AttachMenuProps = {
  label: string
  onUpload: () => void
  onFromLibrary: () => void
  disabled?: boolean
  form?: "tile" | "menu"
  glyph?: ReactNode
  tone?: "default" | "quiet"
  className?: string
}

function AttachTile(props: AttachMenuProps): ReactElement {
  return (
    <fieldset
      data-slot="attach-tile"
      disabled={props.disabled === true}
      aria-label={props.label}
      className="m-0 flex shrink-0 border-0 p-0 disabled:opacity-(--opacity-disabled)"
    >
      <ReferenceTile
        referencesLabel={t("bar.references")}
        elementsLabel={t("bar.elements")}
        onReferences={props.onUpload}
        onElements={props.onFromLibrary}
      />
    </fieldset>
  )
}

export function AttachMenu(props: AttachMenuProps): ReactElement {
  if (props.form !== "menu") {
    return <AttachTile {...props} />
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={props.disabled === true}
        render={
          <IconButton
            label={props.label}
            size="dense"
            tone={props.tone ?? "default"}
            {...(props.className === undefined
              ? {}
              : { className: props.className })}
          >
            {props.glyph ?? <PlusIcon aria-hidden="true" />}
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
