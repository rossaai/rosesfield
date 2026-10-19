import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@rosesfield/ui/components/alert-dialog"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Command, type CommandEntry } from "@rosesfield/ui/components/command"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rosesfield/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { Input } from "@rosesfield/ui/components/input"
import { Kbd } from "@rosesfield/ui/components/kbd"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { EllipsisIcon, PaperclipIcon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { t } from "@/gallery/copy.en"
import { SheetDemo } from "@/gallery/entries/sheet-demo"
import { ToastDemo } from "@/gallery/entries/toast-demo"
import type { GalleryEntry } from "@/gallery/gallery-entry"

type Demo = {
  open?: boolean
}

function DialogDemo({ open = false }: Demo): ReactElement {
  return (
    <Dialog defaultOpen={open}>
      <DialogTrigger render={<Button />}>
        {t("sample.dialog.title")}
      </DialogTrigger>
      <DialogContent closeLabel={t("sample.close")}>
        <DialogHeader>
          <DialogTitle>{t("sample.dialog.title")}</DialogTitle>
          <DialogDescription>{t("sample.dialog.body")}</DialogDescription>
        </DialogHeader>
        <Input
          aria-label={t("sample.name.caption")}
          placeholder={t("sample.name.placeholder")}
        />
        <DialogFooter>
          <DialogClose render={<Button />}>{t("sample.cancel")}</DialogClose>
          <Button tone="primary">{t("sample.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AlertDemo({ open = false }: Demo): ReactElement {
  return (
    <AlertDialog defaultOpen={open}>
      <AlertDialogTrigger render={<Button tone="danger" />}>
        {t("sample.delete")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("sample.alert.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("sample.alert.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("sample.cancel")}</AlertDialogCancel>
          <AlertDialogAction tone="danger">
            {t("sample.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PopoverDemo({ open = false }: Demo): ReactElement {
  return (
    <Popover defaultOpen={open}>
      <PopoverTrigger render={<Button size="small" />}>
        {t("sample.popover.title")}
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>{t("sample.popover.title")}</PopoverTitle>
          <PopoverDescription>{t("sample.popover.body")}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}

function MenuDemo({ open = false }: Demo): ReactElement {
  const [quality, setQuality] = useState("draft")
  return (
    <DropdownMenu defaultOpen={open}>
      <DropdownMenuTrigger
        render={<IconButton label={t("sample.menu.label")} tone="quiet" />}
      >
        <EllipsisIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("sample.menu.label")}</DropdownMenuLabel>
          <DropdownMenuItem>{t("sample.menu.useInputs")}</DropdownMenuItem>
          <DropdownMenuItem>
            {t("sample.menu.openInComfy")}
            <DropdownMenuShortcut>
              <Kbd>{t("sample.key.k")}</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={quality}
          onValueChange={(value) => setQuality(String(value))}
        >
          <DropdownMenuLabel>{t("sample.quality")}</DropdownMenuLabel>
          <DropdownMenuRadioItem value="draft">
            {t("sample.quality.draft")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="final">
            {t("sample.quality.final")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger">{t("sample.delete")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TooltipDemo({ open = false }: Demo): ReactElement {
  return (
    <Tooltip defaultOpen={open}>
      <TooltipTrigger
        render={<Button size="icon" aria-label={t("sample.attach")} />}
      >
        <PaperclipIcon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{t("sample.attach")}</TooltipContent>
    </Tooltip>
  )
}

function item(value: string, label: string): CommandEntry {
  return { value, label, onSelect: () => undefined }
}

function CommandDemo({
  open = false,
  query = "",
}: Demo & { query?: string }): ReactElement {
  const [isOpen, setOpen] = useState(open)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("sample.command.title")}</Button>
      <Command
        open={isOpen}
        onOpenChange={setOpen}
        title={t("sample.command.title")}
        placeholder={t("sample.command.placeholder")}
        empty={t("sample.command.empty")}
        closeLabel={t("sample.close")}
        defaultQuery={query}
        sections={[
          {
            value: "apps",
            label: t("sample.command.apps"),
            items: [
              item("image", t("sample.row.image")),
              item("video", t("sample.row.video")),
              item("recast", t("sample.row.recast")),
            ],
          },
          {
            value: "actions",
            label: t("sample.command.actions"),
            items: [
              item("library", t("sample.command.openLibrary")),
              item("history", t("sample.command.openHistory")),
            ],
          },
        ]}
      />
    </>
  )
}

function entry(
  id: string,
  title: GalleryEntry["title"],
  render: (open: boolean) => ReactElement
): GalleryEntry {
  return {
    id,
    title,
    states: [
      { id: "closed", label: "state.closed", render: () => render(false) },
      {
        id: "open",
        label: "state.open",
        placement: "layer",
        render: () => render(true),
      },
    ],
  }
}

const command: GalleryEntry = {
  id: "command",
  title: "entry.command",
  states: [
    { id: "closed", label: "state.closed", render: () => <CommandDemo /> },
    {
      id: "open",
      label: "state.open",
      placement: "layer",
      render: () => <CommandDemo open />,
    },
    {
      id: "no-match",
      label: "state.noMatch",
      placement: "layer",
      render: () => <CommandDemo open query={t("sample.command.query")} />,
    },
  ],
}

const sheet: GalleryEntry = {
  id: "sheet",
  title: "entry.sheet",
  states: [
    { id: "closed", label: "state.closed", render: () => <SheetDemo /> },
    {
      id: "bottom",
      label: "state.bottom",
      placement: "layer",
      render: () => <SheetDemo open="bottom" />,
    },
    {
      id: "left",
      label: "state.left",
      placement: "layer",
      render: () => <SheetDemo open="left" />,
    },
  ],
}

const toast: GalleryEntry = {
  id: "toast",
  title: "entry.toast",
  states: [
    { id: "closed", label: "state.closed", render: () => <ToastDemo /> },
    {
      id: "open",
      label: "state.open",
      placement: "layer",
      render: () => <ToastDemo open />,
    },
  ],
}

export const layerEntries: GalleryEntry[] = [
  entry("dialog", "entry.dialog", (open) => <DialogDemo open={open} />),
  entry("alert-dialog", "entry.alertDialog", (open) => (
    <AlertDemo open={open} />
  )),
  sheet,
  entry("popover", "entry.popover", (open) => <PopoverDemo open={open} />),
  entry("dropdown-menu", "entry.dropdownMenu", (open) => (
    <MenuDemo open={open} />
  )),
  entry("tooltip", "entry.tooltip", (open) => <TooltipDemo open={open} />),
  toast,
  command,
]
