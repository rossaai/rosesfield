import type { Asset, Run } from "@rosesfield/contract"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@rosesfield/ui/components/sheet"
import { useNavigate } from "@tanstack/react-router"
import { CopyIcon, DownloadIcon, EllipsisIcon, Trash2Icon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { t } from "@/copy/t"
import { useDownloadAsset } from "@/pieces/asset-actions"
import { DeleteAssetDialog } from "@/pieces/delete-asset-dialog"
import { LabMark } from "@/pieces/lab-mark"
import { useOpenInComfy } from "@/pieces/run/open-in-comfy"
import { useUseInItems } from "@/pieces/use-in-menu"

type ViewerActionsProps = {
  asset: Asset
  run: Run | null
  onDeleted: () => void
}

function UseInButton({
  asset,
  className,
}: {
  asset: Asset
  className: string
}): ReactElement {
  const items = useUseInItems({ kind: asset.kind, useId: asset.id })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={items.length === 0}
        render={<Button className={className}>{t("output.useIn")}</Button>}
      />
      <DropdownMenuContent>{items}</DropdownMenuContent>
    </DropdownMenu>
  )
}

function useUseInputs(run: Run | null): (() => void) | null {
  const navigate = useNavigate()
  return run === null
    ? null
    : () =>
        void navigate({
          to: "/apps/$appId",
          params: { appId: run.appId },
          search: { from: run.id },
        })
}

function DeleteAsset({
  asset,
  open,
  onOpenChange,
  onDeleted,
}: {
  asset: Asset
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}): ReactElement {
  return (
    <DeleteAssetDialog
      assetIds={[asset.id]}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
      title={t("viewer.delete.title")}
      body={t("viewer.delete.body")}
    />
  )
}

const wide = "w-full max-w-none"

const comfyMark = "Comfy"

function MoreMenu({
  onDelete,
  children,
}: {
  onDelete: () => void
  children?: ReactNode
}): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t("viewer.more")}>
            <EllipsisIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent align="end">
        {children}
        <DropdownMenuItem tone="danger" onClick={onDelete}>
          <Trash2Icon aria-hidden="true" />
          {t("output.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ViewerManage({ run }: { run: Run | null }): ReactNode {
  const openInComfy = useOpenInComfy(run)
  if (openInComfy === null) {
    return null
  }
  return (
    <Button data-slot="viewer-manage" width="full" onClick={openInComfy}>
      <LabMark maker={comfyMark} />
      {t("run.openInComfy")}
    </Button>
  )
}

export function ViewerActions({
  asset,
  run,
  onDeleted,
}: ViewerActionsProps): ReactElement {
  const download = useDownloadAsset()
  const useInputs = useUseInputs(run)
  const [isConfirming, setConfirming] = useState(false)
  return (
    <div data-slot="viewer-foot" className="flex flex-col gap-2.5">
      {useInputs === null ? null : (
        <Button tone="accent" width="full" onClick={useInputs}>
          <CopyIcon aria-hidden="true" />
          {t("run.useInputs")}
        </Button>
      )}
      <div
        data-slot="viewer-foot-pair"
        className="grid grid-cols-[1fr_1fr_auto] gap-2"
      >
        <Button className={wide} onClick={() => void download(asset)}>
          <DownloadIcon aria-hidden="true" />
          {t("output.download")}
        </Button>
        <UseInButton asset={asset} className={wide} />
        <MoreMenu onDelete={() => setConfirming(true)} />
      </div>
      <DeleteAsset
        asset={asset}
        open={isConfirming}
        onOpenChange={setConfirming}
        onDeleted={onDeleted}
      />
    </div>
  )
}

type ViewerBarProps = ViewerActionsProps & { details: ReactNode }

function BarDownload({
  asset,
  isLead,
}: {
  asset: Asset
  isLead: boolean
}): ReactElement {
  const download = useDownloadAsset()
  if (isLead) {
    return (
      <Button className="min-w-0 flex-1" onClick={() => void download(asset)}>
        {t("output.download")}
      </Button>
    )
  }
  return (
    <IconButton
      label={t("output.download")}
      onClick={() => void download(asset)}
    >
      <DownloadIcon aria-hidden="true" />
    </IconButton>
  )
}

export function ViewerBar({
  asset,
  run,
  onDeleted,
  details,
}: ViewerBarProps): ReactElement {
  const useInputs = useUseInputs(run)
  const openInComfy = useOpenInComfy(run)
  const [isInfoOpen, setInfoOpen] = useState(false)
  const [isConfirming, setConfirming] = useState(false)
  return (
    <>
      <Button onClick={() => setInfoOpen(true)}>{t("viewer.info")}</Button>
      {useInputs === null ? null : (
        <Button tone="accent" className="min-w-0 flex-1" onClick={useInputs}>
          <CopyIcon aria-hidden="true" />
          {t("run.useInputs")}
        </Button>
      )}
      <BarDownload asset={asset} isLead={useInputs === null} />
      <UseInButton asset={asset} className="" />
      <MoreMenu onDelete={() => setConfirming(true)}>
        {openInComfy === null ? null : (
          <DropdownMenuItem onClick={openInComfy}>
            <LabMark maker={comfyMark} />
            {t("run.openInComfy")}
          </DropdownMenuItem>
        )}
      </MoreMenu>
      <Sheet open={isInfoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" closeLabel={t("viewer.close")}>
          <SheetHeader>
            <SheetTitle>{t("viewer.info")}</SheetTitle>
          </SheetHeader>
          <SheetBody>{details}</SheetBody>
        </SheetContent>
      </Sheet>
      <DeleteAsset
        asset={asset}
        open={isConfirming}
        onOpenChange={setConfirming}
        onDeleted={onDeleted}
      />
    </>
  )
}
