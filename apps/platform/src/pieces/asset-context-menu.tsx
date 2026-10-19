import { ContextMenu } from "@base-ui/react/context-menu"
import type { Asset } from "@rosesfield/contract"
import {
  DropdownMenuItem,
  menuPanelClass,
} from "@rosesfield/ui/components/dropdown-menu"
import { type ReactElement, type ReactNode, useState } from "react"
import { t } from "@/copy/t"
import { useDownloadAsset } from "@/pieces/asset-actions"
import { DeleteAssetDialog } from "@/pieces/delete-asset-dialog"
import { UseInSubmenu } from "@/pieces/use-in-menu"

type AssetContextMenuProps = {
  asset: Asset
  children: ReactNode
}

export function AssetContextMenu({
  asset,
  children,
}: AssetContextMenuProps): ReactElement {
  const download = useDownloadAsset()
  const [isConfirming, setConfirming] = useState(false)
  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger className="block w-full">
          {children}
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner className="isolate z-50 outline-none">
            <ContextMenu.Popup data-ground="layer" className={menuPanelClass}>
              <DropdownMenuItem onClick={() => void download(asset)}>
                {t("output.download")}
              </DropdownMenuItem>
              <UseInSubmenu kind={asset.kind} useId={asset.id} />
              <DropdownMenuItem
                tone="danger"
                onClick={() => setConfirming(true)}
              >
                {t("output.delete")}
              </DropdownMenuItem>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <DeleteAssetDialog
        assetIds={[asset.id]}
        open={isConfirming}
        onOpenChange={setConfirming}
        title={t("viewer.delete.title")}
        body={t("viewer.delete.body")}
      />
    </>
  )
}
