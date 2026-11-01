import { DropdownMenuItem } from "@rosesfield/ui/components/dropdown-menu"
import { RecreateGlyph } from "@rosesfield/ui/components/recreate-glyph"
import type { ReactElement } from "react"
import { t } from "@/copy/t"

export function recreateLabel(): string {
  return t("run.recreate")
}

export function RecreateWords(): ReactElement {
  return (
    <>
      <RecreateGlyph />
      {recreateLabel()}
    </>
  )
}

export function RecreateMenuItem({
  onClick,
}: {
  onClick: () => void
}): ReactElement {
  return (
    <DropdownMenuItem lead={<RecreateGlyph />} onClick={onClick}>
      {recreateLabel()}
    </DropdownMenuItem>
  )
}
