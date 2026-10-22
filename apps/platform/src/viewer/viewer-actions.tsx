import type { Asset, Run } from "@rosesfield/contract"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import { ConfirmButton } from "@rosesfield/ui/components/confirm-button"
import {
  DropdownMenu,
  DropdownMenuContent,
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
import {
  DownloadIcon,
  ForwardIcon,
  InfoIcon,
  RepeatIcon,
  Trash2Icon,
} from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { t } from "@/copy/t"
import { useDeleteAssets, useDownloadAsset } from "@/pieces/asset-actions"
import { LabMark } from "@/pieces/lab-mark"
import { useOpenInComfy } from "@/pieces/run/open-in-comfy"
import { comfyMaker } from "@/pieces/run/run-menu"
import { useUseInItems } from "@/pieces/use-in-menu"

type ViewerActionsProps = {
  asset: Asset
  run: Run | null
  onDeleted: () => void
}

const wide = "min-w-0 flex-1 max-w-none"

function UseInButton({
  asset,
  form,
}: {
  asset: Asset
  form: "label" | "circle"
}): ReactElement {
  const items = useUseInItems({ kind: asset.kind, useId: asset.id })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={items.length === 0}
        render={
          form === "label" ? (
            <Button className={wide}>
              <ForwardIcon aria-hidden="true" />
              {t("output.useIn")}
            </Button>
          ) : (
            <IconButton label={t("output.useIn")}>
              <ForwardIcon aria-hidden="true" />
            </IconButton>
          )
        }
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
  onDeleted,
}: {
  asset: Asset
  onDeleted: () => void
}): ReactElement {
  const remove = useDeleteAssets()
  return (
    <ConfirmButton
      icon={<Trash2Icon aria-hidden="true" />}
      label={t("output.delete")}
      busy={remove.isPending}
      onConfirm={() => remove.mutate([asset.id], { onSuccess: onDeleted })}
    />
  )
}

function OpenInComfy({
  run,
  form,
}: {
  run: Run | null
  form: "label" | "circle"
}): ReactNode {
  const openInComfy = useOpenInComfy(run)
  if (openInComfy === null) {
    return null
  }
  return form === "label" ? (
    <Button data-slot="viewer-comfy" className={wide} onClick={openInComfy}>
      <LabMark maker={comfyMaker} />
      {t("run.openInComfy")}
    </Button>
  ) : (
    <IconButton
      data-slot="viewer-comfy"
      label={t("run.openInComfy")}
      onClick={openInComfy}
    >
      <LabMark maker={comfyMaker} />
    </IconButton>
  )
}

function Recreate({
  run,
  className,
}: {
  run: Run | null
  className: string
}): ReactNode {
  const useInputs = useUseInputs(run)
  return useInputs === null ? null : (
    <Button tone="primary" className={className} onClick={useInputs}>
      <RepeatIcon aria-hidden="true" />
      {t("run.useInputs")}
    </Button>
  )
}

export function ViewerActions({
  asset,
  run,
  onDeleted,
}: ViewerActionsProps): ReactElement {
  const download = useDownloadAsset()
  return (
    <div data-slot="viewer-actions" className="flex w-full flex-col gap-s2">
      <Recreate run={run} className="w-full max-w-none" />
      <div data-slot="viewer-actions-row" className="flex gap-s2">
        <Button className={wide} onClick={() => void download(asset)}>
          <DownloadIcon aria-hidden="true" />
          {t("output.download")}
        </Button>
        <UseInButton asset={asset} form="label" />
      </div>
      <div data-slot="viewer-actions-row" className="flex gap-s2">
        <OpenInComfy run={run} form="label" />
        <DeleteAsset asset={asset} onDeleted={onDeleted} />
      </div>
    </div>
  )
}

type ViewerBarProps = ViewerActionsProps & { details: ReactNode }

export function ViewerBar({
  asset,
  run,
  onDeleted,
  details,
}: ViewerBarProps): ReactElement {
  const download = useDownloadAsset()
  const [isInfoOpen, setInfoOpen] = useState(false)
  return (
    <>
      <IconButton label={t("viewer.info")} onClick={() => setInfoOpen(true)}>
        <InfoIcon aria-hidden="true" />
      </IconButton>
      <Recreate run={run} className="min-w-0 flex-1" />
      <IconButton
        label={t("output.download")}
        onClick={() => void download(asset)}
      >
        <DownloadIcon aria-hidden="true" />
      </IconButton>
      <UseInButton asset={asset} form="circle" />
      <OpenInComfy run={run} form="circle" />
      <DeleteAsset asset={asset} onDeleted={onDeleted} />
      <Sheet open={isInfoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" closeLabel={t("viewer.close")}>
          <SheetHeader>
            <SheetTitle>{t("viewer.info")}</SheetTitle>
          </SheetHeader>
          <SheetBody>{details}</SheetBody>
        </SheetContent>
      </Sheet>
    </>
  )
}
